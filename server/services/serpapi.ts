import type { CountryConfig, CountryResult } from "../../shared/types.js";
import { normalizeSerpApi } from "./normalize.js";

const ENDPOINT = "https://serpapi.com/search.json";
const CACHE_TTL_MS = 10 * 60 * 1000; // cache to protect the user's SerpApi quota
const cache = new Map<string, { at: number; data: CountryResult }>();

export function contextFor(c: CountryConfig, useLocalLanguage: boolean) {
  return { gl: c.gl, hl: useLocalLanguage ? c.hl : "en", location: c.location };
}

/** Runs async work with at most `limit` tasks in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function safeError(status: number | null, err?: unknown): string {
  const message = typeof err === "string" ? err.toLowerCase() : "";
  if (status === 401 || status === 403 || /invalid api.?key|api.?key.*(invalid|rejected)|unauthori[sz]ed|authentication/.test(message)) {
    return "SerpApi rejected the API key. Check SERPAPI_KEY.";
  }
  if (status === 429 || /rate.?limit|quota/.test(message)) return "SerpApi rate limit or quota reached. Try again later.";
  if (status !== null && status >= 500) return "SerpApi had a temporary problem. Try again.";
  if (status !== null && status !== 200) return `SerpApi returned an unexpected response (${status}).`;
  if (message) return "SerpApi could not complete this search. Check the API key, account quota, and query.";
  if ((err as Error)?.name === "AbortError" || (err as Error)?.name === "TimeoutError") return "The request timed out.";
  return "Could not reach SerpApi.";
}

/** Fetches one country's Google results. Never throws: failures become status "failed". */
export async function searchCountry(
  query: string,
  country: CountryConfig,
  useLocalLanguage: boolean,
  opts: { apiKey: string; timeoutMs: number; signal?: AbortSignal },
): Promise<CountryResult> {
  const context = contextFor(country, useLocalLanguage);
  const base = { code: country.code, name: country.name, context };
  const key = `${query.toLowerCase()}|${context.gl}|${context.hl}|${context.location}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.data, elapsedMs: 0 };

  const params = new URLSearchParams({
    engine: "google", q: query, num: "10", gl: context.gl, hl: context.hl,
    location: context.location, api_key: opts.apiKey,
  });
  const started = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const signal = opts.signal
        ? AbortSignal.any([opts.signal, AbortSignal.timeout(opts.timeoutMs)])
        : AbortSignal.timeout(opts.timeoutMs);
      const res = await fetch(`${ENDPOINT}?${params}`, { signal });
      const body: any = await res.json().catch(() => ({}));

      const apiError = typeof body?.error === "string" ? body.error : "";
      const noResults = /hasn['’]t returned any results|no results/i.test(apiError);
      if (noResults) {
        // SerpApi can report a valid search with no results in its error field.
        return { ...base, status: "empty", results: [], featured: null, elapsedMs: Date.now() - started };
      }

      // SerpApi may send structured API errors in a JSON response, including
      // cases where the HTTP status itself is successful.
      const apiFailed = !res.ok || !!apiError || body?.search_metadata?.status === "Error";
      if (apiFailed) {
        if (res.status >= 500 && attempt === 0) continue; // one retry on server errors
        return { ...base, status: "failed", error: safeError(res.status, apiError || body?.search_metadata?.status), results: [], featured: null, elapsedMs: Date.now() - started };
      }
      const { results, featured } = normalizeSerpApi(body);
      const data: CountryResult = {
        ...base, status: results.length ? "ok" : "empty", results, featured, elapsedMs: Date.now() - started,
      };
      if (results.length) cache.set(key, { at: Date.now(), data });
      return data;
    } catch (err) {
      if (opts.signal?.aborted) break;
      if (attempt === 1 || (err as Error)?.name === "TimeoutError") {
        return { ...base, status: "failed", error: safeError(null, err), results: [], featured: null, elapsedMs: Date.now() - started };
      }
    }
  }
  return { ...base, status: "failed", error: "Search was cancelled.", results: [], featured: null, elapsedMs: Date.now() - started };
}
