import { Bar, BarChart, Cell, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SearchResponse } from "../../../shared/types";
import { LEVEL_COLOR } from "../lib";

const axis = { fill: "#9AA3C7", fontSize: 12 };
const tip = { contentStyle: { background: "#0F1630", border: "1px solid #232D55", borderRadius: 8, color: "#ECEBF5" }, cursor: { fill: "rgba(61,123,255,0.08)" } };

export default function Charts({ data }: { data: SearchResponse }) {
  const d = data.divergence;
  const comps = [
    { name: "Domain overlap", value: d.components.domain, weight: d.weights.domain },
    { name: "Top-result overlap", value: d.components.url, weight: d.weights.url },
    { name: "Snippet similarity", value: d.components.text, weight: d.weights.text },
  ].map((c) => ({ ...c, similarity: c.value === null ? 0 : Math.round(c.value * 100), divergence: c.value === null ? 0 : Math.round((1 - c.value) * 100) }));

  const byCountry = data.divergence.countries
    .filter((c) => c.similarity !== null)
    .map((c) => ({ name: data.countries.find((x) => x.code === c.code)!.name, similarity: Math.round(c.similarity! * 100), level: c.level }))
    .sort((a, b) => a.similarity - b.similarity);

  const sharedByCountry = data.countries.filter((c) => c.status === "ok").map((c) => {
    const shared = c.results.filter((r) => d.sharedUrls.some((u) => u.url === r.url)).length;
    return { name: c.code, shared, unique: c.results.length - shared };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <figure className="card p-4">
        <figcaption className="mb-1 font-bold">Where the divergence comes from</figcaption>
        <p className="mb-3 text-xs text-dim">Average pairwise similarity per component. Weights: {comps.map((c) => `${c.name.toLowerCase()} ${Math.round(c.weight * 100)}%`).join(", ")}.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comps} layout="vertical" margin={{ left: 10, right: 16 }}>
            <CartesianGrid stroke="#232D55" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={axis} unit="%" />
            <YAxis type="category" dataKey="name" tick={axis} width={110} />
            <Tooltip {...tip} formatter={(v: number) => `${v}% similar`} />
            <Bar dataKey="similarity" fill="#3D7BFF" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </figure>

      <figure className="card p-4">
        <figcaption className="mb-1 font-bold">Similarity to the rest of the set</figcaption>
        <p className="mb-3 text-xs text-dim">Lower bars are the countries whose results differ most from the others.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byCountry} layout="vertical" margin={{ left: 10, right: 16 }}>
            <CartesianGrid stroke="#232D55" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={axis} unit="%" />
            <YAxis type="category" dataKey="name" tick={axis} width={110} />
            <Tooltip {...tip} formatter={(v: number) => `${v}% similar`} />
            <Bar dataKey="similarity" radius={[0, 6, 6, 0]}>{byCountry.map((c) => <Cell key={c.name} fill={LEVEL_COLOR[c.level]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </figure>

      <figure className="card p-4">
        <figcaption className="mb-1 font-bold">Shared and unique sources</figcaption>
        <p className="mb-3 text-xs text-dim">Results per country that also appeared in another country, versus results seen only there.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sharedByCountry} margin={{ right: 8 }}>
            <CartesianGrid stroke="#232D55" vertical={false} />
            <XAxis dataKey="name" tick={axis} />
            <YAxis tick={axis} allowDecimals={false} />
            <Tooltip {...tip} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#9AA3C7" }} />
            <Bar dataKey="shared" name="Shared" stackId="a" fill="#3D7BFF" />
            <Bar dataKey="unique" name="Only here" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </div>
  );
}
