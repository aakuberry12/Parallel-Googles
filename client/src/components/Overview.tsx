import { Download, FileJson } from "lucide-react";
import type { SearchResponse } from "../../../shared/types";
import { exportCsv, exportJson, scoreLabel } from "../lib";

export default function Overview({ data }: { data: SearchResponse }) {
  const d = data.divergence;
  const ok = d.eligible.length;
  const hue = d.score === null ? "#64748B" : d.score < 25 ? "#34D399" : d.score < 50 ? "#3D7BFF" : d.score < 75 ? "#8B5CF6" : "#F87171";
  return (
    <section aria-label="Results overview" className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="card relative overflow-hidden p-5">
        <p className="text-sm text-dim">Global Divergence Score</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-7xl font-bold leading-none" style={{ color: hue }}>{d.score ?? "n/a"}</span>
          {d.score !== null && <span className="text-dim">out of 100</span>}
        </p>
        <div className="mt-3 h-1.5 rounded-full bg-raise" role="img" aria-label={`Score ${d.score ?? "not available"} out of 100`}>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${d.score ?? 0}%`, background: hue }} />
        </div>
        <p className="mt-3 font-semibold">{scoreLabel(d.score)}</p>
        <p className="mt-1 text-sm text-dim">
          Higher means the countries were shown more different pages. It does not mean Google is wrong or that people in any country are misinformed.
        </p>
      </div>
      <Stat label="Countries compared" value={`${ok} of ${data.countries.length}`} note={ok < data.countries.length ? "Failed or empty searches are left out of the score, not counted as differences." : "Every selected country returned results."} />
      <Stat label="Distinct domains" value={String(d.uniqueDomains)} note={`across ${d.uniqueUrls} distinct pages`} />
      <div className="card flex flex-col justify-between p-5">
        <Stat bare label="Pages shown in 2+ countries" value={`${d.sharedPct}%`} note={`${d.sharedUrls.length} of ${d.uniqueUrls} pages`} />
        <div className="mt-4 flex gap-2">
          <button className="btn" onClick={() => exportJson(data)}><FileJson className="h-4 w-4" aria-hidden />JSON</button>
          <button className="btn" onClick={() => exportCsv(data)}><Download className="h-4 w-4" aria-hidden />CSV</button>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, note, bare }: { label: string; value: string; note?: string; bare?: boolean }) {
  const body = (
    <>
      <p className="text-sm text-dim">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold">{value}</p>
      {note && <p className="mt-1 text-sm text-dim">{note}</p>}
    </>
  );
  return bare ? <div>{body}</div> : <div className="card p-5">{body}</div>;
}
