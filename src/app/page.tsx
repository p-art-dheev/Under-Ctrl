import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  Compass,
  GitBranch,
  GitFork,
  LineChart,
  MessageSquareText,
  Quote,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModeBanner } from "@/components/mode-banner";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Target, title: "Tell it your goal", text: "\"Python for data analysis, 30 minutes a day.\" Gemma 4 turns it into a scoped target." },
  { icon: Compass, title: "Take a short diagnostic", text: "Two small batches find what you already know. Untested skills stay unassessed, never failed." },
  { icon: GitBranch, title: "Follow your skill graph", text: "Prerequisites come first. Each lesson cites the sources it was written from." },
  { icon: RotateCcw, title: "Watch it adapt", text: "Repeated, related mistakes trigger a quick check. A confirmed gap inserts a short review, with the reason shown." },
];

const FEATURES = [
  {
    icon: GitFork,
    title: "A skill graph that remembers",
    text: "Skills keep stable IDs across every change, so your history, answers and progress survive when the path is updated.",
    wide: true,
  },
  { icon: Quote, title: "Lessons with receipts", text: "Every lesson cites stored sources. Citations to anything else are stripped before you see them." },
  { icon: SearchCheck, title: "Checks before changes", text: "One wrong answer never rewrites your course. Two related ones trigger a two-question check first." },
  { icon: Bot, title: "A tutor that knows the lesson", text: "Ask for a simpler explanation, another example, or a hint. It gives hints before solutions." },
  { icon: LineChart, title: "Progress you can trust", text: "Mastery moves only on answers. Finishing a lesson is activity, not mastery, and the dashboard keeps them apart." },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Row-level security in Postgres: you can read only your own rows, and grades or answer keys can't be written from the browser.",
    full: true,
  },
];

const COMPARE = [
  ["Same lessons for everyone", "A graph built from your goal and your answers"],
  ["Finishing a video counts as learning", "Only answers move your mastery estimate"],
  ["Stuck? Watch it again", "A targeted review of the prerequisite you're missing"],
  ["Changes happen silently, if at all", "Every change logged with the evidence behind it"],
];

