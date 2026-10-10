import type { CountryConfig, CountryResult, NormalizedResult } from "../../shared/types.js";
import { canonicalize, domainOf, parseUrl } from "./normalize.js";
import { contextFor } from "./serpapi.js";

/**
 * DEMO MODE ONLY. Generates deterministic *synthetic* results on reserved ".example" domains so
 * the whole pipeline (scoring, map, insights, export) can be shown without an API key.
 * Nothing here is real Google data and the UI labels it as such.
 */
const GLOBAL_SITES = ["encyclopedia", "worldnews", "sciencejournal", "healthorg", "techreview", "energyagency", "forum", "video", "economist", "explainers"];
const ANGLES = ["cost", "safety", "regulation", "jobs", "climate", "education", "health", "innovation", "subsidy", "history", "risk", "community"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "query";

export function demoCountry(query: string, c: CountryConfig, useLocalLanguage: boolean): CountryResult {
  const rand = rng(hash(`${query.toLowerCase()}|${c.code}`));
  const q = slug(query);
  const cc = c.code.toLowerCase();
  const angles = [ANGLES[Math.floor(rand() * ANGLES.length)], ANGLES[Math.floor(rand() * ANGLES.length)]];

  // Shared pool: same URLs in every country, shuffled per country.
  const globals = [...GLOBAL_SITES].sort(() => rand() - 0.5).slice(0, 6);
  const locals = [`${cc}-herald`, `${cc}-university`, `${cc}-government`, `${cc}-consumer`];
  const sites = [...globals, ...locals];

  const results: NormalizedResult[] = sites.map((site, i) => {
    const isLocal = i >= globals.length;
    const angle = angles[i % 2];
    const url = isLocal
      ? `https://${site}.example/demo/${q}-${angle}`
      : `https://${site}.example/demo/${q}`;
    const u = parseUrl(url)!;
    return {
      rank: i + 1,
      title: isLocal ? `${query}: ${angle} in ${c.name} (sample)` : `${query} - ${site} overview (sample)`,
      url,
      canonicalUrl: canonicalize(u),
      domain: domainOf(u),
      snippet: isLocal
        ? `Sample snippet. Coverage in ${c.name} emphasises ${angle} and ${angles[(i + 1) % 2]} when discussing ${query}.`
        : `Sample snippet. A general overview of ${query} covering evidence, background and common questions.`,
    };
  });

  const hasFeatured = rand() > 0.4;
  const fsite = rand() > 0.5 ? globals[0] : locals[1];
  const furl = `https://${fsite}.example/demo/${q}-featured`;
  return {
    code: c.code,
    name: c.name,
    status: "ok",
    context: contextFor(c, useLocalLanguage),
    results,
    featured: hasFeatured
      ? { title: `${query} (sample featured answer)`, snippet: `Sample featured snippet focusing on ${angles[0]} for ${c.name}.`, url: furl, domain: domainOf(parseUrl(furl)!) }
      : null,
    elapsedMs: 0,
  };
}
