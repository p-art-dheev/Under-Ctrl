import Link from "next/link";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { Card, PageHeader, btn } from "@/components/ui";
import { SetupRunner } from "@/components/setup-runner";
import { QuestionForm } from "@/components/question-form";
import { masteryState } from "@/lib/services/snapshot";
import type { SetupStage } from "@/lib/types";

export const metadata = { title: "Setting up" };

const STEPS: { stage: SetupStage; label: string }[] = [
  { stage: "graph", label: "Propose a prerequisite skill graph" },
  { stage: "diagnostic_1", label: "Diagnostic, part 1" },
  { stage: "diagnostic_2", label: "Diagnostic, part 2 (adapts to part 1)" },
  { stage: "resources", label: "Find learning resources" },
  { stage: "lesson", label: "Write your first lesson" },
];
const ORDER: SetupStage[] = ["graph", "diagnostic_1", "diagnostic_2", "resources", "lesson", "done"];

export default async function SetupPage() {
  const { snap } = await courseContext({ allowSetup: true });
  const stage = snap.course.state.setup_stage;
  const idx = ORDER.indexOf(stage);
  const diagGroup =
    stage === "diagnostic_1" || stage === "diagnostic_2"
      ? snap.questions.filter((q) => q.group_kind === stage && !snap.attempts.some((a) => a.question_id === q.id))
      : [];
  const waitingOnLearner = diagGroup.length > 0;
  const runnable = stage !== "done" && !waitingOnLearner;
  const title = (sid: string) => snap.skills.find((s) => s.id === sid)?.title ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={snap.course.title} subtitle={snap.goal.goal_text} />
      <Card className="mb-6">
        <ol className="space-y-2">
          {STEPS.map((s, i) => {
            const done = i < idx || stage === "done";
            const current = i === idx;
            return (
              <li key={s.stage} className="flex items-center gap-3 text-sm transition-colors">
                {done ? <CheckCircle2 size={18} className="text-mastered" aria-hidden /> : current ? <Loader2 size={18} className={`text-brand ${runnable ? "animate-spin" : ""}`} aria-hidden /> : <Circle size={18} className="text-line" aria-hidden />}
                <span className={done ? "text-muted line-through decoration-line" : current ? "font-medium" : "text-muted"}>{s.label}</span>
                {current && waitingOnLearner ? <span className="text-xs text-brand">waiting for your answers</span> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-4"><SetupRunner key={`${stage}-${snap.questions.length}`} courseId={snap.course.id} runnable={runnable} stage={stage} /></div>
      </Card>

      {waitingOnLearner ? (
        <div className="sf-enter">
          <h2 className="mb-1 text-lg font-semibold">{stage === "diagnostic_1" ? "Diagnostic, part 1" : "Diagnostic, part 2"}</h2>
          <p className="mb-4 text-sm text-muted">Answer honestly; guessing makes the plan worse. There are no hints here, and your answers only set the starting point.</p>
          <QuestionForm
            courseId={snap.course.id}
            groupId={diagGroup[0].group_id}
            questions={diagGroup.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, allow_hints: false, skillTitle: title(q.skill_ids[0]) }))}
            submitLabel="Submit this part"
          />
        </div>
      ) : null}

      {stage === "done" ? <SkillReport snap={snap} /> : null}
    </div>
  );
}

function SkillReport({ snap }: { snap: Awaited<ReturnType<typeof courseContext>>["snap"] }) {
  const tested = snap.skills.map((s) => ({ s, m: masteryState(snap.mastery.find((m) => m.skill_id === s.id)) }));
  const strong = tested.filter((x) => x.m.score !== null && x.m.score >= 0.7);
  const gaps = tested.filter((x) => x.m.score !== null && x.m.score < 0.5);
  const unsure = tested.filter((x) => x.m.score !== null && x.m.score >= 0.5 && x.m.score < 0.7);
  const untested = tested.filter((x) => x.m.score === null);
  return (
    <Card className="sf-enter">
      <h2 className="text-lg font-semibold">Your starting point</h2>
      <p className="mt-1 text-sm text-muted">From {snap.attempts.length} diagnostic answers. A few questions can&apos;t measure ability precisely, so treat this as a first estimate. Every skill starts provisional.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><h3 className="text-sm font-semibold text-mastered">Likely strengths</h3>{reportList(strong, "None observed yet.")}</div>
        <div><h3 className="text-sm font-semibold text-review">Observed gaps</h3>{reportList(gaps, "None observed.")}</div>
        <div><h3 className="text-sm font-semibold text-learning">Uncertain</h3>{reportList(unsure, "Nothing in between.")}</div>
        <div><h3 className="text-sm font-semibold text-muted">Not assessed yet ({untested.length})</h3><p className="mt-1 text-sm text-muted">These stay unassessed until you answer questions on them.</p></div>
      </div>
      <Link href="/dashboard" className={`${btn} mt-6`}>Go to my dashboard</Link>
    </Card>
  );
}

type Tested = { s: { id: string; title: string }; m: { evidence_count: number } }[];
function reportList(items: Tested, empty: string) {
  return items.length ? (
    <ul className="mt-1 space-y-0.5 text-sm">
      {items.map(({ s, m }) => <li key={s.id}>{s.title} <span className="text-muted">({m.evidence_count} answer{m.evidence_count === 1 ? "" : "s"})</span></li>)}
    </ul>
  ) : <p className="mt-1 text-sm text-muted">{empty}</p>;
}
