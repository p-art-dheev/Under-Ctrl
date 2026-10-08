# knowledge.md

Running knowledge base for the **Under-Ctrl** project. Keep this file updated as decisions are made, so anyone (human or agent) can get up to speed quickly. `AGENTS.md` remains the source of truth for rules; this file records project facts and decisions.

## Event

- **Hackathon:** Hacktoberfest Hack Day — Coimbatore 2026
- **Organizers:** INIT CLUB × iDEA CLUB, with Major League Hacking (MLH)
- **Project goal (as set by the team):** a full-stack web app that uses open-source AI models.

## Team — Under Ctrl

College: Amrita Vishwa Vidyapeetham

| Member                       | Role        |
| ---------------------------- | ----------- |
| Dalli Krishan Preetham Reddy | Team Leader |
| Pardheev Vatturu             | Team Member |
| Irala Charuhas Reddy         | Team Member |
| A Prithvi                    | Team Member |

Individual contributions: not yet assigned — fill in as work is divided.

## Repository

- `README.md` — primary submission document. Keep the "What is verified" table honest.
- `docs/demo-script.md`, `docs/walkthrough.md`, `docs/auth-checklist.md` — demo, learner walkthrough, manual two-user checks.
- `AGENTS.md` — rules for coding agents and contributors (`CLAUDE.md` just imports it).
- `docs/Project-Deliverables.txt` — the build brief for **Cognify** (product spec and non-negotiables).
- `knowledge.md` — this file.
- `.gitignore` — keeps `.env` and build/dependency output out of git.

## Product: Cognify

Adaptive learning web app (spec: `docs/Project-Deliverables.txt`). Core loop: goal → diagnostic → skill graph → lesson and practice → assessment evidence → mastery update → curriculum adaptation → next lesson.

Non-negotiables: real Supabase Auth, persistent DAG skill graph with stable IDs, source-backed lessons (Tavily or labeled curated catalog), evidence-based adaptation, data-backed dashboard, Gemma 4 as the only runtime model (`gemma-4-26b-a4b-it` via Gemini API, configurable), labeled fixture mode when keys are missing.

### Build units (all 13 done in a first version on 2026-10-08)

1. Scaffold Next.js app, tooling, `.env.example`
2. Domain core: graph validation, mastery heuristic, display state, adaptation rules (+ tests)
3. Gemma adapter, prompt templates, Zod schemas, fixture mode
4. Resource retrieval (Tavily) + curated catalog
5. Database: SQL migrations, RLS, atomic commit RPC
6. Auth (Supabase) + protected routes
7. Onboarding + two-batch diagnostic
8. Course setup: graph, sources, first lesson
9. Skill map (React Flow + mobile list)
10. Lesson workspace, practice, contextual tutor
11. Gap detection, targeted checks, remediation, "Your path changed"
12. Dashboard, resources, settings, developer status
13. Seed demo, tests, walkthrough, README

## Key Rules (summary of AGENTS.md)

- README must stay accurate to what is actually built; no fabricated features, metrics, or history.
- README must cover: pitch, team, problem + why chosen, solution, innovation, technical implementation, hackathon work, open source & AI usage, setup, challenges & learnings, credits & license.
- No organizer-only info (judging, volunteers, rooms) in the README.
- Document every AI model / open-source library used, its role, and its license.
- Secrets only via environment variables; list them in `.env.example`; never commit `.env`.
- Prefer simple solutions, few dependencies, focused commits.
- Verify (run/test) before claiming something works.

## Decisions Log

| Date       | Decision |
| ---------- | -------- |
| 2026-10-08 | Team details added to README. Only names, roles, and college are published; college and personal emails from the team sheet are intentionally left out of the repo for privacy. |
| 2026-10-08 | Project chosen: SkillForge adaptive learning app (renamed Cognify later the same day). Build brief stored at `docs/Project-Deliverables.txt`; work proceeds in the 13 units listed above. |
| 2026-10-08 | Added a "Challenges and Learnings" section to the README, since AGENTS.md requires it and the template lacked it. |
| 2026-10-08 | Stack: Next.js 16.4 (App Router, `proxy.ts` instead of middleware), React 19, Tailwind 4, React Flow 12, Recharts 3, Zod 4, Vitest. |
| 2026-10-08 | All privileged writes (graph, grades, mastery, adaptation) go through one service-role-only `sf_commit` RPC with ownership, optimistic graph version and idempotency-key checks. Learners write only their own learner-authored rows; `question_keys` is unreadable from the browser. |
| 2026-10-08 | Without Supabase env vars the app uses a labeled local JSON store (`.data/`); without a Gemini key it uses labeled fixture content; without Tavily it uses the curated catalog. |
| 2026-10-08 | Mastery heuristic: hint ×0.7; first answer sets m, then m = 0.7m + 0.3r; mastered ≥0.8 with ≥3 answers and ≥2 correct without hints; ready ≥0.65 with ≥2 answers or learner override. Gap check after 2 low answers blaming the same skill; remediation if check mean <0.6; follow-up passes at ≥0.8. |
| 2026-10-08 | Live Gemma quirks: code fences inside JSON strings, options referenced by text/letter, quoted numbers. Handled in `extractJson` and `normaliseQuestion`; invalid distractor tags are dropped instead of failing generation. |
| 2026-10-08 | Seed script is `scripts/seed-demo.mts` (`.mts` because tsx emits CJS for `.ts`, which breaks top-level await). It uses fixture content on purpose so demos are repeatable. |
| 2026-10-08 | Renamed SkillForge to Cognify. Env vars are now `COGNIFY_*`; `src/lib/env.ts` still reads the old `SKILLFORGE_*` names as a fallback. The migration file is now `20261008000000_cognify.sql` (same SQL, so projects that ran the old file need nothing). |

## Open Items

- [x] Problem and product chosen: Cognify (see `docs/Project-Deliverables.txt`)
- [x] Stack chosen: Next.js, TypeScript, Tailwind, Supabase, React Flow, Recharts, Zod, Gemma 4
- [x] `.env.example` lists every variable
- [ ] Apply the migration to the team's Supabase project and run `docs/auth-checklist.md` (not reachable from the cloud build container)
- [ ] Try Tavily live search with a real key
- [ ] Deploy, record the demo video, add the Devpost link
- [ ] Assign member contributions (README still says "Planned")
- [ ] Choose a license
