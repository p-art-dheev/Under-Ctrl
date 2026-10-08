import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} citations={[{ key: "S1", url: "https://docs.python.org/3/", title: "Docs" }]} />);

describe("Markdown", () => {
  it("renders the shapes Gemma produces", () => {
    const out = html("## Loops\nIntro with `code` and **bold** [S1] [S9].\n\n1. first\n2. second\n\n- a\n- b\n\n```python\nfor x in xs:\n    print(x)\n```\nAfter the code.");
    expect(out).toContain("<h3");
    expect(out).toContain("<ol");
    expect(out).toContain("<ul");
    expect(out).toContain("<pre");
    expect(out).toContain("    print(x)");
    expect(out).toContain('href="https://docs.python.org/3/"');
    expect(out).not.toContain("S9");
    expect(out).toContain("After the code.");
  });
  it("handles escaped newlines and never renders raw HTML", () => {
    const out = html("line one\\n\\n<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out.match(/<p/g)?.length).toBe(2);
  });
});

describe("Markdown maths", () => {
  it("renders inline, display and bracket-delimited LaTeX with KaTeX", () => {
    const out = html("Energy is $E = mc^2$ and \\(a^2+b^2=c^2\\).\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$\n\n\\[\n\\sum_{i=1}^{n} i\n\\]");
    expect(out.match(/class="katex"/g)?.length).toBe(4);
    expect(out).toContain("katex-display");
    expect(out).not.toContain("$E");
  });
  it("leaves currency alone and falls back to source text for broken TeX", () => {
    const out = html("It costs $5 and then $10 more.");
    expect(out).not.toContain("katex");
    expect(html("$\\frac{1$")).toContain("<code");
  });
  it("keeps \\nabla and \\neq as maths, not newlines", () => {
    const out = html("Use $\\nabla f \\neq 0$ here\\nNext line");
    expect(out).toContain("katex");
    expect(out).toContain("Next line");
  });
  it("renders bold with maths inside and pipe tables", () => {
    const out = html("**the value $x_1$ matters**\n\n| a | b |\n|---|---|\n| $x^2$ | 2 |");
    expect(out).toContain("<strong>");
    expect(out).toContain("<table");
    expect(out.match(/class="katex"/g)?.length).toBe(2);
  });
});
