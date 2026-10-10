import type {
  CountryResult, CountryScore, Divergence, DomainStat, Level, PairScore, SharedUrl, Theme,
} from "../../shared/types.js";

/**
 * Global Divergence Score
 * -----------------------
 * For every pair of countries that returned results we compute three similarities in [0,1]:
 *   domain  - Jaccard similarity of the sets of result domains
 *   url     - rank-weighted Jaccard of canonical URLs (weight 1/rank, so top results matter more)
 *   text    - TF-IDF cosine similarity of all titles + snippets
 * The pair similarity is the weighted mean of the available components (weights renormalised
 * if a component is missing, e.g. no snippets). Divergence = 100 * (1 - mean pairwise similarity).
 * Countries with failed/empty searches are excluded, so missing data never counts as divergence.
 * Everything is deterministic: inputs are sorted and there is no randomness.
 */
export const WEIGHTS = { domain: 0.3, url: 0.4, text: 0.3 };
export const THRESHOLDS = { high: 0.45, medium: 0.25 }; // country mean similarity cut-offs

const STOP = new Set(
  ("the and for are with that this from have has was were will would can could not but you your what when where which who how why " +
    "its it's their they them there here been being into than then also more most some such only other about over under out " +
    "all any our his her she him off one two may might should just like get got use used using new best top vs com www http https").split(" "),
);

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function rankWeightedOverlap(a: CountryResult, b: CountryResult): number {
  const wa = new Map(a.results.map((r) => [r.canonicalUrl, 1 / r.rank]));
  const wb = new Map(b.results.map((r) => [r.canonicalUrl, 1 / r.rank]));
  let min = 0, max = 0;
  for (const u of new Set([...wa.keys(), ...wb.keys()])) {
    const x = wa.get(u) ?? 0, y = wb.get(u) ?? 0;
    min += Math.min(x, y);
    max += Math.max(x, y);
  }
  return max ? min / max : 0;
}

function countryText(c: CountryResult): string {
  return c.results.map((r) => `${r.title} ${r.snippet}`).join(" ");
}

/** Cosine similarity between TF-IDF vectors; IDF is computed across the compared countries. */
export function tfidfSimilarities(docs: Map<string, string[]>): Map<string, number> {
  const codes = [...docs.keys()].sort();
  const df = new Map<string, number>();
  for (const code of codes) for (const t of new Set(docs.get(code))) df.set(t, (df.get(t) ?? 0) + 1);
  const N = codes.length;
  const vec = new Map<string, Map<string, number>>();
  for (const code of codes) {
    const tf = new Map<string, number>();
    for (const t of docs.get(code)!) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v = new Map<string, number>();
    for (const [t, f] of tf) v.set(t, (1 + Math.log(f)) * (Math.log((1 + N) / (1 + df.get(t)!)) + 1));
    vec.set(code, v);
  }
  const norm = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const out = new Map<string, number>();
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = vec.get(codes[i])!, b = vec.get(codes[j])!;
      let dot = 0;
      for (const [t, x] of a) dot += x * (b.get(t) ?? 0);
      const d = norm(a) * norm(b);
      out.set(`${codes[i]}|${codes[j]}`, d ? dot / d : 0);
    }
  }
  return out;
}

function levelOf(sim: number | null): Level {
  if (sim === null) return "insufficient";
  return sim >= THRESHOLDS.high ? "high" : sim >= THRESHOLDS.medium ? "medium" : "low";
}

