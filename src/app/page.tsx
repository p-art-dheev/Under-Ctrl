import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, LineChart, Target } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { btn, btnGhost } from "@/components/ui";
import { ModeBanner } from "@/components/mode-banner";

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  const points = [
    { icon: Target, title: "Starts from your goal", text: "A short diagnostic shows what you already know. Untested skills stay unassessed." },
    { icon: GitBranch, title: "A skill graph that adapts", text: "Repeated, related mistakes trigger a quick check. A confirmed gap inserts a short review, and you see why." },
    { icon: LineChart, title: "Evidence, not guesses", text: "Mastery moves only on answers you give. Reading a lesson is progress, not mastery." },
  ];
  return (
    <div className="min-h-screen">
      <ModeBanner />
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-ink">SF</span>
          <span className="text-lg font-semibold tracking-tight">SkillForge</span>
        </div>
        <h1 className="mt-10 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          A course that changes when your answers show it should.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Describe a goal. SkillForge, powered by Gemma 4, builds a prerequisite skill graph, teaches with cited sources, checks your understanding and adapts your path from the evidence.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={btn}>Get started <ArrowRight size={16} aria-hidden /></Link>
          <Link href="/login" className={btnGhost}>Sign in</Link>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-5">
              <Icon className="text-brand" size={22} aria-hidden />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
