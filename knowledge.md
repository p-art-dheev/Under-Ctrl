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

- `README.md` — primary submission document (template provided by organizers; fill in sections as the project takes shape).
- `AGENTS.md` — rules for coding agents and contributors (`CLAUDE.md` just imports it).
- `knowledge.md` — this file.
- `.gitignore` — keeps `.env` and build/dependency output out of git.

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
| 2026-10-08 | Added a "Challenges and Learnings" section to the README, since AGENTS.md requires it and the template lacked it. |

## Open Items

- [ ] Decide the problem statement and project pitch
- [ ] Choose tech stack and open-source AI model(s)
- [ ] Assign member contributions
- [ ] Add `.env.example` once environment variables exist
- [ ] Choose a license