export function computeDivergence(all: CountryResult[], query = ""): Divergence {
  const ok = all.filter((c) => c.status === "ok" && c.results.length > 0).sort((a, b) => a.code.localeCompare(b.code));
  const eligible = ok.map((c) => c.code);

  // ---- pairwise similarities
  const tokens = new Map(ok.map((c) => [c.code, tokenize(countryText(c))]));
  const textDocs = new Map([...tokens].filter(([, t]) => t.length > 0));
  const textSims = tfidfSimilarities(textDocs);
  const pairs: PairScore[] = [];
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const a = ok[i], b = ok[j];
      const domain = jaccard(new Set(a.results.map((r) => r.domain)), new Set(b.results.map((r) => r.domain)));
      const url = rankWeightedOverlap(a, b);
      const text = textSims.has(`${a.code}|${b.code}`) ? textSims.get(`${a.code}|${b.code}`)! : null;
      const parts: [number, number | null][] = [[WEIGHTS.domain, domain], [WEIGHTS.url, url], [WEIGHTS.text, text]];
      const avail = parts.filter((p): p is [number, number] => p[1] !== null);
      const wsum = avail.reduce((s, [w]) => s + w, 0);
      const similarity = avail.reduce((s, [w, v]) => s + w * v, 0) / wsum;
      pairs.push({ a: a.code, b: b.code, domain: round(domain), url: round(url), text: text === null ? null : round(text), similarity: round(similarity) });
    }
  }

  const enough = ok.length >= 2;
  const meanSim = mean(pairs.map((p) => p.similarity));
  const comp = (k: "domain" | "url" | "text") => {
    const m = mean(pairs.map((p) => p[k]).filter((v): v is number => v !== null));
    return m === null ? null : round(m);
  };

  // ---- per-country similarity to the rest of the set
  const countries: CountryScore[] = all.map((c) => {
    if (!enough || !eligible.includes(c.code)) return { code: c.code, similarity: null, level: "insufficient" };
    const m = mean(pairs.filter((p) => p.a === c.code || p.b === c.code).map((p) => p.similarity))!;
    return { code: c.code, similarity: round(m), level: levelOf(m) };
  });

  // ---- shared / unique sources (traceable to real URLs)
  const urlMap = new Map<string, { url: string; title: string; countries: Set<string> }>();
  const domMap = new Map<string, { countries: Set<string>; urls: Set<string> }>();
  for (const c of ok) {
    for (const r of c.results) {
      const u = urlMap.get(r.canonicalUrl) ?? { url: r.url, title: r.title, countries: new Set<string>() };
      u.countries.add(c.code);
      urlMap.set(r.canonicalUrl, u);
      const d = domMap.get(r.domain) ?? { countries: new Set<string>(), urls: new Set<string>() };
      d.countries.add(c.code);
      d.urls.add(r.url);
      domMap.set(r.domain, d);
    }
  }
  const sharedUrls: SharedUrl[] = [...urlMap.values()]
    .filter((u) => u.countries.size >= 2)
    .map((u) => ({ url: u.url, title: u.title, countries: [...u.countries].sort() }))
    .sort((a, b) => b.countries.length - a.countries.length || a.url.localeCompare(b.url));
  const domains: DomainStat[] = [...domMap.entries()]
    .map(([domain, d]) => ({ domain, countries: [...d.countries].sort(), count: d.countries.size, urls: [...d.urls].sort() }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));

  const { themes, distinctThemes } = extractThemes(ok, new Set(tokenize(query)));

  return {
    score: enough && meanSim !== null ? Math.round(100 * (1 - meanSim)) : null,
    components: { domain: comp("domain"), url: comp("url"), text: comp("text") },
    weights: WEIGHTS,
    thresholds: THRESHOLDS,
    pairs,
    countries,
    mostSimilar: pairs.length ? [...pairs].sort((x, y) => y.similarity - x.similarity || x.a.localeCompare(y.a))[0] : null,
    mostDifferent: pairs.length ? [...pairs].sort((x, y) => x.similarity - y.similarity || x.a.localeCompare(y.a))[0] : null,
    sharedPct: urlMap.size ? round((100 * sharedUrls.length) / urlMap.size, 1) : 0,
    uniqueDomains: domMap.size,
    uniqueUrls: urlMap.size,
    sharedUrls,
    domains,
    themes,
    distinctThemes,
    eligible,
  };
}

/** Terms shared across many countries, and terms characteristic of few. Each links to real results. */
function extractThemes(ok: CountryResult[], skip: Set<string>) {
  for (const c of ok) tokenize(`${c.name} ${c.context.location}`).forEach((t) => skip.add(t)); // country names are not themes
  const queryless = new Map<string, Map<string, { count: number; example: { url: string; title: string } }>>();
  for (const c of ok) {
    const m = new Map<string, { count: number; example: { url: string; title: string } }>();
    for (const r of c.results) {
      for (const t of tokenize(`${r.title} ${r.snippet}`)) {
        if (skip.has(t)) continue; // the query's own words say nothing about differences
        const e = m.get(t);
        if (e) e.count++;
        else m.set(t, { count: 1, example: { url: r.url, title: r.title } });
      }
    }
    queryless.set(c.code, m);
  }
  const N = ok.length;
  const termCountries = new Map<string, string[]>();
  for (const [code, m] of queryless) for (const t of m.keys()) termCountries.set(t, [...(termCountries.get(t) ?? []), code]);

  const mk = (term: string, codes: string[]): Theme => ({
    term,
    countries: [...codes].sort(),
    examples: [...codes].sort().slice(0, 3).map((code) => ({ code, ...queryless.get(code)!.get(term)!.example })),
  });
  const total = (t: string) => (termCountries.get(t) ?? []).reduce((s, c) => s + queryless.get(c)!.get(t)!.count, 0);

  const themes = N < 2 ? [] : [...termCountries.entries()]
    .filter(([, codes]) => codes.length >= Math.max(2, Math.ceil(N / 2)))
    .sort((a, b) => b[1].length - a[1].length || total(b[0]) - total(a[0]) || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([t, codes]) => mk(t, codes));

  const distinctThemes: Record<string, Theme[]> = {};
  const maxHolders = Math.max(1, Math.floor(N / 3));
  for (const [code, m] of queryless) {
    distinctThemes[code] = N < 3 ? [] : [...m.entries()]
      .filter(([t, v]) => v.count >= 2 && termCountries.get(t)!.length <= maxHolders)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => mk(t, [code]));
  }
  return { themes, distinctThemes };
}
