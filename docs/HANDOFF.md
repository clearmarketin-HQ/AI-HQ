# Handoff

**As of:** 2026-09-14 · `main` @ the commit that added this file.

Written for whoever (or whatever) picks this up next. Everything here is
current state, not history.

## What AI HQ is

A multi-business operator dashboard for a holding company running seven
businesses (see [`BUSINESSES.md`](./BUSINESSES.md)). An operator captures a
thought — voice or text, via Telegram or the dashboard's floating capture
box — and Claude classifies it into a task/note/decision, routes it to the
right business, and stores it. The dashboard surfaces it back.

It follows the *Personal OS Build Cheat Sheet*
([`source/`](./source/)), adapted from single-user to multi-business. **Read
[`BUILD_GUIDE.md`](./BUILD_GUIDE.md) before acting on any prompt from that
PDF** — several divergences are deliberate.

## What works today

- **Auth.** Supabase email/password, cookie sessions, middleware redirect
  gate. `/api/` routes are excluded from the gate and check auth themselves.
- **Telegram capture.** Voice (Whisper transcription) and text →
  classification → `raw_captures` → `tasks` (when applicable) →
  `audit_log`, with a confirmation reply and an inline urgency-override
  keyboard. Transcription failures degrade gracefully instead of vanishing.
- **Classifier fallback chain.** Claude (`claude-haiku-4-5`) → OpenAI
  (`OPENAI_CLASSIFIER_MODEL`) → regex, with the tier that produced the
  result recorded on `raw_captures.llm_source`. The regex tier never
  throws, so a provider outage degrades a capture instead of dropping it,
  and both surfaces tell the operator when that happened. See
  [`CAPTURE_PIPELINE.md`](./CAPTURE_PIPELINE.md).
- **Web capture.** The floating `CaptureBox` POSTs to `/api/capture`, which
  runs the same pipeline against the logged-in operator. Toast on success.
- **Dashboard shell.** Top rail (brand, org switcher, tabs, live clock,
  avatar, sign-out) + 3-column grid + 8 cards, all styled from the oklch
  token set in `app/globals.css`.
- **Org switcher.** Real orgs from Supabase (RLS-scoped), with a synthetic
  "All Businesses" entry first and selected by default on login.

## What does *not* work / isn't built

- **Every dashboard card shows hardcoded placeholder data.** Nothing on the
  home page reflects real database state. This is the most misleading thing
  about the app right now — it looks finished and isn't.
- **The org switcher filters nothing.** Selecting a business changes no data.
- **Five of six nav tabs go nowhere** (only Home is a real page).
- **No memory/brain layer**, no cron, no demo mode, no backup endpoint.
- **No SQL migrations in the repo.** The schema lives only in Supabase.

Full list with priorities: [`ROADMAP.md`](./ROADMAP.md).

## Live blockers

### 1. Vercel deploys are failing (needs dashboard access)

Every deployment since the Telegram webhook landed has failed because the
Vercel project (`ai-hq`, team `cmhq`) doesn't have the seven required env
vars set for Preview/Production. **This is a Vercel dashboard configuration
gap, not a code bug** — `next build` passes locally with dummy values.

Fix: Vercel → Project Settings → Environment Variables → add all seven from
[`DEPLOYMENT.md`](./DEPLOYMENT.md) → redeploy. Nobody working only in this
repo can resolve it; don't try to fix it with code, an empty commit, or a
PR close/reopen.

Consequence: **nothing has been verified in a deployed environment.** All
verification so far is local typecheck + build. The capture pipeline has
never been exercised end-to-end against a real deployment by this session.

### 2. `operators.email` is an unverified assumption

`app/api/capture/route.ts` matches the logged-in user to an operator row via
`operators.email === user.email`. That column's existence was assumed, not
confirmed — there's no migration to check against. If web capture 500s in
production, check this first.

### 3. Agent sessions can't reach Supabase or Telegram

Verified 2026-09-14. No credentials are supplied to the environment, *and*
the network policy returns `403 to CONNECT` for `supabase.com:443` and
`api.telegram.org:443` — so pasting keys into a session wouldn't help on its
own. This is why Phases 0 and 1 of [`BUILD_PLAN.md`](./BUILD_PLAN.md) are
human tasks; see the reachability note there for how to change it, and for
the schema-dump path that needs no connectivity at all.

### 4. Waiting on input: GoHighLevel CRM structure

Client/project-scoped classification is designed but unbuildable until the
GoHighLevel account/client/project structure is provided. See `ROADMAP.md`
item 9.

## How work gets done here

- **Branch:** all work goes on `claude/nextjs-supabase-setup-k2gm8l` (a fixed
  branch name), PR'd against `main`, squash-merged.
- **After a PR merges,** reset the branch from `origin/main`
  (`git checkout -B claude/nextjs-supabase-setup-k2gm8l origin/main`) before
  starting the next piece. Don't stack new commits on already-merged history
  — GitHub reports false merge conflicts when you do.
- **If a PR on that branch is still open,** add commits to it instead of
  resetting.
- **Before every push:** `npx tsc --noEmit` and a `next build` with dummy env
  vars (command in [`DEPLOYMENT.md`](./DEPLOYMENT.md)). Both must be clean.
- **Hard rule:** Anthropic calls go through `@anthropic-ai/sdk`, never raw
  `fetch`.

## Next steps

Follow **[`BUILD_PLAN.md`](./BUILD_PLAN.md)** — the phased plan to finish
the buildout. In short:

**Phase 4 (classifier fallback chain) is done** — it was the one phase
that needed neither deployed infrastructure nor a human decision. What
remains:

1. **Phase 0 — get the Vercel env vars set** and prove one capture
   end-to-end in production. Not a coding task, and nothing can be verified
   for real until it's done. This is also where **tier 2 of the fallback
   chain gets its first real test** — the OpenAI request shape has never
   received a live response, because agent sessions can't reach
   `api.openai.com` either.
2. **Phase 1 — check the real schema into `supabase/migrations/`**,
   settling the `operators.email` question. Everything after this is built
   on guesses until it exists.
3. **Phase 2 — wire the first card to real data**, establishing the pattern
   and the org-filtering contract the other seven copy.

The four decisions the plan was waiting on (Pipeline's data source,
MarketingPulse's data source, selected-org transport, and the Brain tab)
were settled on 2026-09-14 and are recorded at the bottom of
[`BUILD_PLAN.md`](./BUILD_PLAN.md). One of them added a blocker:
MarketingPulse is to use a real ads API, which needs ad account access and
credentials before it can be built.

`ROADMAP.md` has the same gaps as a flat priority list if you want the
inventory rather than the sequence.

## Open question from the last session

The dashboard mockup was published as a Claude Artifact, and there was an
unresolved question about how to share it externally (the declared
`downloads` capability restricts it to the user's Claude org — the options
were dropping that capability or exporting a PNG/PDF). The mockup's content
is fully captured in `DASHBOARD.md` and in the ported components, so nothing
is lost if that's never resolved.
