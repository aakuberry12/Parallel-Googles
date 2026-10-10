import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, FlaskConical, History } from "lucide-react";
import type { AppConfig, SearchResponse } from "../../shared/types";
import { fetchConfig, runSearch } from "./api";
import { HistoryItem, loadHistory, saveHistory } from "./lib";
import SearchPanel from "./components/SearchPanel";
import Progress, { ProgressMap } from "./components/Progress";
import Overview from "./components/Overview";
import WorldMap from "./components/WorldMap";
import CountryPanel from "./components/CountryPanel";
import Charts from "./components/Charts";
import Compare from "./components/Compare";
import Insights from "./components/Insights";
import SourceExplorer from "./components/SourceExplorer";
import Methodology from "./components/Methodology";
import HistoryDrawer from "./components/HistoryDrawer";

const DEFAULT_COUNTRIES = ["US", "GB", "IN", "DE", "BR", "JP"];

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(DEFAULT_COUNTRIES);
  const [useLocal, setUseLocal] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [runCodes, setRunCodes] = useState<string[]>([]);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { fetchConfig().then(setConfig).catch((e) => setConfigError(e.message)); }, []);

  const search = useCallback(async (q: string, codes: string[], local: boolean) => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setRunning(true); setError(null); setData(null); setRunCodes(codes);
    setProgress(Object.fromEntries(codes.map((c) => [c, { status: "queued" as const }])));
    try {
      await runSearch({ query: q, countries: codes, useLocalLanguage: local }, (e) => {
        if (e.type === "progress") setProgress((p) => ({ ...p, [e.code]: { status: e.status, error: e.error, count: e.count, elapsedMs: e.elapsedMs } }));
        if (e.type === "error") setError(e.message);
        if (e.type === "result") {
          setData(e.data);
          setActive(e.data.countries.find((c) => c.status === "ok")?.code ?? e.data.countries[0]?.code ?? null);
          const item: HistoryItem = { query: q, countries: codes, useLocalLanguage: local, at: e.data.generatedAt, score: e.data.divergence.score, demo: e.data.demo };
          setHistory((h) => { const next = [item, ...h.filter((x) => !(x.query === q && x.countries.join() === codes.join()))]; saveHistory(next); return next; });
        }
      }, ctl.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "The search failed.");
    } finally {
      if (abort.current === ctl) setRunning(false);
    }
  }, []);

  const repeat = (h: HistoryItem) => {
    setQuery(h.query); setSelected(h.countries); setUseLocal(h.useLocalLanguage); setHistoryOpen(false);
    search(h.query, h.countries, h.useLocalLanguage);
  };

  const failed = data?.countries.filter((c) => c.status === "failed") ?? [];
  const empty = data?.countries.filter((c) => c.status === "empty") ?? [];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 font-display text-xl font-bold" aria-label="Parallel Googles home">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden><path d="M10 4 4 28M19 4l-6 24M28 4l-6 24" stroke="url(#g)" strokeWidth="3.2" strokeLinecap="round" /><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3D7BFF" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient></defs></svg>
          Parallel Googles
        </a>
        <nav className="flex gap-1.5 sm:gap-2">
          <button className="btn" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Search history</span><span className="sm:hidden">History</span></button>
          <a className="btn" href="#methodology"><BookOpen className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Methodology</span><span className="sm:hidden">Method</span></a>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-16 sm:px-6">
        <section className="pb-2 pt-4 sm:pt-8">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Does the internet give everyone the same answer?</h1>
          <p className="mt-4 max-w-2xl text-lg text-dim">Run one question as a Google search in several countries at once, then see which pages and sources change, and which don't.</p>
        </section>

        {config && !config.liveAvailable && (
          <div className="flex items-start gap-3 rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm" role="status">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
            <p><strong>Demo mode.</strong> No SerpApi key is set on the server, so searches return synthetic sample results on reserved <code>.example</code> domains, not real Google data. Add <code>SERPAPI_KEY</code> to <code>.env</code> and restart to run live searches.</p>
          </div>
        )}
        {configError && <div className="rounded-xl border border-bad/50 bg-bad/10 p-4 text-sm" role="alert">{configError}</div>}

        <SearchPanel config={config} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} useLocal={useLocal} setUseLocal={setUseLocal} running={running} onSearch={() => search(query.trim(), selected, useLocal)} />

        {error && <div className="flex items-start gap-3 rounded-xl border border-bad/50 bg-bad/10 p-4 text-sm" role="alert"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden />{error}</div>}

        {running && config && <Progress countries={config.countries.filter((c) => runCodes.includes(c.code))} progress={progress} />}

        {!running && !data && !error && (
          <div className="card p-8 text-center text-dim">
            <p className="font-display text-lg text-mist">No search yet</p>
            <p className="mt-1">Pick a question above, choose at least two countries, and select Search the World.</p>
          </div>
        )}

        {data && config && !running && (
          <>
            {data.demo && (
              <div className="flex items-start gap-3 rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm" role="status">
                <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
                <p><strong>Demo data.</strong> Every result below is a synthetic sample. The score, map and insights are computed by the real pipeline, but on made-up inputs.</p>
              </div>
            )}
            {(failed.length > 0 || empty.length > 0) && (
              <div className="rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm" role="status">
                <p><strong>Partial results.</strong> {failed.length > 0 && <>Failed: {failed.map((c) => `${c.name} (${c.error})`).join("; ")}. </>}{empty.length > 0 && <>No results: {empty.map((c) => c.name).join(", ")}. </>}These countries are excluded from the score.</p>
              </div>
            )}

            <Overview data={data} />

            <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
              <WorldMap data={data} countries={config.countries} selected={active} onSelect={setActive} />
              <CountryPanel data={data} code={active} />
            </div>

            {data.divergence.mostSimilar && data.divergence.mostDifferent && (
              <div className="grid gap-4 sm:grid-cols-2">
                {([["Most similar pair", data.divergence.mostSimilar], ["Most different pair", data.divergence.mostDifferent]] as const).map(([label, p]) => {
                  const n = (c: string) => data.countries.find((x) => x.code === c)?.name;
                  return (
                    <div key={label} className="card p-4 text-sm">
                      <p className="text-dim">{label}</p>
                      <p className="mt-1 font-display text-xl font-bold">{n(p.a)} and {n(p.b)}</p>
                      <p className="mt-1 text-dim">Combined {Math.round(p.similarity * 100)}%: domains {Math.round(p.domain * 100)}%, top results {Math.round(p.url * 100)}%, snippets {p.text === null ? "n/a" : `${Math.round(p.text * 100)}%`}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <Charts data={data} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Compare data={data} />
              <Insights data={data} />
            </div>
            <SourceExplorer data={data} />
          </>
        )}

        <Methodology d={data?.divergence} />
      </main>

      <HistoryDrawer open={historyOpen} items={history} onClose={() => setHistoryOpen(false)} onRepeat={repeat} onClear={() => { setHistory([]); saveHistory([]); }} />
    </div>
  );
}
