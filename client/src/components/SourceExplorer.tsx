import { useMemo, useState } from "react";
import type { SearchResponse } from "../../../shared/types";

export default function SourceExplorer({ data }: { data: SearchResponse }) {
  const d = data.divergence;
  const [filter, setFilter] = useState("");
  const [onlyFew, setOnlyFew] = useState(false);
  const rows = useMemo(
    () => d.domains.filter((x) => x.domain.includes(filter.trim().toLowerCase()) && (!onlyFew || x.count <= 1)),
    [d.domains, filter, onlyFew],
  );
  const nameOf = (c: string) => data.countries.find((x) => x.code === c)?.name ?? c;

  return (
    <section className="card p-5" aria-label="Source explorer">
      <h2 className="text-lg font-bold">Source explorer</h2>

      {d.themes.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-bold">Common themes in titles and snippets</h3>
          <div className="flex flex-wrap gap-2">
            {d.themes.map((t) => (
              <a key={t.term} href={t.examples[0].url} target="_blank" rel="noreferrer noopener" className="chip hover:border-volt hover:text-mist"
                 title={`In ${t.countries.length} countries: ${t.countries.join(", ")}. Example: ${t.examples[0].title}`}>
                {t.term} <span className="ml-1.5 text-volt">{t.countries.length}</span>
              </a>
            ))}
          </div>
          <p className="mt-1 text-xs text-dim">The number is how many countries' results used the term. Each chip opens an example result. The query's own words and country names are excluded.</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter domains" aria-label="Filter domains"
               className="rounded-lg border border-line bg-raise px-3 py-2 text-sm focus:border-volt focus:outline-none" />
        <label className="flex items-center gap-2 text-sm text-dim"><input type="checkbox" className="accent-volt" checked={onlyFew} onChange={(e) => setOnlyFew(e.target.checked)} />Only domains seen in one country</label>
        <span className="ml-auto text-xs text-dim">{rows.length} domains</span>
      </div>

      {rows.length === 0 ? <p className="mt-4 text-sm text-dim">No domains match that filter.</p> : (
        <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-raise text-xs text-dim"><tr><th className="p-2.5 font-normal">Domain</th><th className="p-2.5 font-normal">Countries</th><th className="p-2.5 font-normal">Pages</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.domain} className="border-t border-line align-top">
                  <td className="p-2.5 font-semibold">{r.domain}</td>
                  <td className="p-2.5 text-dim"><span className="text-mist">{r.count}</span>: {r.countries.map(nameOf).join(", ")}</td>
                  <td className="p-2.5">{r.urls.slice(0, 2).map((u, i) => <a key={u} className="link mr-2 whitespace-nowrap" href={u} target="_blank" rel="noreferrer noopener">page {i + 1}</a>)}{r.urls.length > 2 && <span className="text-xs text-dim">+{r.urls.length - 2}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
