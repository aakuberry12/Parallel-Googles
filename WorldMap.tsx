import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { CountryConfig, SearchResponse } from "../../../shared/types";
import { LEVEL_COLOR, LEVEL_LABEL, pct } from "../lib";

interface Props { data: SearchResponse; countries: CountryConfig[]; selected: string | null; onSelect: (code: string) => void }

/** Each searched country is a marker coloured by its real mean similarity to the other countries. */
export default function WorldMap({ data, countries, selected, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { center: [25, 10], zoom: 2, minZoom: 1, worldCopyJump: true, scrollWheelZoom: false });
    // Use OSM's standard tile service so the base map does not need a separate
    // CARTO basemap key. Keep its required attribution visible in Leaflet.
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map.current);
    tiles.on("tileerror", () => setTileError(true));
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const pts: L.LatLngTuple[] = [];
    for (const r of data.countries) {
      const c = countries.find((x) => x.code === r.code);
      const s = data.divergence.countries.find((x) => x.code === r.code);
      if (!c || !s) continue;
      pts.push([c.lat, c.lng]);
      const color = LEVEL_COLOR[s.level];
      const active = r.code === selected;
      const m = L.circleMarker([c.lat, c.lng], {
        radius: active ? 17 : 13, color: active ? "#ECEBF5" : color, weight: active ? 3 : 2, fillColor: color, fillOpacity: 0.55,
      }).addTo(g);
      m.bindTooltip(`${r.name}: ${s.level === "insufficient" ? (r.status === "failed" ? "search failed" : "insufficient data") : `${pct(s.similarity)} similar to others`}`);
      m.on("click", () => onSelect(r.code));
    }
    if (pts.length) map.current?.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 3 });
  }, [data, countries, selected, onSelect]);

  useEffect(() => { setTimeout(() => map.current?.invalidateSize(), 0); }, [data]);

  return (
    <div className="card overflow-hidden">
      <div ref={el} className="h-[380px] w-full lg:h-[460px]" role="application" aria-label="World map of searched countries" />
      {tileError && <p className="border-t border-line bg-warn/10 px-4 py-2 text-xs text-warn" role="status">Map tiles could not load. Check your internet connection or whether your network blocks tile.openstreetmap.org. Country markers may still be available.</p>}
      <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-3 text-xs text-dim">
        {(["high", "medium", "low", "insufficient"] as const).map((l) => (
          <li key={l} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR[l] }} />
            {LEVEL_LABEL[l]}
          </li>
        ))}
        <li className="ml-auto">Colour = average similarity to the other countries (thresholds {pct(data.divergence.thresholds.high)} and {pct(data.divergence.thresholds.medium)})</li>
      </ul>
    </div>
  );
}
