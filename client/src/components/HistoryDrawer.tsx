import { History, RotateCcw, Trash2, X } from "lucide-react";
import type { HistoryItem } from "../lib";

interface Props { open: boolean; items: HistoryItem[]; onClose: () => void; onRepeat: (h: HistoryItem) => void; onClear: () => void }

export default function HistoryDrawer({ open, items, onClose, onRepeat, onClear }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/50" onClick={onClose}>
      <aside role="dialog" aria-label="Search history" className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><History className="h-5 w-5" aria-hidden />Recent searches</h2>
          <button className="btn" onClick={onClose} aria-label="Close history"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-dim">Stored only in this browser. Repeating a search runs it again.</p>
        {items.length === 0 ? <p className="mt-6 text-dim">No searches yet. Run one and it will show up here.</p> : (
          <>
            <ul className="mt-4 space-y-2">
              {items.map((h) => (
                <li key={h.at} className="rounded-lg border border-line bg-raise/60 p-3">
                  <p className="font-semibold">{h.query}</p>
                  <p className="mt-0.5 text-xs text-dim">
                    {h.countries.join(", ")}, {h.score === null ? "no score" : `divergence ${h.score}`}{h.demo ? ", demo data" : ""}, {new Date(h.at).toLocaleString()}
                  </p>
                  <button className="btn mt-2" onClick={() => onRepeat(h)}><RotateCcw className="h-4 w-4" aria-hidden />Search again</button>
                </li>
              ))}
            </ul>
            <button className="btn mt-4" onClick={onClear}><Trash2 className="h-4 w-4" aria-hidden />Clear history</button>
          </>
        )}
      </aside>
    </div>
  );
}
