# AI HQ — Docs

This folder is the onboarding path for anyone (human or agent) picking up work
on AI HQ. Read `ARCHITECTURE.md` first, then whichever of the others matches
what you're touching.

AI HQ is a multi-business operator dashboard for a holding company running
seven businesses. An operator captures a thought — by voice or text, over
Telegram or the web dashboard — and the system classifies it with Claude,
files it as a task/note/decision against the right business, and surfaces it
back on the dashboard.

## Contents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — tech stack, directory map, and the
  (inferred, not formally migrated) database schema.
- [`BUSINESSES.md`](./BUSINESSES.md) — the seven businesses the system
  operates across, and how they're identified in code.
- [`CAPTURE_PIPELINE.md`](./CAPTURE_PIPELINE.md) — how a voice note or text
  message becomes a classified, routed record, for both the Telegram bot and
  the web capture box.
- [`DASHBOARD.md`](./DASHBOARD.md) — the dashboard UI: layout, components,
  org switcher, and what's still placeholder data vs. real.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — required environment variables, the
  Vercel setup, and a standing deployment issue every contributor should know
  about before assuming their PR broke something.
- [`ROADMAP.md`](./ROADMAP.md) — known gaps and explicitly deferred work,
  including the planned GoHighLevel CRM integration.

## Conventions worth knowing before you push

- This repo has no SQL migrations checked in — the schema below is inferred
  from the queries in code, not from a source of truth in the repo. If you
  change a table shape, update `ARCHITECTURE.md`'s schema section in the same
  PR.
- The Anthropic/Claude API is called only through `@anthropic-ai/sdk` (see
  `lib/telegram/classify.ts`), never raw `fetch` — that's a hard rule for
  this codebase. OpenAI Whisper is the one exception (a different provider,
  called via `fetch` in `lib/telegram/transcribe.ts`).
- `classifyCapture` never trusts the AI's returned org slug directly — every
  caller re-resolves it against orgs freshly fetched from the DB before
  writing anything. Keep that pattern if you touch the classification path.
