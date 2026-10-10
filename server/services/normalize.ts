import type { FeaturedSnippet, NormalizedResult } from "../../shared/types.js";

const TRACKING = /^(utm_|fbclid|gclid|msclkid|mc_|ref$|ref_|source$|srsltid)/i;

export function clean(text: unknown, max = 400): string {
  if (typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Returns null for anything that is not a plain http(s) URL. */
export function parseUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

export function domainOf(u: URL): string {
  return u.hostname.toLowerCase().replace(/^(www|m|amp)\./, "");
}

/** Strips tracking params, fragments, default ports, trailing slashes and "www." so that
 *  the same page is recognised across countries. */
export function canonicalize(u: URL): string {
  const p = new URLSearchParams();
  [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([k, v]) => p.append(k, v));
  const q = p.toString();
  const path = u.pathname.replace(/\/+$/, "") || "";
  return `${domainOf(u)}${path}${q ? "?" + q : ""}`.toLowerCase();
}

/** Normalizes a raw SerpApi JSON response into results + featured snippet. */
export function normalizeSerpApi(raw: any): { results: NormalizedResult[]; featured: FeaturedSnippet | null } {
  const results: NormalizedResult[] = [];
  const seen = new Set<string>();
  const organic: any[] = Array.isArray(raw?.organic_results) ? raw.organic_results : [];
  for (const item of organic) {
    const u = parseUrl(item?.link);
    if (!u) continue;
    const canonicalUrl = canonicalize(u);
    if (seen.has(canonicalUrl)) continue; // duplicate pages within one country
    seen.add(canonicalUrl);
    results.push({
      rank: results.length + 1,
      title: clean(item.title, 200) || domainOf(u),
      url: u.toString(),
      canonicalUrl,
      domain: domainOf(u),
      snippet: clean(item.snippet),
    });
  }

  let featured: FeaturedSnippet | null = null;
  const box = raw?.answer_box;
  const bu = parseUrl(box?.link);
  if (box && bu) {
    const snippet = clean(box.snippet ?? box.answer ?? (Array.isArray(box.list) ? box.list.join("; ") : ""));
    if (snippet) {
      featured = { title: clean(box.title, 200) || domainOf(bu), snippet, url: bu.toString(), domain: domainOf(bu) };
    }
  }
  return { results, featured };
}
