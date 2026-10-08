import Link from "next/link";
import { notFound } from "next/navigation";
import { courseContext } from "@/lib/page-context";
import { Card, PageHeader } from "@/components/ui";
import { QuestionForm } from "@/components/question-form";

export const metadata = { title: "Quick check" };

export default async function AssessPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { snap, store } = await courseContext();
  const qs = snap.questions.filter((q) => q.group_id === groupId);
  if (qs.length === 0) notFound();
  const kind = qs[0].group_kind;
  const title = (sid: string) => snap.skills.find((s) => s.id === sid)?.title ?? "";
  const attempts = snap.attempts.filter((a) => a.group_id === groupId);
  const keys = attempts.length ? await store.questionKeys(snap.course.id, qs.map((q) => q.id)) : [];
  const pc = snap.course.state.pending_check;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={kind === "check" ? `Quick check: ${title(qs[0].skill_ids[0])}` : "Practice"}
        subtitle={
          kind === "check" && pc?.group_id === groupId
            ? `${pc.gap_note} These ${qs.length} questions decide whether a short review would help before ${title(pc.dependent_skill_id)}. Nothing changes unless they confirm it.`
            : undefined
        }
      />
      <QuestionForm
        courseId={snap.course.id}
        groupId={groupId}
        questions={qs.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, allow_hints: q.allow_hints, skillTitle: title(q.skill_ids[0]) }))}
        saved={attempts.map((a) => ({ question_id: a.question_id, score: a.score, is_correct: a.is_correct, feedback: a.feedback, explanation: "", correct_option: keys.find((k) => k.question_id === a.question_id)?.correct_option ?? null }))}
        savedAnswers={Object.fromEntries(attempts.map((a) => [a.question_id, a.answer]))}
        afterSubmit={{ href: "/course", label: "See your path" }}
      />
      {attempts.length ? (
        <Card className="mt-6"><Link href="/course" className="text-sm font-medium text-brand hover:underline">See what changed in your path →</Link></Card>
      ) : null}
    </div>
  );
}
