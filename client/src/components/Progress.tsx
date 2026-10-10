import { CheckCircle2, CircleDashed, Loader2, MinusCircle, XCircle } from "lucide-react";
import type { CountryConfig } from "../../../shared/types";

export type ProgressMap = Record<string, { status: "queued" | "running" | "ok" | "empty" | "failed"; error?: string; count?: number; elapsedMs?: number }>;

export default function Progress({ countries, progress }: { countries: CountryConfig[]; progress: ProgressMap }) {
  return (
    <section className="card p-5" aria-live="polite" aria-label="Search progress">
      <h2 className="mb-3 text-lg font-bold">Waiting for each country to respond</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((c) => {
          const p = progress[c.code] ?? { status: "queued" };
          const Icon = p.status === "ok" ? CheckCircle2 : p.status === "failed" ? XCircle : p.status === "empty" ? MinusCircle : p.status === "running" ? Loader2 : CircleDashed;
          const tone = p.status === "ok" ? "text-good" : p.status === "failed" ? "text-bad" : p.status === "empty" ? "text-warn" : "text-dim";
          return (
            <li key={c.code} className="flex items-center gap-3 rounded-lg border border-line bg-raise/60 px-3 py-2 text-sm">
              <Icon className={`h-4 w-4 shrink-0 ${tone} ${p.status === "running" ? "animate-spin" : ""}`} aria-hidden />
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-dim">
                {p.status === "queued" && "Queued"}
                {p.status === "running" && "Searching"}
                {p.status === "ok" && `${p.count} results`}
                {p.status === "empty" && "No results"}
                {p.status === "failed" && "Failed"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
