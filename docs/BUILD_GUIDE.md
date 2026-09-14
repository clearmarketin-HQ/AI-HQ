# The Build Guide (and where we diverge from it)

AI HQ is being built by following **"Personal OS — Build Cheat Sheet"** by
Miles Deutscher / AI Edge. The full PDF is committed at
[`docs/source/Personal-OS-Build-Cheat-Sheet.pdf`](./source/Personal-OS-Build-Cheat-Sheet.pdf)
— read it directly for the copy-paste prompt blocks.

**Read this doc before starting work.** The guide describes a *single-user
personal* OS. AI HQ is a *multi-business, multi-operator* one. The
architecture is the same; several specifics are deliberately different. If
you follow a guide prompt verbatim without reading the divergence table
below, you will build the wrong thing.

## The guide's nine parts, and where we are

| Part | Topic | AI HQ status |
|---|---|---|
| 1 | Decide your stack | ✅ Done — took the guide's defaults (Next.js 15, Supabase, Claude, Vercel, Telegram) |
| 2 | Design the dashboard first | ✅ Done — Claude Design mockup, since ported |
| 3 | Foundation (Next.js + DB + auth) | ⚠️ Partial — app + auth done; **no migrations in repo** |
| 4 | Capture pipeline (voice → AI → DB) | ⚠️ Mostly — Telegram + web capture work; **no embedding step** |
| 5 | The seven cards | ⚠️ Shells only — all 8 cards render placeholder data, none read the DB |
| 6 | Memory / brain layer | ❌ Not started — no `memory_chunks`, no pgvector, no `/api/memory/search` |
| 7 | Deployment + cron + privacy | ⚠️ Deploys to Vercel; **env vars unset** (see DEPLOYMENT.md); no cron |
| 8 | Common bugs | 📖 Reference — see "Bugs to avoid" below |
| 9 | Going further | ❌ Not started |

## Divergences from the guide — deliberate

These are **intentional**. Don't "fix" them back toward the guide.

| Guide says | AI HQ does | Why |
|---|---|---|
| Single user, `USER_ID = "miles"` static string | Multi-operator, multi-org | It's a holding company with 7 businesses and 2+ operators. This is the guide's own Part 9 "Multiple users" endgame, adopted up front. |
| Single-password HMAC cookie auth (`AUTH_SECRET`, `DASHBOARD_PASSWORD`) | Supabase Auth email/password, cookie sessions, RLS | Follows from multi-user. The guide itself says to generalise to `auth.uid()` when going multi-user. |
| `entities` table (people/companies you reference) | `orgs` + `org_members` + `operators` | Businesses are first-class, not generic entities. Captures route to a *business*. |
| Classifier returns `entity_id` | Classifier returns `org_slug` (then DB-resolved to a real `org_id`) | Same anti-hallucination pattern the guide's Part 8 bug #3 warns about, applied to orgs. |
| `lib/router/classifyCapture.ts` | `lib/telegram/classify.ts`, exporting `classifyCapture` | Naming only. Shared by both capture surfaces despite the `telegram/` path. |
| Tabs: Home, CRM, Brain, Finance, **Journal, Health** | Home, CRM, Brain, Finance, **Marketing, Calendar** | Business ops, not personal health. |
| Cards: Operator, Finance Pulse, Key Blockers, Session, **Habit Tracker**, Priorities, **Nutrition** | Operators, FinancePulse, KeyBlockers, Session, **Pipeline**, Priorities, **Calendar**, **MarketingPulse** (8) | Same shape, business-flavoured. No habits/nutrition; added sales Pipeline + MarketingPulse. |
| `TELEGRAM_USER_ID` env gate (bot listens only to you) | `operators` table lookup by `telegram_id` | Multiple operators need to use the same bot. |
| Claude primary → OpenAI fallback → regex last resort | Claude (`claude-haiku-4-5`) only; no fallback chain | Simpler for now. **This is a real gap** — see ROADMAP.md. |
| `daily_logs` (habits/nutrition/goals/finance JSON) | Not built | Those cards don't exist here. Finance snapshots will need an equivalent. |

## Divergences that are just *behind* — not decisions

These are guide steps we haven't done yet and probably should. They're
tracked in [`ROADMAP.md`](./ROADMAP.md):

- **No `supabase/migrations/`** (guide Part 3 Step 3). The schema lives only
  in the live Supabase project. This is the single biggest structural gap —
  `ARCHITECTURE.md`'s schema section is reverse-engineered from queries.
- **No memory layer** (Part 6): no `memory_chunks` table, no embeddings, no
  `/api/memory/search`, no Brain tab behind the Brain nav tab. The capture
  pipeline's step 7 ("embed the text → `memory_chunks`") is simply absent.
  Note the guide's own "when to skip memory" advice: plain SQL covers ~80%
  until you're querying a year of data.
- **Cards read no data** (Part 5). Every card is a placeholder shell.
- **No Vercel cron / `CRON_SECRET`** (Part 7), so no daily snapshots.
- **No demo mode** (Appendix A17) — worth having before showing this to
  anyone outside the company.
- **No `/api/admin/export` backup endpoint** (Part 7 Step 5).

## Bugs to avoid (guide Part 8)

Each of these cost the guide's author hours. Relevant ones for us, with our
status:

1. **`o.BigInt is not a function` on Vercel** — caused by `node-ical`,
   `rrule`, or other Node-native libs the Next.js bundler mangles. Use
   `ical.js` instead. *Relevant when the Calendar card gets wired to a real
   feed.*
2. **Day rolls over at midnight UTC, not the user's midnight** — write a
   `localDateKey()` helper and use it everywhere you ask "what day is it".
   *We have no date-anchored storage yet; `TopRailClock` already uses the
   client clock.*
3. **Silent POST failures** — empty `.catch(() => {})` handlers hiding 500s,
   and `NOT NULL` columns missing from INSERTs. *Always surface errors.
   This is exactly the class of bug that silently dropped Telegram voice
   captures when the OpenAI quota ran out.*
4. **Race: mount-time GET clobbers a fresh local edit** — use a `dirtyRef`.
   *Relevant as soon as cards become interactive.*
5. **Stale Supabase reads** (PostgREST edge cache serving stale bulk
   SELECTs) — bust with a unique `.limit()` per request. *Relevant once
   cards read real data.*
6. **AI extracts the wrong number** (double-counting across sheet tabs) — be
   explicit in the prompt; give the model a `notes` field to flag ambiguity.
   *Relevant when Finance Pulse gets real.*
7. **Client crashes on first render** — TS's `!` lying across an async
   boundary. Add an explicit loading branch before the data branch.

## Env vars: the guide's full list vs. ours

We currently use 7 of the guide's ~19 (see [`DEPLOYMENT.md`](./DEPLOYMENT.md)
for ours). The ones we'll need as more parts get built:

`ANTHROPIC_MODEL`, `OPENAI_CLASSIFIER_MODEL` (fallback classifier),
`GOOGLE_CALENDAR_ICAL_URL` (Calendar card), `GOOGLE_SHEETS_FINANCE_ID` +
`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_KEY` (Finance
Pulse — use a service account, **never** Google's "publish to web"),
`CRON_SECRET` (Vercel cron), `USER_TIMEZONE` (day-rollover helpers).

We do **not** need `AUTH_SECRET`, `DASHBOARD_PASSWORD`, `TELEGRAM_USER_ID`,
or `USER_ID` — superseded by Supabase Auth and the `operators`/`orgs`
tables.
