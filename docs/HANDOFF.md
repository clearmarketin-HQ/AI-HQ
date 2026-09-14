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
- **Telegram capture.** Voice (Whisper transcription) and text → Claude
  classification → `raw_captures` → `tasks` (when applicable) →
  `audit_log`, with a confirmation reply and an inline urgency-override
  keyboard. Transcription failures degrade gracefully instead of vanishing.
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

### 3. Waiting on input: GoHighLevel CRM structure

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

## Suggested next steps, in order

1. **Get the Vercel env vars set** and confirm a deploy goes green. Until
   this happens, nothing can be verified for real.
2. **Check the real schema into `supabase/migrations/`** and reconcile
   `ARCHITECTURE.md` against it — including settling the
   `operators.email` question. Everything else is built on guesses until
   this is done.
3. **Wire the first card to real data** (Operators or Session is easiest),
   establishing the API-route pattern the other seven will copy, and decide
   how org filtering works while you're there.
4. Then follow `ROADMAP.md` in order.

## Open question from the last session

The dashboard mockup was published as a Claude Artifact, and there was an
unresolved question about how to share it externally (the declared
`downloads` capability restricts it to the user's Claude org — the options
were dropping that capability or exporting a PNG/PDF). The mockup's content
is fully captured in `DASHBOARD.md` and in the ported components, so nothing
is lost if that's never resolved.
