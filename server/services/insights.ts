import type { CountryResult, Divergence, Insight, Observation } from "../../shared/types.js";

const LIMITS = [
  "Only the top ~10 organic Google results per country were compared; deeper results and other result types (ads, videos, maps) are not covered.",
  "Google's gl/hl/location parameters bias results toward a locale but do not guarantee they come only from that country, and SerpApi emulates the location rather than using a real local device.",
  "Personalisation, time of day, A/B tests and Google's own experiments can change results; one search is a snapshot, not a stable measurement.",
  "Differences in results do not show that any country, source or search engine is biased, wrong, or that people there are misinformed.",
  "Result snippets are short excerpts; they do not show the full position of a page.",
];

export function llmStatus() {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const configured = provider === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;
  return { configured, provider: configured ? provider : null };
}

const nameOf = (all: CountryResult[], code: string) => all.find((c) => c.code === code)?.name ?? code;
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Deterministic summary built only from the retrieved data. */
export function ruleBasedInsight(all: CountryResult[], d: Divergence, useLocalLanguage: boolean, note?: string): Insight {
  const obs: Observation[] = [];
  const interp: string[] = [];
  const ok = all.filter((c) => d.eligible.includes(c.code));

  if (d.score === null) {
    obs.push({ text: "Fewer than two countries returned results, so no comparison could be made. Missing results are not counted as differences.", sources: [] });
    return { mode: "rules", observations: obs, interpretations: [], limits: LIMITS, note };
  }

  obs.push({
    text: `Across ${ok.length} countries, the average pairwise similarity was ${Math.round((1 - d.score / 100) * 100)}% (divergence ${d.score}/100). ${d.sharedUrls.length} of ${d.uniqueUrls} distinct pages (${d.sharedPct}%) appeared in at least two countries.`,
    sources: [],
  });

  const top = d.domains[0];
  if (top) obs.push({ text: `${top.domain} was the most widespread domain, appearing in ${top.count} of ${ok.length} countries (${list(top.countries.map((c) => nameOf(all, c)))}).`, sources: top.urls.slice(0, 3) });

  if (d.mostDifferent && d.mostSimilar) {
    const md = d.mostDifferent, ms = d.mostSimilar;
    obs.push({ text: `The most similar pair was ${nameOf(all, ms.a)} and ${nameOf(all, ms.b)} (${Math.round(ms.similarity * 100)}%); the most different pair was ${nameOf(all, md.a)} and ${nameOf(all, md.b)} (${Math.round(md.similarity * 100)}%).`, sources: [] });
  }

  // Domains appearing in exactly one country
  const ranked = [...d.countries].filter((c) => c.similarity !== null).sort((a, b) => a.similarity! - b.similarity! || a.code.localeCompare(b.code)).slice(0, 4);
  for (const cs of ranked) {
    const only = d.domains.filter((x) => x.count === 1 && x.countries[0] === cs.code);
    if (!only.length) continue;
    obs.push({
      text: `${nameOf(all, cs.code)} (similarity ${Math.round(cs.similarity! * 100)}% to the rest) returned ${only.length} domain${only.length > 1 ? "s" : ""} not seen in any other country, e.g. ${list(only.slice(0, 3).map((x) => x.domain))}.`,
      sources: only.slice(0, 3).map((x) => x.urls[0]),
    });
  }

  // Featured snippets
  const feats = ok.filter((c) => c.featured);
  if (!feats.length) obs.push({ text: "No featured snippets were returned for this query in any country.", sources: [] });
  else {
    const distinct = new Set(feats.map((c) => c.featured!.domain));
    obs.push({
      text: `${feats.length} of ${ok.length} countries showed a featured snippet; ${distinct.size === 1 ? `all came from ${[...distinct][0]}` : `they came from ${distinct.size} different domains (${feats.map((c) => `${c.name}: ${c.featured!.domain}`).join("; ")})`}.`,
      sources: feats.map((c) => c.featured!.url),
    });
  }

  // Distinctive terms
  for (const cs of ranked.slice(0, 3)) {
    const t = d.distinctThemes[cs.code] ?? [];
    if (t.length) obs.push({ text: `Terms that recurred in ${nameOf(all, cs.code)}'s titles and snippets but in few other countries: ${list(t.slice(0, 4).map((x) => `"${x.term}"`))}.`, sources: t.slice(0, 2).map((x) => x.examples[0].url) });
  }

  // Possible interpretations: hedged, and only when the data hints at them
  const tldHits = ok.filter((c) => c.results.some((r) => r.domain.endsWith(`.${c.context.gl === "uk" ? "co.uk" : c.context.gl}`)));
  if (tldHits.length) interp.push(`${tldHits.length} countries returned at least one domain with their own country suffix (e.g. ${list(tldHits.slice(0, 3).map((c) => c.name))}), which is consistent with Google favouring locally relevant publishers.`);
  if (useLocalLanguage) interp.push("Searches ran in each country's language, so text similarity is expected to be low even for equivalent sources; compare domains and URLs for a fairer read.");
  if (d.score >= 50) interp.push("A high score can come from localisation (local news, regulators, shops), language, or ranking variance rather than from different opinions. Reading the linked pages is needed to tell which.");
  else interp.push("A low score suggests Google surfaced largely the same pages for this query in these locations. That does not show the pages are accurate.");
  return { mode: "rules", observations: obs, interpretations: interp, limits: LIMITS, note };
}

