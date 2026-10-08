import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { dashboardStats, nextAction, skillViews } from "@/lib/services/snapshot";
import { graphSkills } from "@/lib/graph-view";
import { Card, PageHeader, btn } from "@/components/ui";
import { MasteryHistory, WeeklyActivity } from "@/components/charts";
import { SkillGraph } from "@/components/skill-graph";
import { Timeline } from "@/components/timeline";

export const metadata = { title: "Dashboard" };

function Stat({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1 text-xs font-medium text-muted">
        {label}
        <span title={help} aria-label={help}><Info size={12} aria-hidden /></span>
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function Dashboard() {
  const { snap } = await courseContext();
  const views = skillViews(snap);
  const stats = dashboardStats(snap, views);
  const next = nextAction(snap, views);
  const current = [...snap.progress].filter((p) => p.status === "started").sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const currentSkill = current ? snap.skills.find((s) => s.id === current.skill_id) : null;
  const nextSkill = next.skillId ? snap.skills.find((s) => s.id === next.skillId) : null;
  const recommended = (nextSkill ? snap.resources.filter((r) => r.skill_id === (nextSkill.remediates_skill_id ?? nextSkill.id)) : []).slice(0, 3);
  const recent = [
    ...[...new Set(snap.attempts.map((a) => a.group_id))].map((g) => {
      const at = snap.attempts.filter((a) => a.group_id === g);
      const qs = at.map((a) => snap.questions.find((x) => x.id === a.question_id)!);
      const kind = qs[0].group_kind.replace(/_\d$/, "").replace("_", "-");
      // only name a skill when the whole group was about one skill (diagnostics span several)
      const skillIds = new Set(qs.map((q) => q.skill_ids[0]));
      const on = skillIds.size === 1 ? ` on ${snap.skills.find((s) => s.id === qs[0].skill_ids[0])?.title}` : "";
      return { at: at[0].created_at, text: `Answered ${at.length} ${kind} question${at.length === 1 ? "" : "s"}${on}: ${at.filter((a) => a.is_correct).length} correct` };
    }),
    ...snap.progress.filter((p) => p.completed_at).map((p) => ({ at: p.completed_at!, text: `Completed the activity for ${snap.skills.find((s) => s.id === p.skill_id)?.title}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={snap.goal.goal_text} />
      <Card className="mb-6 border-brand/30 bg-gradient-to-br from-brand-soft to-surface">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Recommended next</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{next.label}</h2>
            <p className="mt-1 text-sm text-muted">{next.detail}</p>
          </div>
          <Link href={next.href} className={btn}>Go <ArrowRight size={14} aria-hidden /></Link>
        </div>
        {next.why.length ? (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand">Why this next?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{next.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </details>
        ) : null}
        {currentSkill && currentSkill.id !== next.skillId ? <p className="mt-3 text-sm text-muted">Current lesson: <Link className="text-brand hover:underline" href={`/learn/${currentSkill.id}`}>{currentSkill.title}</Link></p> : null}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Skills assessed" value={`${stats.assessed} / ${stats.coreSkills}`} help="Core skills with at least one scored answer. Unassessed skills are not counted as failures." />
        <Stat label="Skills mastered" value={`${stats.mastered}`} help="Score ≥ 80% with ≥ 3 answers, including 2 correct without hints." />
        <Stat label="Activities completed" value={`${stats.lessonsCompleted}`} help="Lessons marked complete. Separate from mastery." />
        <Stat label="Answers given" value={`${stats.answers}`} help="All graded answers (diagnostic, practice, checks, follow-ups)." />
        <Stat label="Study time (7 days)" value={`${stats.studyMinutes7d} min`} help="Minutes a lesson page was open and visible, for lessons started in the last 7 days." />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Needs review</h2>
          {stats.weak.length ? (
            <ul className="mt-2 space-y-2 text-sm">{stats.weak.map((w) => <li key={w.id}><Link href={`/learn/${w.id}`} className="font-medium hover:text-brand">{w.title}</Link><p className="text-xs text-muted">{w.detail}</p></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No skill has enough evidence to call it weak.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">This week</h2>
          <WeeklyActivity data={stats.daily} />
        </Card>
        <Card>
          <h2 className="font-semibold">Mastery estimate over time</h2>
          {stats.masteryHistory.length ? <MasteryHistory data={stats.masteryHistory} /> : <p className="mt-2 text-sm text-muted">Appears after your first scored answers.</p>}
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Skill map</h2>
      <div className="mb-6"><SkillGraph skills={graphSkills(snap)} version={snap.course.graph_version} /></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-semibold">Your path changed</h2>
          <Timeline events={snap.adaptations} limit={5} />
        </Card>
        <Card>
          <h2 className="font-semibold">Recent activity</h2>
          {recent.length ? <ul className="mt-2 space-y-2 text-sm">{recent.map((r, i) => <li key={i}><p>{r.text}</p><p className="text-xs text-muted">{new Date(r.at).toLocaleString()}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted">Nothing yet.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">Resources for what&apos;s next</h2>
          {recommended.length ? (
            <ul className="mt-2 space-y-2 text-sm">{recommended.map((r) => <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">{r.title}</a><p className="text-xs text-muted">{r.provider} · {r.origin === "curated" ? "curated" : "live search"}</p></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">See all <Link href="/resources" className="text-brand hover:underline">resources</Link>.</p>}
        </Card>
      </div>
    </>
  );
}
