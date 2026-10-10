import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AppConfig, CountryResult, SearchResponse, StreamEvent } from "../../shared/types.js";
import { COUNTRIES, COUNTRY_BY_CODE, MAX_COUNTRIES, MIN_COUNTRIES } from "../services/countries.js";
import { mapLimit, searchCountry } from "../services/serpapi.js";
import { computeDivergence } from "../services/divergence.js";
import { demoCountry } from "../services/demo.js";
import { buildInsight, llmStatus } from "../services/insights.js";

export const searchRouter = Router();

const Body = z.object({
  query: z.string().transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()).pipe(z.string().min(2, "Enter a longer query.").max(200, "Keep the query under 200 characters.")),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(MIN_COUNTRIES, `Select at least ${MIN_COUNTRIES} countries.`).max(MAX_COUNTRIES, `Select at most ${MAX_COUNTRIES} countries.`),
  useLocalLanguage: z.boolean().optional().default(false),
  demo: z.boolean().optional().default(false),
});

// Minimal in-memory per-IP limiter: every search spends one SerpApi credit per country.
const hits = new Map<string, number[]>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const max = Number(process.env.RATE_LIMIT_PER_MIN) || 6;
  const now = Date.now();
  const ip = req.ip ?? "unknown";
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= max) return res.status(429).json({ error: "Too many searches. Wait a minute and try again." });
  hits.set(ip, [...recent, now]);
  next();
}

export const liveAvailable = () => !!process.env.SERPAPI_KEY && process.env.DEMO_MODE !== "true";

searchRouter.get("/config", (_req, res) => {
  const cfg: AppConfig = {
    countries: COUNTRIES,
    liveAvailable: liveAvailable(),
    llm: llmStatus(),
    limits: { minCountries: MIN_COUNTRIES, maxCountries: MAX_COUNTRIES },
  };
  res.json(cfg);
});

/** Streams newline-delimited JSON events: start, progress (per country), then result. */
searchRouter.post("/search", rateLimit, async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  const { query, useLocalLanguage } = parsed.data;
  const codes = [...new Set(parsed.data.countries)];
  const configs = codes.map((c) => COUNTRY_BY_CODE.get(c));
  if (configs.some((c) => !c)) return res.status(400).json({ error: "Unknown country code." });

  const demo = parsed.data.demo || !liveAvailable();
  res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" });
  const send = (e: StreamEvent) => res.write(JSON.stringify(e) + "\n");
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  try {
    send({ type: "start", codes, demo });
    const timeoutMs = Number(process.env.SERPAPI_TIMEOUT_MS) || 20000;
    const limit = Number(process.env.SERPAPI_CONCURRENCY) || 4;

    const results: CountryResult[] = await mapLimit(configs as NonNullable<(typeof configs)[number]>[], limit, async (c) => {
      send({ type: "progress", code: c.code, status: "running" });
      const r = demo
        ? (await new Promise((ok) => setTimeout(ok, 150 + Math.random() * 350)), demoCountry(query, c, useLocalLanguage))
        : await searchCountry(query, c, useLocalLanguage, { apiKey: process.env.SERPAPI_KEY!, timeoutMs, signal: abort.signal });
      send({ type: "progress", code: c.code, status: r.status, error: r.error, count: r.results.length, elapsedMs: r.elapsedMs });
      return r;
    });

    const divergence = computeDivergence(results, query);
    const insight = await buildInsight(results, divergence, query, useLocalLanguage, demo);
    const data: SearchResponse = { query, demo, useLocalLanguage, generatedAt: new Date().toISOString(), countries: results, divergence, insight };
    send({ type: "result", data });
  } catch (err) {
    console.error("search failed:", (err as Error).message); // details stay in the server log
    send({ type: "error", message: "Something went wrong while running the search." });
  } finally {
    res.end();
  }
});
