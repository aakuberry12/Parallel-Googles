import test from "node:test";
import assert from "node:assert/strict";
import type { CountryResult, NormalizedResult } from "../../shared/types.js";
import { computeDivergence, jaccard } from "../services/divergence.js";
import { canonicalize, normalizeSerpApi, parseUrl } from "../services/normalize.js";

const mk = (rank: number, url: string, text = "alpha beta"): NormalizedResult => {
  const u = parseUrl(url)!;
  return { rank, title: text, url, canonicalUrl: canonicalize(u), domain: u.hostname.replace(/^www\./, ""), snippet: text };
};
const country = (code: string, results: NormalizedResult[], status: CountryResult["status"] = "ok"): CountryResult => ({
  code, name: code, status, context: { gl: code.toLowerCase(), hl: "en", location: code }, results, featured: null, elapsedMs: 0,
});

test("identical results give divergence 0", () => {
  const r = [mk(1, "https://a.com/x"), mk(2, "https://b.com/y")];
  assert.equal(computeDivergence([country("US", r), country("GB", r)]).score, 0);
});

test("disjoint results give divergence 100", () => {
  const d = computeDivergence([
    country("US", [mk(1, "https://a.com/x", "cats dogs")]),
    country("GB", [mk(1, "https://b.com/y", "wheat barley")]),
  ]);
  assert.equal(d.score, 100);
});

test("failed countries are excluded, not counted as divergence", () => {
  const r = [mk(1, "https://a.com/x")];
  const d = computeDivergence([country("US", r), country("GB", r), country("IN", [], "failed")]);
  assert.equal(d.score, 0);
  assert.equal(d.countries.find((c) => c.code === "IN")!.level, "insufficient");
});

test("fewer than two successful countries yields null score", () => {
  assert.equal(computeDivergence([country("US", [mk(1, "https://a.com")]), country("GB", [], "failed")]).score, null);
});

test("deterministic for identical input", () => {
  const a = [country("US", [mk(1, "https://a.com/1"), mk(2, "https://b.com/2")]), country("DE", [mk(1, "https://b.com/2"), mk(2, "https://c.de/3")])];
  assert.deepEqual(computeDivergence(a), computeDivergence(a));
});

test("jaccard and canonicalization", () => {
  assert.equal(jaccard(new Set([1, 2]), new Set([2, 3])), 1 / 3);
  assert.equal(canonicalize(parseUrl("https://www.Example.com/a/?utm_source=x&b=1#frag")!), "example.com/a?b=1");
});

test("normalizeSerpApi drops invalid urls and duplicates", () => {
  const { results } = normalizeSerpApi({ organic_results: [
    { link: "javascript:alert(1)", title: "bad" },
    { link: "https://x.com/a", title: "A", snippet: "s" },
    { link: "https://www.x.com/a/", title: "A dup" },
  ] });
  assert.equal(results.length, 1);
});