const STACK = ["Gemma 4", "Gemini API", "Next.js 16", "Supabase Auth", "Postgres + RLS", "React Flow", "Tavily search", "Zod"];

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="min-h-screen overflow-x-clip">
      <ModeBanner />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#different" className="transition-colors hover:text-ink">Why it&apos;s different</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Sign in</Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>Get started</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="sf-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="sf-grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 md:px-6 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="sf-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft/70 px-3 py-1 text-xs font-medium text-brand">
              <Sparkles size={13} aria-hidden /> Powered by Gemma 4, an open model
            </span>
            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              The course that{" "}
              <span className="bg-gradient-to-r from-brand to-emerald-500 bg-clip-text text-transparent dark:to-lime-300">adapts to every answer</span>{" "}
              you give.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Describe what you want to learn. SkillForge maps the skills it takes, teaches with cited sources, and reshapes your path when your answers reveal a gap.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Start learning free <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#how" className={buttonVariants({ variant: "outline", size: "lg" })}>See how it works</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["Diagnostic in two minutes", "Sources on every lesson", "Your data stays yours"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-brand" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-t border-line/70 bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionHead eyebrow="How it works" title="From “I want to learn this” to a clear next step" />
          <ol className="sf-stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="group relative rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-ink">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span className="font-display text-sm font-semibold text-muted/60">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionHead eyebrow="Features" title="Built around evidence, not guesswork" />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, wide, full }) => (
              <div
                key={title}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)] transition-all hover:border-brand/40",
                  wide && "md:col-span-2",
                  full && "md:col-span-3",
                )}
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                <Icon size={22} className="text-brand" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="different" className="scroll-mt-20 border-y border-line/70 bg-surface/50 py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <SectionHead eyebrow="Why it's different" title="A fixed course keeps going. SkillForge checks first." />
          <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
            <div className="grid grid-cols-2 border-b border-line bg-surface-2/60 text-xs font-semibold uppercase tracking-wider text-muted">
              <div className="px-5 py-3">Typical course</div>
              <div className="flex items-center gap-2 px-5 py-3 text-brand"><LogoMark className="h-5 w-5 rounded-md [&_svg]:h-3 [&_svg]:w-3" /> SkillForge</div>
            </div>
            {COMPARE.map(([a, b]) => (
              <div key={a} className="grid grid-cols-2 border-b border-line text-sm last:border-0">
                <div className="flex items-start gap-2 px-5 py-4 text-muted"><X size={16} className="mt-0.5 shrink-0 text-muted/70" aria-hidden /> {a}</div>
                <div className="flex items-start gap-2 px-5 py-4 font-medium"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 text-center md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Under the hood</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {STACK.map((t) => (
              <span key={t} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-muted shadow-[var(--shadow)]">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 md:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-brand to-emerald-500 px-6 py-16 text-center text-white shadow-[var(--shadow-lg)] dark:from-emerald-900 dark:via-emerald-800 dark:to-emerald-600">
          <div className="sf-grid-bg pointer-events-none absolute inset-0 opacity-20" aria-hidden />
          <h2 className="relative text-3xl font-semibold tracking-tight md:text-4xl">Start with one goal.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">Your skill graph, lessons and progress are saved to your account, ready when you come back.</p>
          <Link href="/signup" className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-emerald-800 shadow-lg transition hover:bg-white/90 active:scale-[0.98]">
            Create your account <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted md:flex-row md:px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-7 w-7" />
            <span>SkillForge by team Under Ctrl · Hacktoberfest Hack Day, Coimbatore 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/p-art-dheev/Under-Ctrl" className="transition-colors hover:text-ink">GitHub</a>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-[2.4rem] md:leading-tight">{title}</h2>
    </div>
  );
}

/** Illustrative product preview built from the app's own visual language (not a screenshot of user data). */
function HeroPreview() {
  const nodes = [
    { x: 150, y: 20, t: "Variables", s: "m", p: 50 },
    { x: 40, y: 90, t: "Lists", s: "m", p: 46 },
    { x: 260, y: 90, t: "Conditionals", s: "l", p: 34 },
    { x: 40, y: 160, t: "Indexing", s: "r", p: 24 },
    { x: 260, y: 160, t: "Functions", s: "k", p: 0 },
    { x: 95, y: 228, t: "Review", s: "v", p: 0 },
    { x: 150, y: 292, t: "Loops", s: "a", p: 0 },
  ] as const;
  const edges = [[0, 1], [0, 2], [1, 3], [3, 5], [2, 6], [2, 4], [5, 6]] as const;
  const color = { m: "var(--st-mastered)", l: "var(--st-learning)", r: "var(--st-review)", a: "var(--st-available)", k: "var(--st-locked)", v: "var(--st-review)" };
  return (
    <div className="sf-enter relative mx-auto w-full max-w-[520px] [animation-delay:120ms]" aria-hidden>
      <div className="absolute -inset-6 rounded-[2rem] bg-brand/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface-2/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-muted">Skill map · Python for data analysis</span>
        </div>
        <svg viewBox="0 0 380 340" className="block w-full">
          {edges.map(([a, b]) => {
            const review = nodes[a].s === "v" || nodes[b].s === "v";
            return (
              <path
                key={`${a}-${b}`}
                d={`M${nodes[a].x + 40} ${nodes[a].y + 32} C ${nodes[a].x + 40} ${nodes[a].y + 56}, ${nodes[b].x + 40} ${nodes[b].y - 24}, ${nodes[b].x + 40} ${nodes[b].y}`}
                stroke={review ? "var(--st-review)" : "var(--line)"}
                strokeWidth="1.6"
                strokeDasharray={review ? "4 4" : undefined}
                fill="none"
              />
            );
          })}
          {nodes.map((n) => (
            <g key={n.t} opacity={n.s === "k" ? 0.6 : 1}>
              <rect x={n.x} y={n.y} width="80" height="32" rx="9" fill={n.s === "v" ? "var(--st-review-soft)" : "var(--surface)"} stroke={color[n.s]} strokeWidth="1.8" strokeDasharray={n.s === "v" ? "4 3" : undefined} />
              <text x={n.x + 40} y={n.y + 15} textAnchor="middle" fontSize="10" fontWeight="600" fill={n.s === "v" ? "var(--st-review)" : "var(--ink)"}>{n.t}</text>
              <rect x={n.x + 12} y={n.y + 22} width="56" height="3" rx="1.5" fill="var(--surface-2)" />
              <rect x={n.x + 12} y={n.y + 22} width={n.p} height="3" rx="1.5" fill={color[n.s]} />
            </g>
          ))}
        </svg>
      </div>
      <div className="absolute -left-4 top-14 w-56 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-lg)] sm:-left-12">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-review"><GitBranch size={13} /> Your path changed</p>
        <p className="mt-1 text-xs leading-snug text-muted">Two answers used a value as a position. A 2-question check confirmed it, so a short indexing review comes before Loops.</p>
      </div>
      <div className="absolute -right-3 bottom-14 hidden w-44 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-lg)] sm:block md:-right-10">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><BookOpenCheck size={13} className="text-brand" /> Lists · mastery</p>
        <p className="mt-1 font-display text-2xl font-semibold">86%</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-surface-2"><div className="h-full w-[86%] rounded-full bg-mastered" /></div>
        <p className="mt-1.5 text-[11px] text-muted">from 4 direct answers</p>
      </div>
      <div className="absolute -bottom-5 left-8 hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs shadow-[var(--shadow-lg)] sm:flex">
        <MessageSquareText size={13} className="text-brand" /> Tutor: “What is <code className="font-mono">w</code> on the first pass?”
      </div>
    </div>
  );
}
