import { CheckCircle2, GitBranch, Quote, SearchCheck } from "lucide-react";
import { ModeBanner } from "@/components/mode-banner";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  { icon: GitBranch, text: "A prerequisite skill graph built from your goal" },
  { icon: Quote, text: "Lessons that cite the sources they were written from" },
  { icon: SearchCheck, text: "Quick checks before your path changes, with the reason shown" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ModeBanner />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="relative flex flex-col px-4 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle />
          </div>
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="sf-enter w-full max-w-sm">{children}</div>
          </div>
        </div>
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-500 p-12 text-white lg:flex lg:flex-col lg:justify-between dark:from-[#04140d] dark:via-emerald-950 dark:to-emerald-800">
          <div className="sf-grid-bg pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime-300/20 blur-3xl" aria-hidden />
          <p className="relative text-sm font-medium text-white/70">Adaptive learning, powered by Gemma 4</p>
          <div className="relative">
            <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Learn from evidence, not from a fixed syllabus.</h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-white/90">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20"><Icon size={17} aria-hidden /></span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative flex items-center gap-2 text-sm text-white/70"><CheckCircle2 size={15} aria-hidden /> Your course and progress are private to your account.</p>
        </aside>
      </div>
    </div>
  );
}
