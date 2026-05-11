"use client";

import type { ArtifactRow, SessionRow } from "@fyndra/shared";

interface Payload {
  summary?: string;
  sourceCount?: number;
  scrapeWindow?: { start: string; end: string };
}

export function SummaryTab({ artifact, session }: { artifact?: ArtifactRow; session: SessionRow }) {
  const payload = (artifact?.payload as Payload | undefined) ?? null;
  const summary = payload?.summary ?? session.summary;

  if (!summary) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center text-ink-500">
        Summary will appear once synthesis completes.
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-ink-700 bg-ink-800/60 p-8">
      {payload?.sourceCount != null && (
        <p className="mb-4 text-xs text-ink-500">
          Synthesized from {payload.sourceCount} sources
          {payload.scrapeWindow ? (
            <>
              {" "}
              · {new Date(payload.scrapeWindow.start).toLocaleTimeString()} →{" "}
              {new Date(payload.scrapeWindow.end).toLocaleTimeString()}
            </>
          ) : null}
        </p>
      )}
      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
        <Markdownish text={summary} />
      </div>
    </article>
  );
}

function Markdownish({ text }: { text: string }) {
  // Minimal renderer: bold + line breaks. Avoids pulling in a markdown lib.
  const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className="mb-4 text-ink-500">
          {p.split(/(\*\*[^*]+\*\*)/).map((seg, j) =>
            seg.startsWith("**") && seg.endsWith("**") ? (
              <strong key={j} className="text-white">
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{seg}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}
