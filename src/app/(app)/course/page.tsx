import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { nextAction, planOrder, skillViews } from "@/lib/services/snapshot";
import { Card, MasteryBar, PageHeader, Pill, StateBadge, UnassessedBadge, btn } from "@/components/ui";
import { Timeline } from "@/components/timeline";
import { PostponeButton } from "@/components/lesson-controls";

export const metadata = { title: "My course" };

export default async function CoursePage() {
  const { snap } = await courseContext();
  const views = skillViews(snap);
  const plan = planOrder(snap);
  const next = nextAction(snap, views);
  const changes = snap.adaptations.filter((e) => e.kind !== "graph_created");
  return (
    <>
      <PageHeader title={snap.course.title} subtitle={snap.goal.goal_text} action={<Link href={next.href} className={btn}>{next.label} <ArrowRight size={14} aria-hidden /></Link>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <h2 className="mb-1 font-semibold">Learning plan</h2>
          <p className="mb-4 text-xs text-muted">Ordered so every prerequisite comes first. Finishing a lesson is separate from mastering a skill.</p>
          <ol className="divide-y divide-line">
            {plan.map((s, i) => {
              const v = views.get(s.id)!;
              return (
                <li key={s.id} className={`flex flex-wrap items-center gap-3 py-3 ${s.kind === "remediation" ? "rounded-lg bg-review-soft/60 px-2" : ""}`}>
                  <span className="w-6 text-right text-xs text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/learn/${s.id}`} className="font-medium hover:text-brand">{s.title}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StateBadge state={v.state} label={v.remediation === "resolved" ? "Resolved" : v.remediation === "postponed" ? "Postponed" : undefined} />
                      {!v.assessed && s.kind === "core" ? <UnassessedBadge /> : null}
                      {v.lessonStatus !== "none" ? <Pill>{v.lessonStatus === "completed" ? "activity done" : "in progress"}</Pill> : null}
                      {s.difficulty === "simplified" && s.kind === "core" ? <Pill tone="ember">simplified</Pill> : null}
                    </div>
                  </div>
                  <div className="w-28"><MasteryBar score={v.mastery.score} /></div>
                  {v.remediation === "open" ? <PostponeButton courseId={snap.course.id} remediationId={s.id} /> : null}
                </li>
              );
            })}
          </ol>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Why this next?</h2>
            <p className="mt-1 text-sm font-medium text-brand">{next.label}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{next.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Your path changed</h2>
            <Timeline events={changes} />
          </Card>
        </div>
      </div>
    </>
  );
}
