// Types shared by the server and the client (import type only).

export interface CountryConfig {
  code: string;
  name: string;
  gl: string;        // Google country code
  hl: string;        // local interface language
  location: string;  // SerpApi canonical location name
  lat: number;
  lng: number;
}

export interface SearchContext {
  gl: string;
  hl: string;
  location: string;
}

export interface NormalizedResult {
  rank: number;
  title: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  snippet: string;
}

export interface FeaturedSnippet {
  title: string;
  snippet: string;
  url: string;
  domain: string;
}

export interface CountryResult {
  code: string;
  name: string;
  status: "ok" | "empty" | "failed";
  error?: string;
  context: SearchContext;
  results: NormalizedResult[];
  featured: FeaturedSnippet | null;
  elapsedMs: number;
}

export interface PairScore {
  a: string;
  b: string;
  domain: number;       // Jaccard similarity of domain sets (0-1)
  url: number;          // rank-weighted URL overlap (0-1)
  text: number | null;  // TF-IDF cosine similarity of titles+snippets (0-1)
  similarity: number;   // weighted combination (0-1)
}

export type Level = "high" | "medium" | "low" | "insufficient";

export interface CountryScore {
  code: string;
  similarity: number | null;
  level: Level;
}

export interface DomainStat {
  domain: string;
  countries: string[];
  count: number;
  urls: string[];
}

export interface Theme {
  term: string;
  countries: string[];
  examples: { code: string; url: string; title: string }[];
}

export interface SharedUrl {
  url: string;
  title: string;
  countries: string[];
}

export interface Divergence {
  score: number | null; // 0-100, null when fewer than 2 countries returned results
  components: { domain: number | null; url: number | null; text: number | null }; // mean pairwise similarity
  weights: { domain: number; url: number; text: number };
  thresholds: { high: number; medium: number };
  pairs: PairScore[];
  countries: CountryScore[];
  mostSimilar: PairScore | null;
  mostDifferent: PairScore | null;
  sharedPct: number;
  uniqueDomains: number;
  uniqueUrls: number;
  sharedUrls: SharedUrl[];
  domains: DomainStat[];
  themes: Theme[];
  distinctThemes: Record<string, Theme[]>;
  eligible: string[];
}

export interface Observation {
  text: string;
  sources: string[]; // URLs taken from retrieved results
}

export interface Insight {
  mode: "rules" | "llm";
  provider?: string;
  observations: Observation[];
  interpretations: string[];
  limits: string[];
  note?: string;
}

export interface SearchRequest {
  query: string;
  countries: string[];
  useLocalLanguage?: boolean;
  demo?: boolean;
}

export interface SearchResponse {
  query: string;
  demo: boolean;
  useLocalLanguage: boolean;
  generatedAt: string;
  countries: CountryResult[];
  divergence: Divergence;
  insight: Insight;
}

export interface AppConfig {
  countries: CountryConfig[];
  liveAvailable: boolean;
  llm: { configured: boolean; provider: string | null };
  limits: { minCountries: number; maxCountries: number };
}

export type StreamEvent =
  | { type: "start"; codes: string[]; demo: boolean }
  | { type: "progress"; code: string; status: "running" | "ok" | "empty" | "failed"; error?: string; count?: number; elapsedMs?: number }
  | { type: "result"; data: SearchResponse }
  | { type: "error"; message: string };
