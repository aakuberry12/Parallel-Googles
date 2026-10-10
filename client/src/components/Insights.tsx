import { Bot, ListChecks } from "lucide-react";
import type { SearchResponse } from "../../../shared/types";

export default function Insights({ data }: { data: SearchResponse }) {
  const i = data.insight;
  return (
    <section className="card p-5" aria-label="Insight panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">What the results show</h2>
        <span className="chip">
          {i.mode === "llm" ? <Bot className="mr-1 h-3 w-3" aria-hidden /> : <ListChecks className="mr-1 h-3 w-3" aria-hidden />}
          {i.mode === "llm" ? `AI summary (${i.provider}), sources checked against retrieved results` : "Rule-based summary"}
        </span>
      </div>
      {i.note && <p className="mt-2 text-xs text-dim">{i.note}</p>}

      <h3 className="mb-2 mt-4 text-sm font-bold">Observed in the results</h3>
      <ul className="space-y-2.5 text-sm">
        {i.observations.map((o, n) => (
          <li key={n} className="border-l-2 border-volt/60 pl-3">
            {o.text}
            {o.sources.length > 0 && (
              <span className="ml-1 whitespace-nowrap text-xs">
                {o.sources.map((s, k) => <a key={s} className="link mr-1" href={s} target="_blank" rel="noreferrer noopener" aria-label={`Source ${k + 1}`}>[{k + 1}]</a>)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {i.interpretations.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-bold">Possible interpretations <span className="font-normal text-dim">(not established by the data)</span></h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-dim">{i.interpretations.map((t, n) => <li key={n}>{t}</li>)}</ul>
        </>
      )}

      <h3 className="mb-2 mt-5 text-sm font-bold">What cannot be concluded</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-dim">{i.limits.map((t, n) => <li key={n}>{t}</li>)}</ul>
    </section>
  );
}
