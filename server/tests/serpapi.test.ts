import test from "node:test";
import assert from "node:assert/strict";
import type { CountryConfig } from "../../shared/types.js";
import { searchCountry } from "../services/serpapi.js";

const country: CountryConfig = {
  code: "US", name: "United States", gl: "us", hl: "en", location: "United States", lat: 39.8, lng: -98.6,
};
const opts = { apiKey: "test-secret-key", timeoutMs: 2_000 };
const originalFetch = globalThis.fetch;

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

test("sends a Google search to SerpApi and normalizes organic results", async () => {
  const requests: URL[] = [];
  mockFetch((input) => {
    requests.push(new URL(String(input)));
    return new Response(JSON.stringify({
      search_metadata: { status: "Success" },
      organic_results: [{ title: "Example result", link: "https://example.org/page", snippet: "Example snippet" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });

  try {
    const result = await searchCountry("serpapi-test-success-2026", country, false, opts);
    assert.equal(requests[0]?.hostname, "serpapi.com");
    assert.equal(requests[0]?.searchParams.get("engine"), "google");
    assert.equal(requests[0]?.searchParams.get("q"), "serpapi-test-success-2026");
    assert.equal(requests[0]?.searchParams.get("api_key"), opts.apiKey);
    assert.equal(result.status, "ok");
    assert.equal(result.results[0]?.url, "https://example.org/page");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not misreport a SerpApi JSON error with HTTP 200 as an empty search", async () => {
  mockFetch(() => new Response(JSON.stringify({ error: "Invalid API key: test-secret-key" }), { status: 200 }));
  try {
    const result = await searchCountry("serpapi-test-invalid-key-2026", country, false, opts);
    assert.equal(result.status, "failed");
    assert.match(result.error ?? "", /rejected the API key/i);
    assert.doesNotMatch(result.error ?? "", /test-secret-key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("treats SerpApi's no-results message as a valid empty result", async () => {
  mockFetch(() => new Response(JSON.stringify({ error: "Google hasn't returned any results for this query." }), { status: 400 }));
  try {
    const result = await searchCountry("serpapi-test-empty-2026", country, false, opts);
    assert.equal(result.status, "empty");
    assert.deepEqual(result.results, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
