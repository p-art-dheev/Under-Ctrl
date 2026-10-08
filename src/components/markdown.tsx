// Small, safe renderer for the markdown Gemma writes in lessons, feedback and
// tutor replies: headings, paragraphs, fenced code, bullet and numbered lists,
// block quotes, inline code, bold, italics, http(s) links and [S1] citations.
// Text is rendered as React children, never as raw HTML.
import { Fragment, type ReactNode } from "react";

export interface CitationTarget {
  key: string;
  url: string;
  title: string;
}

type Block =
  | { kind: "code"; lang: string; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "p"; lines: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** Model text sometimes arrives with escaped newlines ("\\n") or CRLF. */
function normalise(text: string): string {
  let t = text.replace(/\r\n?/g, "\n");
  if (!t.includes("\n") && t.includes("\\n")) t = t.replace(/\\n/g, "\n");
  return t.trim();
}

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = normalise(text).split("\n");
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", lines: para });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flush();
      const body: string[] = [];
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i]);
      blocks.push({ kind: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].replace(/#+\s*$/, "") });
      continue;
    }
    for (const [re, kind] of [[BULLET, "ul"], [NUMBERED, "ol"]] as const) {
      if (re.test(line)) {
        flush();
        const items: string[] = [];
        while (i < lines.length && re.test(lines[i])) {
          items.push(lines[i].replace(re, ""));
          // indented continuation lines belong to the item
          while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !re.test(lines[i + 1]) && !BULLET.test(lines[i + 1])) {
            items[items.length - 1] += ` ${lines[++i].trim()}`;
          }
          i++;
        }
        i--;
        blocks.push({ kind, items });
        break;
      }
    }
    if (BULLET.test(line) || NUMBERED.test(line)) continue;
    if (/^\s*>\s?/.test(line)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      i--;
      blocks.push({ kind: "quote", lines: q });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

function inline(text: string, cites: Map<string, CitationTarget>, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|\b_[^_\s][^_]*_\b|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\[S\d+(?:\s*,\s*S\d+)*\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*") || tok.startsWith("_")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else if (m[2]) {
      out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">{tok.slice(1, tok.indexOf("]("))}</a>);
    } else {
      // [S1] or [S1, S2]; markers without a stored source are dropped rather than shown
      tok.slice(1, -1).split(/\s*,\s*/).forEach((id, j) => {
        const c = cites.get(id);
        if (c) out.push(<a key={`${k}-${j}`} href={c.url} target="_blank" rel="noreferrer" className="ml-0.5 align-super text-xs font-medium text-brand hover:underline" title={c.title}>[{c.key}]</a>);
      });
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, citations = [] }: { text: string; citations?: CitationTarget[] }) {
  const cites = new Map(citations.map((c) => [c.key, c]));
  const ln = (s: string, key: string) => inline(s, cites, key);
  return (
    <div className="text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {parse(text).map((b, idx) => {
        const key = `b${idx}`;
        switch (b.kind) {
          case "code":
            return (
              <pre key={key} className="my-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-[13px] leading-relaxed" data-lang={b.lang || undefined}>
                <code>{b.text}</code>
              </pre>
            );
          case "heading":
            return b.level <= 2
              ? <h3 key={key} className="mb-1 mt-4 text-base font-semibold">{ln(b.text, key)}</h3>
              : <h4 key={key} className="mb-1 mt-3 text-sm font-semibold">{ln(b.text, key)}</h4>;
          case "ul":
          case "ol": {
            const List = b.kind;
            return (
              <List key={key} className={`my-2 space-y-1 pl-5 ${b.kind === "ul" ? "list-disc" : "list-decimal"} marker:text-muted`}>
                {b.items.map((it, k) => <li key={k}>{ln(it, `${key}-${k}`)}</li>)}
              </List>
            );
          }
          case "quote":
            return <blockquote key={key} className="my-3 border-l-2 border-brand/40 pl-3 text-muted">{b.lines.map((l, k) => <p key={k}>{ln(l, `${key}-${k}`)}</p>)}</blockquote>;
          default:
            return (
              <p key={key} className="my-2">
                {b.lines.map((l, k) => <Fragment key={k}>{k > 0 ? <br /> : null}{ln(l, `${key}-${k}`)}</Fragment>)}
              </p>
            );
        }
      })}
    </div>
  );
}

/** One line of model text (reasons, notes): inline code, bold and italics only. */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{inline(normalise(text).replace(/\s*\n+\s*/g, " "), new Map(), "i")}</>;
}
