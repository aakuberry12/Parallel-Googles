import { useState } from "react";
import type { SearchResponse } from "../../../shared/types";
import { pct } from "../lib";

export default function Compare({ data }: { data: SearchResponse }) {
  const ok = data.countries.filter((c) => c.status === "ok");
  const [a, setA] = useState(ok[0]?.code ?? "");
  const [b, setB] = useState(ok[1]?.code ?? "");
  const A = ok.find((c) => c.code === a), B = ok.find((c) => c.code === b);
  if (ok.length < 2) return <section className="card p-5"><h2 className="text-lg font-bold">Compare two countries</h2><p className="mt-2 text-dim">At least two countries need results before they can be compared.</p></section>;

  const pair = data.divergence.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  const urlsA = new Set(A?.results.map((r) => r.canonicalUrl)), urlsB = new Set(B?.results.map((r) => r.canonicalUrl));
  const onlyA = A?.results.filter((r) => !urlsB.has(r.canonicalUrl)) ?? [];
  const onlyB = B?.results.filter((r) => !urlsA.has(r.canonicalUrl)) ?? [];
  const both = A?.results.filter((r) => urlsB.has(r.canonicalUrl)) ?? [];
  const sel = "rounded-lg border border-line bg-raise px-3 py-2 text-sm";

  return (
    <section className="card p-5" aria-label="Two-country comparison">
      <h2 className="text-lg font-bold">Compare two countries</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select className={sel} value={a} onChange={(e) => setA(e.target.value)} aria-label="First country">{ok.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <span className="text-dim">against</span>
        <select className={sel} value={b} onChange={(e) => setB(e.target.value)} aria-label="Second country">{ok.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
      </div>
      {a === b ? <p className="mt-4 text-dim">Choose two different countries.</p> : pair && A && B && (
        <>
          <p className="mt-4 text-sm text-dim">
            Combined similarity <strong className="text-mist">{pct(pair.similarity)}</strong>: domains {pct(pair.domain)}, top results {pct(pair.url)}, snippets {pct(pair.text)}.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Col title={`Only in ${A.name}`} items={onlyA} />
            <Col title={`In both (${both.length})`} items={both} />
            <Col title={`Only in ${B.name}`} items={onlyB} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
            {[A, B].map((c) => (
              <div key={c.code} className="rounded-lg border border-line bg-raise/50 p-3">
                <p className="text-xs text-dim">Featured snippet in {c.name}</p>
                {c.featured ? <><p className="mt-1">{c.featured.snippet}</p><a className="link text-xs" href={c.featured.url} target="_blank" rel="noreferrer noopener">{c.featured.domain}</a></> : <p className="mt-1 text-dim">None returned.</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Col({ title, items }: { title: string; items: { url: string; title: string; domain: string; rank: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-dim">None.</p> : (
        <ul className="space-y-2 text-sm">
          {items.map((r) => (
            <li key={r.url} className="rounded-lg border border-line bg-raise/50 p-2.5">
              <a className="link" href={r.url} target="_blank" rel="noreferrer noopener">{r.title}</a>
              <p className="text-xs text-dim">{r.domain}, rank {r.rank}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
