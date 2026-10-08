# Two-user authorization checklist (manual)

Run against a Supabase project with the migration applied. Use two browsers (or one normal and one private window).

Automated coverage: `scripts/test-sql.sh` runs the RLS checks in `supabase/tests/rls_test.sql` on Postgres 16 (two users, owner-only reads, blocked direct writes, `sf_commit` ownership and version checks). `tests/flow.test.ts` checks isolation in the local store. The steps below are the manual pass against a real project.

| # | Step | Expected |
| --- | --- | --- |
| 1 | User A signs up, completes onboarding and the diagnostic. | Course appears on A's dashboard. |
| 2 | User B signs up in another browser. | B sees onboarding, not A's course. |
| 3 | B opens A's URLs directly (`/learn/<A's skill id>`, `/assess/<A's group id>`). | "Not found" for B; no data from A is shown. |
| 4 | In B's browser console, query A's rows with the anon key (`supabase.from('skills').select('*')`). | Only B's rows (empty for a new user). |
| 5 | B tries `supabase.from('skill_mastery').update({score:1})` or an insert into `assessment_attempts`. | Rejected: learners cannot write grades, mastery or graph rows. |
| 6 | B calls `supabase.rpc('sf_commit', {...})` with A's course id. | Permission denied: only the server (service role) can execute it. |
| 7 | B reads `question_keys`. | Permission denied: answer keys are never readable from the browser. |
| 8 | A submits the same answers twice (double-click or retry). | One set of attempts; mastery counted once. |
| 9 | A edits the course in two tabs and submits in both. | Second tab gets "Your course changed in another tab. Reload and try again." |
| 10 | Sign out, then visit `/dashboard`. | Redirect to `/login`. |

Record date, project and result for each row when you run it. Do not mark a row passed without running it.
