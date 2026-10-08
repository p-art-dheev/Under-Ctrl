// Only source IDs that were supplied to the model may reach the UI.

export function filterCitations(
  cited: string[],
  allowed: Iterable<string>,
): { valid: string[]; rejected: string[] } {
  const allow = new Set(allowed);
  const valid: string[] = [];
  const rejected: string[] = [];
  for (const id of cited) {
    if (allow.has(id)) {
      if (!valid.includes(id)) valid.push(id);
    } else rejected.push(id);
  }
  return { valid, rejected };
}

interface Citing {
  sections: { citations: string[] }[];
  worked_example: { citations: string[] };
}

/** Strip unsupported source IDs from lesson content. Returns the IDs that survive. */
export function sanitizeLessonCitations<T extends Citing>(
  content: T,
  allowed: Iterable<string>,
): { content: T; used: string[]; rejected: string[] } {
  const allow = [...allowed];
  const used: string[] = [];
  const rejected: string[] = [];
  const clean = (cited: string[]) => {
    const r = filterCitations(cited, allow);
    for (const id of r.valid) if (!used.includes(id)) used.push(id);
    rejected.push(...r.rejected);
    return r.valid;
  };
  const next = {
    ...content,
    sections: content.sections.map((s) => ({ ...s, citations: clean(s.citations) })),
    worked_example: {
      ...content.worked_example,
      citations: clean(content.worked_example.citations),
    },
  };
  return { content: next, used, rejected };
}
