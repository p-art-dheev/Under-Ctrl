// Small, safe renderer for the subset of markdown that lessons use: paragraphs,
// fenced code, bullet lists, inline code, bold, italics and [S1] citations.
// Text is rendered as React children, never as raw HTML.
import { Fragment, type ReactNode } from "react";

export interface CitationTarget {
  key: string;
  url: string;
  title: string;
}

function inline(text: string, cites: Map<string, CitationTarget>, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|_[^_\s][^_]*_|\[S\d+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("_")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else {
      const c = cites.get(tok.slice(1, -1));
      // unsupported citation markers are dropped rather than shown
      if (c) out.push(<a key={k} href={c.url} target="_blank" rel="noreferrer" className="align-super text-xs font-medium text-brand hover:underline" title={c.title}>[{c.key}]</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, citations = [] }: { text: string; citations?: CitationTarget[] }) {
  const cites = new Map(citations.map((c) => [c.key, c]));
  const blocks: ReactNode[] = [];
  const parts = text.split(/```(?:[a-zA-Z0-9]*)\n?([\s\S]*?)```/g);
  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      blocks.push(
        <pre key={`c${idx}`} className="my-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-[13px] leading-relaxed">
          <code>{part.replace(/\n$/, "")}</code>
        </pre>,
      );
      return;
    }
    part
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((para, j) => {
        const lines = para.split("\n");
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          blocks.push(
            <ul key={`l${idx}-${j}`} className="my-2 list-disc space-y-1 pl-5">
              {lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*[-*]\s+/, ""), cites, `${idx}-${j}-${k}`)}</li>)}
            </ul>,
          );
        } else {
          blocks.push(
            <p key={`p${idx}-${j}`} className="my-2 leading-relaxed">
              {lines.map((l, k) => <Fragment key={k}>{k > 0 ? <br /> : null}{inline(l, cites, `${idx}-${j}-${k}`)}</Fragment>)}
            </p>,
          );
        }
      });
  });
  return <div className="text-[15px]">{blocks}</div>;
}
