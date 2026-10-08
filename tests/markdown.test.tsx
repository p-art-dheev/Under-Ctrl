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
