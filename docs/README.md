# AI HQ — Docs

This folder is the onboarding path for anyone (human or agent) picking up work
on AI HQ.

AI HQ is a multi-business operator dashboard for a holding company running
seven businesses. An operator captures a thought — by voice or text, over
Telegram or the web dashboard — and the system classifies it with Claude,
files it as a task/note/decision against the right business, and surfaces it
back on the dashboard.

## Start here

1. **[`HANDOFF.md`](./HANDOFF.md)** — current state, what's in flight, what's
   blocked. Read this first if you're picking up the work.
2. **[`BUILD_PLAN.md`](./BUILD_PLAN.md)** — the sequenced plan to finish the
   buildout, phase by phase, with what gates what.
3. **[`BUILD_GUIDE.md`](./BUILD_GUIDE.md)** — the guide this project follows
   (the *Personal OS Build Cheat Sheet*, committed at
   [`source/`](./source/)), which of its nine parts are done, and — critically
   — **where AI HQ deliberately diverges from it**. Read before following any
   prompt out of the PDF.
4. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — tech stack, directory map, and
   the (inferred, unmigrated) database schema.

## Reference

- [`CAPTURE_PIPELINE.md`](./CAPTURE_PIPELINE.md) — how a voice note or text
  message becomes a classified, routed record, for both the Telegram bot and
  the web capture box.
- [`DASHBOARD.md`](./DASHBOARD.md) — the dashboard UI: layout, components,
  org switcher, and what's still placeholder data vs. real.
- [`BUSINESSES.md`](./BUSINESSES.md) — the seven businesses the system
  operates across, and how they're identified in code.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — required environment variables, the
  Vercel setup, and a standing deployment issue every contributor should know
  about before assuming their PR broke something.
- [`ROADMAP.md`](./ROADMAP.md) — known gaps and explicitly deferred work.
- [`source/`](./source/) — the original source material this build follows.

## Conventions worth knowing before you push

- This repo has no SQL migrations checked in — the schema in
  `ARCHITECTURE.md` is inferred from the queries in code, not from a source
  of truth in the repo. If you change a table shape, update that section in
  the same PR. (Adding real migrations is the top structural gap — see
  `ROADMAP.md`.)
- The Anthropic/Claude API is called only through `@anthropic-ai/sdk` (see
  `lib/telegram/classify.ts`), never raw `fetch` — that's a hard rule for
  this codebase. OpenAI Whisper is the one exception (a different provider,
  called via `fetch` in `lib/telegram/transcribe.ts`).
- `classifyCapture` never trusts the AI's returned org slug directly — every
  caller re-resolves it against orgs freshly fetched from the DB before
  writing anything. Keep that pattern if you touch the classification path.
- Never swallow an error in a `.catch(() => {})`. A silently-dropped error is
  what made voice captures disappear when the OpenAI quota ran out — and it's
  bug #3 in the build guide's own list.
