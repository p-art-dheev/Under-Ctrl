# End-to-end learner walkthrough

What a learner does, and what to check at each step. The automated version of this journey (sample content, local store) is `tests/flow.test.ts` and runs with `npm test`.

1. **Sign up / sign in.** `/signup` creates a Supabase Auth user (or a local demo user when Supabase is not configured). Signed-out visits to app pages redirect to `/login`.
2. **Onboarding.** Goal, experience, minutes per day, explanation style, optional target date. Gemma interprets the goal; a vague goal gets one clarifying question.
3. **Setup** (resumable; a refresh continues where it stopped):
   - Gemma proposes a skill graph. It is validated as a DAG with stable keys before saving.
   - Diagnostic batch 1 (4 questions), then batch 2 targeted at what batch 1 left uncertain.
   - Sources: Tavily search ranked by Gemma, or the labeled curated catalog.
   - First lesson generated from those sources; citations to unknown sources are removed.
4. **Skill map.** Each node shows state (locked, available, learning, needs review, mastered), score and evidence count; the side panel explains *why*.
5. **Lesson.** Sections with citations, worked example, practice questions, hints (reduce the answer's weight), "I don't understand", confidence, and a contextual tutor (explain simpler, another example, check my answer).
6. **Adaptation.** Two low answers sharing a misconception that points at another skill trigger a 2-question targeted check. Mean below 60% confirms the gap: one review node is inserted before the dependent skill, that lesson is simplified, and a follow-up is scheduled. The event and its evidence appear under "Your path changed".
7. **Follow-up.** Mean of 80% or more resolves the review. Reviews can be postponed; an open review for the same gap is reused, never duplicated.
8. **Dashboard.** All numbers come from stored rows: skills assessed and mastered, lessons completed, answers, study time, weak skills, weekly activity, mastery history, recent activity and next recommended step.
9. **Persistence.** Refresh or sign in on another browser: course, graph version, answers and progress are unchanged. Submitting the same answers twice does not double-count (idempotency key).
