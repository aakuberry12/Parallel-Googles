import { Globe2, Loader2, Search } from "lucide-react";
import type { AppConfig } from "../../../shared/types";
import { EXAMPLES } from "../lib";

interface Props {
  config: AppConfig | null;
  query: string; setQuery: (q: string) => void;
  selected: string[]; setSelected: (c: string[]) => void;
  useLocal: boolean; setUseLocal: (v: boolean) => void;
  running: boolean; onSearch: () => void;
}

export default function SearchPanel({ config, query, setQuery, selected, setSelected, useLocal, setUseLocal, running, onSearch }: Props) {
  const max = config?.limits.maxCountries ?? 10;
  const min = config?.limits.minCountries ?? 2;
  const toggle = (code: string) => {
    if (selected.includes(code)) setSelected(selected.filter((c) => c !== code));
    else if (selected.length < max) setSelected([...selected, code]);
  };
  const valid = query.trim().length >= 2 && selected.length >= min;

  return (
    <form className="card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); if (valid && !running) onSearch(); }}>
      <label htmlFor="q" className="sr-only">Search query</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dim" aria-hidden />
          <input
            id="q" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200}
            placeholder="Ask a question to see how the answer changes by country"
            className="w-full rounded-xl border border-line bg-raise py-3.5 pl-12 pr-4 text-lg placeholder:text-dim/70 focus:border-volt focus:outline-none"
          />
        </div>
        <button className="btn-primary whitespace-nowrap" disabled={!valid || running} type="submit">
          {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Globe2 className="h-5 w-5" aria-hidden />}
          {running ? "Searching…" : "Search the World"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip hover:border-volt hover:text-mist" onClick={() => setQuery(ex)}>{ex}</button>
        ))}
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 flex w-full items-baseline justify-between text-sm text-dim">
          <span>Countries to compare</span>
          <span>{selected.length} of {max} selected (minimum {min})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {config?.countries.map((c) => {
            const on = selected.includes(c.code);
            return (
              <button
                key={c.code} type="button" onClick={() => toggle(c.code)} aria-pressed={on}
                disabled={!on && selected.length >= max}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${on ? "border-volt bg-volt/15 text-mist" : "border-line text-dim hover:border-volt/50"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-dim">
          <input type="checkbox" className="mt-1 accent-volt" checked={useLocal} onChange={(e) => setUseLocal(e.target.checked)} />
          <span>
            Search in each country's main language. Off by default so snippet wording is comparable; turn it on to see local-language results.
            Every search sends <code className="text-mist">gl</code>, <code className="text-mist">hl</code> and <code className="text-mist">location</code> to Google via SerpApi, which biases results toward a country but does not guarantee them.
          </span>
        </label>
      </fieldset>
    </form>
  );
}
