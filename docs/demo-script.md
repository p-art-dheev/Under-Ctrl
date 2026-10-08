# 90-second demo script

Two paths. Use the **seeded path** on stage (fast, repeatable); use the **fresh-account path** to show that nothing is pre-baked.

## Before the demo (seeded path)

```bash
npm run seed            # local mode: prints demo@cognify.test / cognify-demo
# Supabase mode:  SEED_PASSWORD='<choose one>' npm run seed
npm run dev
```

The seed uses the same services as the app with the **labeled sample course** (fixture content), so the banner says "Sample content". It records a two-batch diagnostic and one completed lesson with practice, giving real evidence counts. Run it once per demo account; running again adds a second course.

## On stage (about 90 seconds)

| Time | Do | Say |
| --- | --- | --- |
| 0:00 | Sign in as the demo learner. Dashboard opens. | "The goal was Python for data analysis. The diagnostic built this graph; untested skills stay *unassessed*, not failed." |
| 0:15 | Skill map: click **Loops and iteration**. Show its sources panel. | "Every lesson cites only sources stored for this skill: docs.python.org links, labeled curated or live search." |
| 0:25 | Loops is locked behind indexing and conditionals. Click **Open**, choose "Study it anyway". | "Learners can override; that choice is recorded." |
| 0:30 | In the practice questions, deliberately pick the answer that uses a **value as an index** (for example `10 20 30` for `range(len(nums))`, or "It prints a b c" for `words[w]`). Submit. | "Two answers point at the same misconception, so the app doesn't remediate yet: it asks for a targeted check." |
| 0:45 | Open the targeted check on **List indexing** and answer it wrong. | "The check confirms the gap." |
| 0:55 | Back on the map: a dashed **review** node now sits before Loops; open **Your path changed**. | "One remediation node was inserted, the loops lesson was simplified, and here is the evidence that caused it. Existing skills kept their IDs." |
| 1:10 | Open the review lesson and answer its follow-up questions correctly. | "The follow-up passes at 80%, so the review resolves and Loops reopens." |
| 1:20 | Refresh the page (or sign out and in). | "Everything is in Postgres with row-level security; nothing lived in the browser." |

## Fresh-account path

1. Sign up with a new email (confirm it if email confirmation is on).
2. Enter a goal, e.g. "Learn Python for data analysis, I know some basics, 30 minutes a day".
3. Watch setup build the graph, run diagnostic batch 1 and 2, attach sources and write the first lesson. With `GEMINI_API_KEY` set and `COGNIFY_FIXTURE_MODE` empty this is live Gemma 4; generation takes tens of seconds per step.
4. Continue as in the table above. In live mode question wording differs every time, so pick whichever option confuses a value with its position.
