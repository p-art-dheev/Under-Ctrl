"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Fenced code with a copy button. */
export function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="group relative my-3">
      <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-[13px] leading-relaxed" data-lang={lang || undefined}>
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-1 text-[11px] text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />} {copied ? "Copied" : lang || "Copy"}
      </button>
    </div>
  );
}
