import type { Divergence } from "../../../shared/types";

const DEFAULT_W = { domain: 0.3, url: 0.4, text: 0.3 };

export default function Methodology({ d }: { d?: Divergence }) {
  const w = d?.weights ?? DEFAULT_W;
  return (
    <section id="methodology" className="card p-5 sm:p-7" aria-label="Methodology and limitations">
      <h2 className="text-xl font-bold">How the score works</h2>
      <div className="mt-3 grid gap-6 text-sm text-dim md:grid-cols-2">
        <div className="space-y-3">
          <p>For each query we ask Google (through SerpApi) for the top 10 organic results in every selected country, then compare every pair of countries that returned results.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-mist">Domain overlap ({Math.round(w.domain * 100)}%)</strong>: Jaccard similarity of the sets of domains.</li>
            <li><strong className="text-mist">Top-result overlap ({Math.round(w.url * 100)}%)</strong>: overlap of canonical URLs, each weighted by 1/rank so rank 1 counts more than rank 10.</li>
            <li><strong className="text-mist">Snippet similarity ({Math.round(w.text * 100)}%)</strong>: TF-IDF cosine similarity of all titles and snippets.</li>
          </ul>
          <p><strong className="text-mist">Divergence = 100 × (1 − average pair similarity).</strong> Countries whose search failed or returned nothing are excluded, so missing data never counts as a difference. If a component can't be computed, the others are re-weighted. The same input always gives the same score.</p>
        </div>
        <div className="space-y-3">
          <p><strong className="text-mist">Map colours</strong> use each country's average similarity to the others: green at {Math.round((d?.thresholds.high ?? 0.45) * 100)}% or more, amber at {Math.round((d?.thresholds.medium ?? 0.25) * 100)}% or more, red below that, gray when there is not enough data. These cut-offs are conventions chosen for this tool, not scientific thresholds.</p>
          <p><strong className="text-mist">Limits.</strong> Google's <code>gl</code>, <code>hl</code> and <code>location</code> parameters bias results toward a place but do not guarantee them. Results also vary with personalisation and time. A high score means the pages differ, not that any country is misinformed or that a source is biased. Treat one search as a snapshot.</p>
          <p>Searches in different languages naturally share few words, so use the language toggle with care.</p>
        </div>
      </div>
    </section>
  );
}