/** Optional LLM summary. It receives only retrieved data and must cite URLs from that data. */
export async function llmInsight(all: CountryResult[], d: Divergence, query: string): Promise<Insight> {
  const { provider } = llmStatus();
  if (!provider) throw new Error("no provider");
  const ok = all.filter((c) => d.eligible.includes(c.code));
  const payload = {
    query,
    divergence_score: d.score,
    most_similar_pair: d.mostSimilar,
    most_different_pair: d.mostDifferent,
    countries: ok.map((c) => ({
      country: c.name,
      similarity_to_others: d.countries.find((x) => x.code === c.code)?.similarity,
      featured_snippet: c.featured,
      results: c.results.map((r) => ({ rank: r.rank, title: r.title, url: r.url, snippet: r.snippet.slice(0, 220) })),
    })),
  };
  const allowed = new Set(ok.flatMap((c) => [...c.results.map((r) => r.url), ...(c.featured ? [c.featured.url] : [])]));

  const system =
    "You analyse how Google results for one query differ across countries. Use ONLY the JSON data provided. " +
    "Never invent sources, quotes, statistics or causes. Do not call any country or source biased. " +
    'Reply with JSON only: {"observations":[{"text":string,"sources":[urls copied exactly from the data]}],"interpretations":[string]}. ' +
    "observations = things directly visible in the data (max 6), each with at least one source URL. " +
    "interpretations = tentative, hedged possible explanations (max 3) that the data would be consistent with. Keep every item under 45 words.";

  const timeout = AbortSignal.timeout(30000);
  let text = "";
  if (provider === "openai") {
    const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST", signal: timeout,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.LLM_MODEL || "gpt-4o-mini", temperature: 0, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }] }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    text = (await res.json() as any).choices?.[0]?.message?.content ?? "";
  } else {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: timeout,
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.LLM_MODEL || "claude-sonnet-4-5", max_tokens: 1200, temperature: 0, system, messages: [{ role: "user", content: JSON.stringify(payload) }] }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    text = (await res.json() as any).content?.find((b: any) => b.type === "text")?.text ?? "";
  }

  const json = JSON.parse(text.replace(/^```(?:json)?|```$/gm, "").trim());
  const observations: Observation[] = (Array.isArray(json.observations) ? json.observations : [])
    .filter((o: any) => typeof o?.text === "string")
    .map((o: any) => ({ text: o.text.slice(0, 400), sources: (Array.isArray(o.sources) ? o.sources : []).filter((s: unknown) => typeof s === "string" && allowed.has(s)) }))
    .filter((o: Observation) => o.sources.length > 0) // drop claims we cannot trace to a retrieved URL
    .slice(0, 6);
  if (!observations.length) throw new Error("no traceable observations");
  const interpretations = (Array.isArray(json.interpretations) ? json.interpretations : []).filter((s: unknown) => typeof s === "string").map((s: string) => s.slice(0, 300)).slice(0, 3);
  return { mode: "llm", provider, observations, interpretations, limits: LIMITS };
}

export async function buildInsight(all: CountryResult[], d: Divergence, query: string, useLocal: boolean, demo: boolean): Promise<Insight> {
  if (demo) return ruleBasedInsight(all, d, useLocal, "Demo data: the AI provider is not called for synthetic results.");
  if (d.score === null || !llmStatus().configured) return ruleBasedInsight(all, d, useLocal, llmStatus().configured ? undefined : "No AI provider configured; this is a rule-based summary built from the retrieved results.");
  try {
    return await llmInsight(all, d, query);
  } catch {
    return ruleBasedInsight(all, d, useLocal, "The AI provider was unavailable, so a rule-based summary is shown instead.");
  }
}
