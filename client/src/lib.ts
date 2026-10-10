import type { Level, SearchResponse } from "../../shared/types";

export const LEVEL_COLOR: Record<Level, string> = { high: "#34D399", medium: "#FBBF24", low: "#F87171", insufficient: "#64748B" };
export const LEVEL_LABEL: Record<Level, string> = {
  high: "Highly similar", medium: "Moderately different", low: "Substantially different", insufficient: "Insufficient data",
};

export const pct = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : `${Math.round(n * 100)}%`);

export function scoreLabel(score: number | null): string {
  if (score === null) return "Not enough data";
  if (score < 25) return "Largely consistent";
  if (score < 50) return "Some differences";
  if (score < 75) return "Substantial differences";
  return "Very different results";
}

export const EXAMPLES = [
  "Is nuclear energy safe?",
  "Best universities for computer science",
  "Are electric vehicles worth buying?",
  "What are the latest AI regulations?",
  "Best affordable laptops for students",
];

// ---- local search history ---------------------------------------------------
export interface HistoryItem { query: string; countries: string[]; useLocalLanguage: boolean; at: string; score: number | null; demo: boolean }
const KEY = "parallel-googles.history";

export function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 15))); } catch { /* storage unavailable */ }
}

// ---- export -----------------------------------------------------------------
function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function exportJson(r: SearchResponse) {
  download(`parallel-googles-${slug(r.query)}.json`, "application/json", JSON.stringify(r, null, 2));
}

export function exportCsv(r: SearchResponse) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[] = [`# ${r.demo ? "DEMO (synthetic sample data)" : "LIVE (SerpApi)"} results for: ${r.query}`];
  rows.push(["country", "rank", "title", "url", "domain", "snippet"].join(","));
  for (const c of r.countries) for (const x of c.results) rows.push([c.code, x.rank, x.title, x.url, x.domain, x.snippet].map(esc).join(","));
  rows.push("", `# Global divergence score: ${r.divergence.score ?? "n/a"}`);
  rows.push(["country_a", "country_b", "domain_jaccard", "url_overlap", "text_similarity", "combined_similarity"].join(","));
  for (const p of r.divergence.pairs) rows.push([p.a, p.b, p.domain, p.url, p.text ?? "", p.similarity].join(","));
  download(`parallel-googles-${slug(r.query)}.csv`, "text/csv", rows.join("\n"));
}
