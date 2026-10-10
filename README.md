# Parallel Googles

**Does the internet give everyone the same answer?**
Run one question as a Google search in several countries at once (through SerpApi), then see which pages, domains and themes change. Includes an explainable Global Divergence Score, an interactive world map, two-country comparison, a rule-based or AI insight panel, local search history, and JSON/CSV export.

## Quick start

Requires Node.js 20 or newer. Run these commands from the project folder (the folder containing this `README.md`):

```bash
npm run install:all
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. The app works in demo mode before you add a key. On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Production-style run (one process, serves the built client):

```bash
npm run build && npm start   # http://localhost:3001
```

Other commands: `npm test` (unit tests), `npm run typecheck` (server and client), `npm run build`, and `npm run check` (all checks plus build).

## Enabling live searches

1. Create/sign in to a SerpApi account and copy your key from https://serpapi.com/manage-api-key.
2. Open the **root project's `.env` file** (beside `package.json`). On **line 4**, replace the blank value with your key:

   ```dotenv
   SERPAPI_KEY=PASTE_YOUR_SERPAPI_KEY_HERE
   ```

   Do not put the key in `client/src`, a `VITE_*` variable, or a browser request. The `.env` file is ignored by Git; never commit or share it.
3. Leave `DEMO_MODE=false` (line 7 in the supplied template), save the file, and restart `npm run dev` so the server reloads the key.
4. Confirm the server prints `Mode: LIVE (SerpApi)` and the Demo mode banner disappears. Run a search with at least two countries selected.

The key lives only in the server's environment. It is never sent to the browser, and error messages returned to the client never contain it.

**Cost note:** one search = one SerpApi credit per selected country (cached for 10 minutes per query and locale). The server limits searches per IP (`RATE_LIMIT_PER_MIN`, default 6) and concurrent SerpApi calls (`SERPAPI_CONCURRENCY`, default 4).

Without a key (or with `DEMO_MODE=true`) the app runs in **demo mode**: synthetic results on reserved `.example` domains, labelled as demo data everywhere (banner, history, exports). The scoring, map and insights still run through the real pipeline.

## Optional AI explanations

Set `ANTHROPIC_API_KEY` (or `LLM_PROVIDER=openai` and `OPENAI_API_KEY`). The model only receives the retrieved titles, URLs and snippets plus the computed scores, must answer in JSON, and any observation whose cited URL is not in the retrieved results is dropped. If the provider is missing or fails, a deterministic rule-based summary is shown and labelled as such.

## Project structure

```
shared/types.ts            types shared by client and server
server/index.ts            Express app (serves client/dist in production)
server/routes/search.ts    GET /api/config, POST /api/search (streams NDJSON progress, then the result)
server/services/serpapi.ts SerpApi calls: timeouts, one retry on 5xx, concurrency pool, cache, safe errors
server/services/normalize.ts  URL canonicalisation + response normalisation
server/services/divergence.ts Scoring, shared/unique sources, themes
server/services/insights.ts   Rule-based summary + optional LLM summary
server/services/demo.ts       Synthetic demo data (demo mode only)
server/tests/              Unit tests for scoring and normalisation
client/src/                React + Tailwind + Recharts + Leaflet UI
```

## How the score works

For every pair of countries that returned results:

| Component | Weight | Definition |
|---|---|---|
| Domain overlap | 0.30 | Jaccard similarity of result domains |
| Top-result overlap | 0.40 | Rank-weighted Jaccard of canonical URLs (weight 1/rank) |
| Snippet similarity | 0.30 | TF-IDF cosine similarity of titles + snippets |

Pair similarity is the weighted mean (weights renormalised if a component is unavailable). **Divergence = 100 × (1 − mean pair similarity).** Failed or empty countries are excluded, so missing data never counts as divergence; with fewer than two usable countries the score is `n/a`. The calculation is deterministic. Map colours use each country's mean similarity to the others: green ≥ 45%, amber ≥ 25%, red below, gray when there is not enough data (constants in `divergence.ts`; these cut-offs are conventions, not scientific thresholds).

## Implemented

- Query + 2 to 10 country selection from 16 countries, with `gl`, `hl`, `location` per country and the context shown in the UI
- Optional per-country language toggle (off by default so snippets are comparable)
- Concurrent, limited, time-limited SerpApi requests; partial failures reported per country; live per-country progress driven by real responses
- Normalisation (canonical URLs, domains, snippets, featured answer boxes)
- Divergence score with component breakdown, most similar/different pairs, per-country similarity
- Leaflet world map (markers coloured from real scores), country panel, bar charts, shared vs unique sources
- Two-country side-by-side comparison, domain explorer with filters, common and distinctive terms linked to example results
- Insight panel with source links, separated into observations, possible interpretations and what cannot be concluded
- Search history (localStorage), repeat search, JSON and CSV export
- Demo mode, rate limiting, input validation, safe errors

## Not implemented

- Country polygon shading (markers are used instead, so no GeoJSON download is needed); more than 16 countries
- User accounts, database, persistent result storage
- Non-English stop-word handling (use the English-language default for fair snippet comparison)
- Automated browser tests (only server unit tests)

## Test checklist

- [ ] `npm test` passes
- [ ] Without a key: demo banner shows; a search completes; results are labelled demo data
- [ ] With a key: banner gone; each country shows real results with working links
- [ ] Select 1 country: Search is disabled; select 11: extra countries are disabled
- [ ] Use an invalid key: each country fails with a clear message, the app does not crash
- [ ] Mix a good and failing country (e.g. unplug network mid-search): partial-failure banner, failed country gray on map, excluded from score
- [ ] Click each map marker: panel updates
- [ ] Compare two countries; pick the same country twice: helpful message
- [ ] Export JSON and CSV; open them and check the score breakdown is included
- [ ] Reload the page: history persists; "Search again" reruns it
- [ ] Narrow the window to 390px: no horizontal scrolling

## Known limitations

- `gl`/`hl`/`location` bias results but do not guarantee country-exclusive results; SerpApi emulates location, personalisation and time still vary results.
- Only the top ~10 organic results are compared; ads, videos and maps are ignored.
- Low snippet similarity is expected when searching in different languages.
- The cache and rate limiter are in memory and reset on restart.
- Map tiles use the [OpenStreetMap standard raster service](https://operations.osmfoundation.org/policies/tiles/) and fonts (Google Fonts) need browser internet access. The map keeps the required visible attribution; use a suitable tile provider if deploying at significant scale.
- A high score shows the pages differ, not that any country, source or search engine is biased.
