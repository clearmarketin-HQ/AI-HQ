# Roadmap / Known Gaps

Things that are explicitly deferred, unverified, or open work — not bugs,
but worth knowing before you assume a piece is finished. Cross-referenced to
the build guide's parts (see [`BUILD_GUIDE.md`](./BUILD_GUIDE.md)).

Rough priority order:

## 1. Check the schema into the repo (guide Part 3, Step 3)

**The biggest structural gap.** There are no migrations in this repo — the
Supabase schema exists only in the live project. `ARCHITECTURE.md`'s schema
section is reverse-engineered from the columns our queries touch, which
means it can silently drift from reality.

Add a `supabase/migrations/0001_init.sql` capturing the real current schema
(`orgs`, `org_members`, `operators`, `raw_captures`, `tasks`, `audit_log`),
with RLS policies, and move to migration-based changes from there. Until
this exists, every other item below is built on guesswork.

## 2. Verify the `operators.email` lookup

`app/api/capture/route.ts` looks up the operator via
`operators.email === user.email` (the logged-in Supabase Auth user's email).
This was a reasonable assumption made without access to the real table
schema. Confirm it, and if the actual link between a Supabase Auth user and
an `operators` row is different (e.g. a dedicated `auth_user_id` column),
fix both the code and `ARCHITECTURE.md`. Folds naturally into item 1.

## 3. Wire the dashboard cards to real data (guide Part 5)

Every card in `components/dashboard/` renders hardcoded constants. None
query Supabase. Each needs an API route and a real read. Suggested order
(easiest first, per the guide): Operators → Session → Priorities →
KeyBlockers → Pipeline → Calendar → MarketingPulse → FinancePulse.

Two things to decide while doing this:
- **Org filtering.** The switcher's selection (including the synthetic
  "All Businesses" / `ALL_ORGS_ID`) currently filters nothing. Cards should
  respect it, with "All Businesses" aggregating across orgs.
- **Never trigger AI on page load.** The guide is emphatic about this for
  Finance Pulse: page loads read the last stored snapshot; only an explicit
  refresh or a cron triggers the expensive AI pipeline. Otherwise every page
  view burns API budget.

Watch for guide bug #5 (stale PostgREST reads) and #7 (client crash from a
`!` assertion across an async boundary) as these land.

## 4. Classifier fallback chain (guide Part 4) — ✅ done

`classifyCapture` now runs Claude (`claude-haiku-4-5`) → OpenAI
(`OPENAI_CLASSIFIER_MODEL`) → regex, recording which tier produced the
result on `raw_captures.llm_source`. The regex tier never throws, so an
Anthropic outage or exhausted quota degrades a capture instead of dropping
it, and both surfaces tell the operator when that happened. Credential
reads were also moved off module scope, where a missing key took down the
entire webhook on import. See [`CAPTURE_PIPELINE.md`](./CAPTURE_PIPELINE.md).

Not yet verified against the live OpenAI API — tier 2's request shape is
typechecked and exercised, but this environment blocks `api.openai.com`, so
a real tier-2 success is unproven until it runs in a deployment.

## 4b. Failed voice notes are dropped, not stored — ⚠️ live

**Observed 2026-09-14 in production**, while the OpenAI account was out of
credit. When transcription fails, the webhook warns the operator and
returns **without writing anything** — no `raw_captures` row, no reference
to the audio. The thought is gone unless the operator retypes it.

The reply now distinguishes an account problem from a transient blip, so it
no longer tells someone to retry into a failure that retrying can't clear
(`TranscriptionError.needsAttention`). But the capture is still lost.

The fix is to persist the capture *before* transcription — a `raw_captures`
row holding Telegram's `file_id`, marked as awaiting transcription, so it
can be re-run once credit is restored. That needs a write whose column
nullability isn't verifiable yet, so **it's gated on Phase 1** rather than
guessed at. Do it as the first thing after the schema lands.

Telegram retains the audio, so nothing is unrecoverable *today* — but only
for as long as the sender can still find the message.

## 5. Memory / brain layer (guide Part 6)

Not started. No `memory_chunks` table, no pgvector, no embedding step in the
capture pipeline, no `/api/memory/search`, and the "Brain" nav tab leads
nowhere. This is what would let an operator ask "what did I say about the
Riverside contract in March" and get a real answer.

The guide's own advice: skip it until you're querying a *year* of data
rather than a week — plain SQL covers ~80% of usage before that. So this is
correctly deferred, not forgotten.

## 6. Nav tabs are visual-only

`TopRail`'s tabs (Home, CRM, Brain, Finance, Marketing, Calendar) render but
only "Home" is a real page. The other five need routes. CRM is the big one
(guide 5.4: four urgency tiers, Kanban/Smart/Category views, drag-drop
reorder, click-to-edit drawer).

## 7. Cron + snapshots (guide Part 7)

No `vercel.json`, no cron, no `CRON_SECRET`. Needed for Finance Pulse daily
snapshots and, later, a morning briefing pushed to Telegram (guide Part 9).

## 8. Demo mode (guide Appendix A17)

A toggle that swaps every card to fake-but-realistic data from a
`lib/demoData.ts` factory, fully isolated from the real DB. Worth having
before this is ever demoed or screen-shared outside the company.

## 9. Client/project-scoped classification (GoHighLevel CRM)

Planned, not started, and waiting on input. Once client/project data from
the GoHighLevel CRM is available, `classifyCapture` should resolve a capture
to a specific client or project *within* a business (e.g. "the Elm St job" →
OpenForge Construction → that project), not just the business. This needs:

- A way to pull client/project records from GoHighLevel into Supabase (or
  query it live) — not designed yet.
- Passing that list into `classifyCapture` alongside the orgs, and extending
  `Classification` with a resolved client/project id — nullable, and
  DB-revalidated exactly the way `org_slug` is today. Never trust a
  model-returned id.
- Surfacing client/project context on the cards.

**Blocked on:** the GoHighLevel account structure, which the user said they'd
provide.

## 10. Backup endpoint (guide Part 7, Step 5)

An `/api/admin/export` returning a JSON snapshot of every table, hittable
from a cron or a button. Supabase's free tier auto-backs up daily, so this
is belt-and-suspenders.

## Standing Vercel deployment issue

Not a roadmap item so much as a live blocker — see
[`DEPLOYMENT.md`](./DEPLOYMENT.md). The env vars aren't set in the Vercel
project, so every deploy fails. It needs someone with Vercel dashboard
access; it can't be fixed from the codebase.
