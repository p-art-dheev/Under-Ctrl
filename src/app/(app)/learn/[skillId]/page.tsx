import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookMarked, ExternalLink, RotateCcw } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { ensureLesson } from "@/lib/services/learning";
import { loadSnapshot, nextAction, skillViews } from "@/lib/services/snapshot";
import { Card, MasteryBar, Pill, StateBadge, UnassessedBadge, btn } from "@/components/ui";
import { InlineMarkdown, Markdown, type CitationTarget } from "@/components/markdown";
import { QuestionForm } from "@/components/question-form";
import { TutorPanel } from "@/components/tutor-panel";
import { CompleteLessonButton, LessonTracker, MorePracticeButton, PostponeButton, UnlockButton } from "@/components/lesson-controls";
import type { Lesson, TutorMessage } from "@/lib/types";

export const maxDuration = 120;

export default async function LearnPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const ctx = await courseContext();
  const { store } = ctx;
  let snap = ctx.snap;
  const skill = snap.skills.find((s) => s.id === skillId);
  if (!skill) notFound();
  let view = skillViews(snap).get(skillId)!;

  if (view.state === "locked") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">{skill.title}</h1>
        <Card className="mt-4">
          <StateBadge state="locked" />
          <p className="mt-3 text-sm">{view.reason}</p>
          <p className="mt-2 text-sm text-muted">You can unlock it anyway. It will stay marked as recommended-after, and your mastery still only moves on your answers.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <UnlockButton courseId={snap.course.id} skillId={skill.id} />
            <Link href="/map" className="text-sm font-medium text-brand hover:underline">Back to the skill map</Link>
          </div>
        </Card>
      </div>
    );
  }

  let lesson: Lesson;
  try {
    lesson = await ensureLesson(store, snap.course.id, skillId);
  } catch (err) {
    return (
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-lg font-semibold">The lesson could not be prepared</h1>
        <p className="mt-2 text-sm text-danger">{(err as Error).message}</p>
        <p className="mt-2 text-sm text-muted">Nothing was lost. Your diagnostic and progress are saved.</p>
        <Link href={`/learn/${skillId}`} className={`${btn} mt-4`}><RotateCcw size={14} aria-hidden /> Retry</Link>
      </Card>
    );
  }
  snap = await loadSnapshot(store, snap.course.id);
  view = skillViews(snap).get(skillId)!;
  const versions = snap.lessons.filter((l) => l.skill_id === skillId);
  const sources = snap.resources.filter((r) => lesson.source_keys.includes(r.source_key));
  const citations: CitationTarget[] = sources.map((r) => ({ key: r.source_key, url: r.url, title: r.title }));
  const lessonIds = new Set(versions.map((l) => l.id));
  const groups = [...new Set(snap.questions.filter((q) => q.lesson_id && lessonIds.has(q.lesson_id)).map((q) => q.group_id))];
  const openGroup = groups.find((g) => snap.questions.filter((q) => q.group_id === g).some((q) => !snap.attempts.some((a) => a.question_id === q.id)));
  const shownGroup = openGroup ?? groups[groups.length - 1];
  const shownQs = snap.questions.filter((q) => q.group_id === shownGroup);
  const shownAttempts = snap.attempts.filter((a) => a.group_id === shownGroup);
  const keys = shownAttempts.length ? await store.questionKeys(snap.course.id, shownQs.map((q) => q.id)) : [];
  const earlier = groups.filter((g) => g !== shownGroup).map((g) => {
    const at = snap.attempts.filter((a) => a.group_id === g);
    return { g, total: at.length, correct: at.filter((a) => a.is_correct).length };
  }).filter((x) => x.total > 0);
  const tutor = (await store.select<TutorMessage>("tutor_messages", { course_id: snap.course.id, skill_id: skillId })).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const progress = snap.progress.find((p) => p.lesson_id === lesson.id);
  const title = (sid: string) => snap.skills.find((s) => s.id === sid)?.title ?? "";
  const next = nextAction(snap);
  const c = lesson.content;
  const pc = snap.course.state.pending_check;

  return (
    <div>
      <LessonTracker courseId={snap.course.id} lessonId={lesson.id} />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{skill.kind === "remediation" ? "Targeted review" : "Lesson"} · version {lesson.version} · {lesson.difficulty}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{skill.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StateBadge state={view.state} label={view.remediation === "resolved" ? "Resolved" : undefined} />
            {!view.assessed && skill.kind === "core" ? <UnassessedBadge /> : null}
            {lesson.content_mode === "fixture" ? <Pill tone="ember">Fixture content</Pill> : <Pill tone="brand">Written by Gemma</Pill>}
            <Pill>≈ {c.estimated_minutes} min (platform estimate)</Pill>
          </div>
        </div>
        <div className="w-48">
          <p className="mb-1 text-xs text-muted">{view.mastery.score === null ? "No evidence yet" : `Mastery estimate ${Math.round(view.mastery.score * 100)}% · ${view.mastery.evidence_count} answer${view.mastery.evidence_count === 1 ? "" : "s"}`}</p>
          <MasteryBar score={view.mastery.score} />
        </div>
      </div>

      {view.remediation === "open" ? (
        <Card className="sf-enter mb-5 border-review/40 bg-review-soft">
          <p className="text-sm"><strong>Why this review is here:</strong> {[...snap.adaptations].reverse().find((e) => e.patch?.add_skills?.some((s) => s.id === skill.id))?.reason ?? view.reason}</p>
          <p className="mt-2 text-sm">Answer the follow-up questions below. When they go well, the review resolves and {snap.edges.filter((e) => e.prerequisite_id === skill.id).map((e) => title(e.dependent_id)).join(", ")} opens again.</p>
          <div className="mt-3"><PostponeButton courseId={snap.course.id} remediationId={skill.id} /></div>
        </Card>
      ) : null}
      {pc && pc.dependent_skill_id === skillId ? (
        <Card className="sf-enter mb-5 border-brand/40 bg-brand-soft">
          <p className="text-sm"><InlineMarkdown text={pc.gap_note} /> Before changing anything, a quick check on {title(pc.suspected_skill_id)} will confirm it.</p>
          <Link href={`/assess/${pc.group_id}`} className={`${btn} mt-3`}>Take the 2-question check <ArrowRight size={14} aria-hidden /></Link>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Objective</h2>
            <div className="mt-1"><Markdown text={c.objective} /></div>
            <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">What you need from before</h2>
            <div className="mt-1 text-sm [&_div]:text-sm"><Markdown text={c.prerequisite_recap} /></div>
          </Card>
          {c.sections.map((s, i) => (
            <Card key={i}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <Markdown text={s.body} citations={citations} />
              <Cites keys={s.citations} citations={citations} />
            </Card>
          ))}
          <Card className="border-brand/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Worked example</p>
            <h2 className="mt-1 text-lg font-semibold">{c.worked_example.title}</h2>
            <Markdown text={c.worked_example.body} citations={citations} />
            <Cites keys={c.worked_example.citations} citations={citations} />
          </Card>

          <section>
            <h2 className="mb-1 text-lg font-semibold">{skill.kind === "remediation" ? "Follow-up questions" : "Practice"}</h2>
            <p className="mb-3 text-sm text-muted">The last question is the application exercise. Your answers are the only thing that moves your mastery estimate.</p>
            {earlier.length ? <p className="mb-3 text-xs text-muted">Earlier sets: {earlier.map((e) => `${e.correct}/${e.total} correct`).join(" · ")}</p> : null}
            {shownGroup ? (
              <QuestionForm
                key={shownGroup}
                courseId={snap.course.id}
                groupId={shownGroup}
                questions={shownQs.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, allow_hints: q.allow_hints, skillTitle: title(q.skill_ids[0]) }))}
                saved={shownAttempts.map((a) => ({ question_id: a.question_id, score: a.score, is_correct: a.is_correct, feedback: a.feedback, explanation: "", correct_option: keys.find((k) => k.question_id === a.question_id)?.correct_option ?? null }))}
                savedAnswers={Object.fromEntries(shownAttempts.map((a) => [a.question_id, a.answer]))}
              />
            ) : null}
            {!openGroup ? <div className="mt-4"><MorePracticeButton courseId={snap.course.id} skillId={skill.id} /></div> : null}
          </section>

          <Card>
            <h2 className="flex items-center gap-2 font-semibold"><BookMarked size={16} aria-hidden /> Sources for this lesson</h2>
            <p className="mt-1 text-xs text-muted">The lesson text above is generated teaching material. These are the sources it may cite; the quoted lines are short excerpts or summaries, not the full pages.</p>
            {sources.length ? (
              <ul className="mt-3 space-y-3">
                {sources.map((r) => (
                  <li key={r.id} className="text-sm">
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">[{r.source_key}] {r.title} <ExternalLink size={12} aria-hidden /></a>
                    <p className="text-xs text-muted">{r.provider} · {r.origin === "curated" ? "curated resource" : "live search result"} · {r.verification_status}</p>
                    <blockquote className="mt-1 border-l-2 border-line pl-2 text-xs text-muted">{r.excerpt}</blockquote>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">No sources are cited in this lesson.</p>}
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4">
            <CompleteLessonButton courseId={snap.course.id} lessonId={lesson.id} completed={progress?.status === "completed"} />
            {next.skillId !== skillId ? (
              <Link href={next.href} className={btn}>Next: {next.label} <ArrowRight size={14} aria-hidden /></Link>
            ) : null}
          </Card>
          {versions.length > 1 ? <p className="text-xs text-muted">Earlier versions of this lesson are kept with their answers: {versions.slice(0, -1).map((v) => `v${v.version} (${v.difficulty})`).join(", ")}.</p> : null}
        </div>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <TutorPanel courseId={snap.course.id} skillId={skill.id} messages={tutor.map((m) => ({ id: m.id, role: m.role, content: m.content }))} />
        </aside>
      </div>
    </div>
  );
}

/** Section-level citations, shown under the text so they never break a code block. */
function Cites({ keys, citations }: { keys: string[]; citations: CitationTarget[] }) {
  const found = keys.map((k) => citations.find((c) => c.key === k)).filter((c): c is CitationTarget => Boolean(c));
  if (!found.length) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      Sources:
      {found.map((c) => (
        <a key={c.key} href={c.url} target="_blank" rel="noreferrer" title={c.title} className="rounded-full border border-line px-2 py-0.5 font-medium text-brand transition-colors hover:border-brand hover:bg-brand-soft">
          [{c.key}] {c.title.length > 40 ? `${c.title.slice(0, 40)}…` : c.title}
        </a>
      ))}
    </p>
  );
}
