// KaTeX rendering for the maths in lessons, feedback and tutor replies.
// KaTeX output is generated markup (trust is off, so no links or raw HTML pass
// through); a formula it cannot parse is shown as its source text instead.
import katex from "katex";

export function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  let html: string;
  try {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: true, trust: false, strict: "ignore", output: "htmlAndMathml" });
  } catch {
    return display
      ? <pre className="my-3 overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-[13px]">{tex}</pre>
      : <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">{tex}</code>;
  }
  return display
    ? <div className="my-3 overflow-x-auto overflow-y-hidden py-1" dangerouslySetInnerHTML={{ __html: html }} />
    : <span dangerouslySetInnerHTML={{ __html: html }} />;
}
