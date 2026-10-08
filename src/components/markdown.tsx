// Small, safe renderer for the markdown Gemma writes in lessons, feedback and
// tutor replies: headings, paragraphs, fenced code, bullet and numbered lists,
// block quotes, tables, inline code, bold, italics, http(s) links, [S1]
// citations and LaTeX maths ($..$, $$..$$, \(..\), \[..\]).
// Text is rendered as React children, never as raw HTML; maths goes through KaTeX.
import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import { Math } from "@/components/math";
import { LATEX_N_COMMAND } from "@/lib/latex";

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
  | { kind: "math"; tex: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "p"; lines: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** Model text sometimes arrives with escaped newlines ("\\n") or CRLF. */
function normalise(text: string): string {
  let t = text.replace(/\r\n?/g, "\n");
  // "\\n" is a newline unless it starts a LaTeX command such as \nabla or \neq
  if (!t.includes("\n") && t.includes("\\n")) t = t.replace(/\\n/g, (m, off: number) => (LATEX_N_COMMAND.test(t.slice(off, off + 14)) ? m : "\n"));
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
      if (/^(math|latex|tex)$/i.test(fence[1])) blocks.push({ kind: "math", tex: body.join("\n") });
      else blocks.push({ kind: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    // display maths on its own lines: $$ ... $$ or \[ ... \]
    const display = [["$$", "$$"], ["\\[", "\\]"]].find(([open]) => line.trim().startsWith(open));
    if (display) {
      const [open, close] = display;
      const first = line.trim().slice(open.length);
      const end = first.indexOf(close);
      if (end !== -1 && !first.slice(end + close.length).trim()) {
        flush();
        blocks.push({ kind: "math", tex: first.slice(0, end) });
        continue;
      }
      if (end === -1) {
        let j = i + 1;
        const body = [first];
        while (j < lines.length && !lines[j].includes(close)) body.push(lines[j++]);
        if (j < lines.length && !lines[j].slice(lines[j].indexOf(close) + close.length).trim()) {
          body.push(lines[j].slice(0, lines[j].indexOf(close)));
          flush();
          blocks.push({ kind: "math", tex: body.join("\n") });
          i = j;
          continue;
        }
      }
    }
    if (line.includes("|") && TABLE_RULE.test(lines[i + 1] ?? "")) {
      flush();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) rows.push(cells(lines[i++]));
      i--;
      blocks.push({ kind: "table", head, rows });
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
  const re = /(`[^`]+`|\$\$[^\n]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\$(?![\s$])(?:[^$\\\n]|\\.)+?(?<![\s\\])\$(?!\d)|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|\b_[^_\s][^_]*_\b|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\[S\d+(?:\s*,\s*S\d+)*\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("$$") || tok.startsWith("\\(") || tok.startsWith("\\[")) out.push(<Math key={k} tex={tok.slice(2, -2)} />);
    else if (tok.startsWith("$")) out.push(<Math key={k} tex={tok.slice(1, -1)} />);
    else if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k}>{inline(tok.slice(2, -2), cites, k)}</strong>);
    else if (tok.startsWith("*") || tok.startsWith("_")) out.push(<em key={k}>{inline(tok.slice(1, -1), cites, k)}</em>);
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
            return <CodeBlock key={key} lang={b.lang} text={b.text} />;
          case "math":
            return <Math key={key} tex={b.tex} display />;
          case "table":
            return (
              <div key={key} className="my-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-surface-2 text-left">
                    <tr>{b.head.map((h, k) => <th key={k} className="border-b border-line px-3 py-2 font-semibold">{ln(h, `${key}-h${k}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-b border-line last:border-0">{r.map((c, k) => <td key={k} className="px-3 py-2 align-top">{ln(c, `${key}-${ri}-${k}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
