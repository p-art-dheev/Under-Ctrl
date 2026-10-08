// Resource retrieval: live Tavily search (server-side only) with a small,
// clearly labeled curated catalog as the fallback. Search results are
// candidates, not authorities; Gemma ranks them and we store provenance.

export interface CuratedEntry {
  title: string;
  url: string;
  provider: string;
  format: "documentation" | "tutorial" | "reference";
  /** Our own one-line summary. Not quoted from the page. */
  summary: string;
  minutes: number;
  keywords: string[];
}

export const CURATED: CuratedEntry[] = [
  {
    title: "An Informal Introduction to Python: Numbers and Text",
    url: "https://docs.python.org/3/tutorial/introduction.html",
    provider: "docs.python.org",
    format: "documentation",
    summary: "Official tutorial chapter on using Python as a calculator, variables, numbers, strings and first lists.",
    minutes: 20,
    keywords: ["variable", "type", "number", "operator", "expression", "string", "text", "list"],
  },
  {
    title: "Python Tutorial: More Control Flow Tools",
    url: "https://docs.python.org/3/tutorial/controlflow.html",
    provider: "docs.python.org",
    format: "documentation",
    summary: "Official tutorial on if statements, for loops, range(), and defining functions.",
    minutes: 25,
    keywords: ["conditional", "if", "loop", "iteration", "range", "function"],
  },
  {
    title: "Python Tutorial: Data Structures",
    url: "https://docs.python.org/3/tutorial/datastructures.html",
    provider: "docs.python.org",
    format: "documentation",
    summary: "Official tutorial on list methods, list comprehensions, tuples, dictionaries and looping techniques.",
    minutes: 25,
    keywords: ["list", "dictionar", "nested", "loop", "iteration", "data structure"],
  },
  {
    title: "Built-in Types: Common Sequence Operations",
    url: "https://docs.python.org/3/library/stdtypes.html#common-sequence-operations",
    provider: "docs.python.org",
    format: "reference",
    summary: "Reference table for indexing s[i], slicing s[i:j], len(), in, and negative indexes on sequences.",
    minutes: 10,
    keywords: ["index", "slic", "list"],
  },
  {
    title: "Built-in Types: String Methods",
    url: "https://docs.python.org/3/library/stdtypes.html#string-methods",
    provider: "docs.python.org",
    format: "reference",
    summary: "Reference for str methods such as split, strip, lower, replace and format.",
    minutes: 10,
    keywords: ["string", "text"],
  },
  {
    title: "Python Tutorial: Reading and Writing Files",
    url: "https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files",
    provider: "docs.python.org",
    format: "documentation",
    summary: "Official tutorial section on open(), with-blocks, and reading or writing text files.",
    minutes: 15,
    keywords: ["file", "csv", "read"],
  },
  {
    title: "csv — CSV File Reading and Writing",
    url: "https://docs.python.org/3/library/csv.html",
    provider: "docs.python.org",
    format: "reference",
    summary: "Standard-library module for reading and writing CSV rows, including DictReader.",
    minutes: 15,
    keywords: ["csv", "file"],
  },
  {
    title: "json — JSON encoder and decoder",
    url: "https://docs.python.org/3/library/json.html",
    provider: "docs.python.org",
    format: "reference",
    summary: "Standard-library module for nested data in JSON form: json.load and json.loads into dicts and lists.",
    minutes: 10,
    keywords: ["nested", "json", "dictionar"],
  },
  {
    title: "pandas: What kind of data does pandas handle?",
    url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html",
    provider: "pandas.pydata.org",
    format: "tutorial",
    summary: "Getting-started tutorial introducing DataFrame and Series as tables and columns.",
    minutes: 15,
    keywords: ["pandas", "dataframe", "table", "tabular"],
  },
  {
    title: "pandas: How do I read and write tabular data?",
    url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/02_read_write.html",
    provider: "pandas.pydata.org",
    format: "tutorial",
    summary: "Getting-started tutorial on read_csv, head, info and writing data back out.",
    minutes: 15,
    keywords: ["pandas", "csv", "dataframe", "read"],
  },
  {
    title: "pandas: How do I select a subset of a DataFrame?",
    url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/03_subset_data.html",
    provider: "pandas.pydata.org",
    format: "tutorial",
    summary: "Getting-started tutorial on selecting columns, filtering rows with conditions, and loc/iloc.",
    minutes: 20,
    keywords: ["pandas", "select", "filter", "subset"],
  },
  {
    title: "pandas: How to calculate summary statistics",
    url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/06_calculate_statistics.html",
    provider: "pandas.pydata.org",
    format: "tutorial",
    summary: "Getting-started tutorial on mean, describe, groupby aggregation and value_counts.",
    minutes: 20,
    keywords: ["pandas", "aggregat", "statistic", "group", "summar"],
  },
];

export interface SourceHit {
  title: string;
  url: string;
  provider: string;
  excerpt: string;
  format: string;
  origin: "live_search" | "curated";
  verification_status: string;
  selection_reason: string;
  estimated_minutes: number | null;
  query: string | null;
}

export function curatedFor(skill: { key: string; title: string }, limit = 2): SourceHit[] {
  const hay = `${skill.key} ${skill.title}`.toLowerCase();
  return CURATED.map((e) => ({ e, hits: e.keywords.filter((k) => hay.includes(k)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ e }) => ({
      title: e.title,
      url: e.url,
      provider: e.provider,
      excerpt: `${e.summary} (Summary written by the SkillForge team, not quoted from the page.)`,
      format: e.format,
      origin: "curated" as const,
      verification_status: "curated by the team; not fetched or checked at runtime",
      selection_reason: `Curated catalog match for "${skill.title}".`,
      estimated_minutes: e.minutes,
      query: null,
    }));
}

export const searchConfigured = () => Boolean(process.env.TAVILY_API_KEY);

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

/** One bounded Tavily search. Throws on failure so callers can fall back explicitly. */
export async function tavilySearch(query: string, maxResults = 4): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: maxResults, search_depth: "basic", include_answer: false }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
    const body = (await res.json()) as { results?: TavilyResult[] };
    return (body.results ?? [])
      .filter((r) => typeof r.url === "string" && /^https:\/\//.test(r.url))
      .map((r) => ({ title: String(r.title ?? r.url).slice(0, 200), url: r.url, content: String(r.content ?? "").slice(0, 600) }));
  } finally {
    clearTimeout(timer);
  }
}

export async function searchStatus(): Promise<{ configured: boolean; ok: boolean | null; error: string | null }> {
  if (!searchConfigured()) return { configured: false, ok: null, error: null };
  try {
    await tavilySearch("python list indexing tutorial", 1);
    return { configured: true, ok: true, error: null };
  } catch (err) {
    return { configured: true, ok: false, error: (err as Error).message };
  }
}
