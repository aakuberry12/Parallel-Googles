import type { CountryResult, SearchResponse } from "../../../shared/types";
import { LEVEL_COLOR, LEVEL_LABEL, pct } from "../lib";

export default function CountryPanel({ data, code }: { data: SearchResponse; code: string | null }) {
  const c: CountryResult | undefined = data.countries.find((x) => x.code === code);
  if (!c) return <div className="card p-6 text-dim">Select a country on the map to see its results.</div>;

  const d = data.divergence;
  const score = d.countries.find((x) => x.code === c.code)!;
  const holders = new Map<string, string[]>();
  d.sharedUrls.forEach((u) => holders.set(u.url, u.countries));
  const pairs = d.pairs.filter((p) => p.a === c.code || p.b === c.code)
    .map((p) => ({ other: p.a === c.code ? p.b : p.a, sim: p.similarity }))
    .sort((a, b) => b.sim - a.sim);
  const topDomains = [...new Map(c.results.map((r) => [r.domain, 0])).keys()].slice(0, 6);
  const nameOf = (code: string) => data.countries.find((x) => x.code === code)?.name ?? code;

  return (
    <div className="card flex max-h-[560px] flex-col overflow-hidden">
      <div className="border-b border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{c.name}</h2>
          <span className="chip" style={{ borderColor: LEVEL_COLOR[score.level], color: LEVEL_COLOR[score.level] }}>{LEVEL_LABEL[score.level]}</span>
        </div>
        <p className="mt-1 text-xs text-dim">
          Search context: gl={c.context.gl}, hl={c.context.hl}, location={c.context.location}. This biases results toward the country; it does not guarantee they are exclusive to it.
        </p>
      </div>

      <div className="overflow-y-auto p-4 text-sm">
        {c.status !== "ok" ? (
          <p className="rounded-lg border border-line bg-raise p-3">
            {c.status === "failed" ? `This search failed: ${c.error}` : "Google returned no results for this query in this location."} It was left out of the divergence score.
          </p>
        ) : (
          <>
            {score.similarity !== null && <p className="mb-3">Average similarity to the other countries: <strong>{pct(score.similarity)}</strong></p>}
            {c.featured && (
              <div className="mb-4 rounded-lg border border-iris/40 bg-iris/10 p-3">
                <p className="text-xs text-dim">Featured snippet</p>
                <p className="mt-1">{c.featured.snippet}</p>
                <a className="link text-xs" href={c.featured.url} target="_blank" rel="noreferrer noopener">{c.featured.domain}</a>
              </div>
            )}
            <p className="mb-2 text-xs text-dim">Domains in the top results: {topDomains.join(", ")}</p>
            <ol className="space-y-3">
              {c.results.map((r) => {
                const shared = holders.get(r.url);
                return (
                  <li key={r.url} className="rounded-lg border border-line bg-raise/50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 shrink-0 text-dim">{r.rank}</span>
                      <div className="min-w-0">
                        <a className="link font-semibold" href={r.url} target="_blank" rel="noreferrer noopener">{r.title}</a>
                        <p className="text-xs text-dim">{r.domain}</p>
                        {r.snippet && <p className="mt-1 text-dim">{r.snippet}</p>}
                        <p className="mt-1 text-xs">
                          {shared ? <span className="text-good">Also in {shared.length - 1} other {shared.length === 2 ? "country" : "countries"}</span> : <span className="text-warn">Only appeared in {c.name}</span>}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {pairs.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 font-bold">Compared with each other country</h3>
                <ul className="space-y-1.5">
                  {pairs.map((p) => (
                    <li key={p.other} className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 truncate">{nameOf(p.other)}</span>
                      <div className="h-2 flex-1 rounded-full bg-raise"><div className="h-full rounded-full bg-gradient-to-r from-volt to-iris" style={{ width: `${p.sim * 100}%` }} /></div>
                      <span className="w-9 text-right text-dim">{pct(p.sim)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
