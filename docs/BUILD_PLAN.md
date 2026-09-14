# Build Plan — finishing AI HQ

**Written:** 2026-09-14. Starting point: the capture bot works (Telegram +
web); everything downstream of it is a shell.

This is the sequenced plan to take AI HQ from "capture works, dashboard is
a mockup" to "finished system." Read [`HANDOFF.md`](./HANDOFF.md) for
current state and [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) for how this maps to
the source guide before starting.

## The shape of the problem

Capture is done — thoughts reliably become rows. What's missing is
**everything that reads those rows back**. All 8 dashboard cards render
hardcoded constants; the org switcher filters nothing; 5 of 6 nav tabs are
dead links.

Two things gate all of that work, and neither is a feature:

1. **Nothing has ever been verified in a deployed environment** (Vercel env
   vars unset → every deploy fails).
2. **The database schema isn't in the repo**, so every query written against
   it is a guess.

Do those first, in that order. Phases 2+ are wasted effort until they're
done.

---

## Phase 0 — Unblock · *not a coding task*

**Goal:** a green deploy and one capture proven end-to-end in production.

- [ ] Set the 7 env vars in Vercel → Project Settings → Environment
      Variables, for **Preview and Production** (list in
      [`DEPLOYMENT.md`](./DEPLOYMENT.md)). Needs someone with dashboard
      access to the `ai-hq` project under team `cmhq`.
- [ ] Redeploy; confirm the `Vercel` check goes green on `main`.
- [ ] Confirm the Telegram webhook points at the live URL:
      ```
      curl -F "url=https://<live-domain>/api/telegram/webhook" \
           -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
           "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
      ```
- [ ] Send a real voice note and a real text from Telegram. Confirm a
      `raw_captures` row, a `tasks` row, and an `audit_log` row land, with
      the correct `org_id` resolved.
- [ ] Log in to the deployed dashboard, submit via the web capture box,
      confirm the same. **This is the first real test of the
      `operators.email` lookup** — if web capture 500s, that's Phase 1's
      problem and you've just found it early.

**Done when:** a capture sent from a phone shows up in Supabase, from the
deployed app, with no manual intervention.

---

## Phase 1 — Ground truth: get the schema into the repo

**Goal:** stop guessing. Everything after this depends on knowing the real
table shapes.

- [ ] Dump the live schema from Supabase (SQL editor, or
      `supabase db dump`) and commit it as
      `supabase/migrations/0001_init.sql` — tables, constraints, indexes,
      and RLS policies as they actually exist.
- [ ] **Settle the `operators` ↔ auth-user link.** `app/api/capture/route.ts`
      assumes `operators.email === user.email`. Confirm or correct it. If
      the real link is a different column (e.g. `auth_user_id`), fix the
      route and note it.
- [ ] Reconcile the "Database schema" section of
      [`ARCHITECTURE.md`](./ARCHITECTURE.md) against reality and delete the
      "inferred" caveats once it's true.
- [ ] Adopt the Supabase CLI for future changes so schema edits arrive as
      reviewable migrations, not dashboard clicks.

**Done when:** a new contributor can read the migration instead of
reverse-engineering queries, and `ARCHITECTURE.md` is verified rather than
inferred.

---

## Phase 2 — Data layer + the first real card

**Goal:** establish the pattern the other seven cards copy. Don't build
eight bespoke data paths.

- [ ] Create `lib/data/` with server-side, org-scoped query helpers
      (`getOperators`, `getOpenTasks`, etc.), each taking the selected org
      and returning typed rows.
- [ ] **Decide the org-filtering contract once, here.** Proposal:
      `ALL_ORGS_ID` (`"__all__"`) → no `org_id` filter (aggregate across
      every org the user can see); a real id → `.eq("org_id", id)`. Write
      it down in `ARCHITECTURE.md`.
- [ ] Decide how the selected org reaches the server. `OrgContext` is
      client-side today; either lift selection into a URL search param
      (simplest, shareable, server-readable) or fetch from client
      components. **Pick one and apply it uniformly** — this decision is
      load-bearing for all eight cards.
- [ ] Wire **Operators** and **Session** first (guide's own "easiest first"
      ordering). Session = today's key tasks, ranked.

Watch for, from the guide's bug list:
- **#7** — add an explicit loading branch *before* the data branch. Don't
  trust `!` across an async boundary.
- **#5** — PostgREST's edge cache serves stale bulk SELECTs; bust it with a
  unique `.limit()` per request if you see a write not reflected on refresh.

**Done when:** switching the org switcher visibly changes what two cards
show, using real data.

---

## Phase 3 — The remaining six cards

Each follows Phase 2's pattern. Roughly increasing difficulty:

- [ ] **Priorities** — ranked open tasks.
- [ ] **KeyBlockers** — tasks flagged `key`, or overdue, across orgs.
- [ ] **Pipeline** — needs a deals/opportunities concept that doesn't exist
      yet. Either model it in Supabase or source it from GoHighLevel
      (Phase 8). **Decide before building** — don't invent a schema the CRM
      integration will contradict.
- [ ] **Calendar** — Google Calendar via the secret iCal URL
      (`GOOGLE_CALENDAR_ICAL_URL`, no OAuth needed).
      ⚠️ **Use `ical.js`, not `node-ical`** — guide bug #1: `node-ical` and
      `rrule` break on Vercel with `o.BigInt is not a function`. Works
      locally, fails in production. Expand recurrences with
      `event.iterator()`.
- [ ] **MarketingPulse** — needs an ad-spend source (manual entry, or an ads
      API). Decide the source first.
- [ ] **FinancePulse** — the AI showpiece. Google Sheets via a **service
      account**, never "publish to web." Drive API → XLSX → `exceljs` →
      Claude extraction → snapshot stored in Supabase.
      ⚠️ **Page loads must NEVER trigger the AI call.** Reads come from the
      stored snapshot; only an explicit refresh or the cron re-extracts.
      Otherwise every page view burns API budget.
      ⚠️ Guide bug #6: tell the model to avoid double-counting summary tabs
      against per-category tabs, and give it a `notes` field to flag
      ambiguity.

**Done when:** the home dashboard contains zero hardcoded placeholder data.

---

## Phase 4 — Harden the capture path

**Goal:** the front door shouldn't have a single point of failure. It
already failed once — silently — when the OpenAI quota ran out.

- [ ] Add the fallback chain to `classifyCapture`: Claude
      (`claude-haiku-4-5`) → OpenAI (`OPENAI_CLASSIFIER_MODEL`) → regex
      last resort. Today an Anthropic outage drops captures entirely.
- [ ] Keep the DB-revalidation of `org_slug` in every path — never trust a
      model-returned identifier, whichever model returned it.
- [ ] Audit for swallowed errors (`.catch(() => {})`) across the capture
      path — guide bug #3.

**Done when:** killing the Anthropic key in a local run still files the
capture, degraded but not lost.

---

## Phase 5 — Make the nav tabs real

Five of six tabs currently go nowhere.

- [ ] **CRM** — the big one. Four urgency tiers (Today / This Week / This
      Month / Someday); three views (Kanban with drag-drop persisting
      `priority_score`, Smart with Claude-interpreted natural-language
      search, Category grouped by org); click-to-edit side drawer; view
      selection persisted to `localStorage`.
      API: `GET/POST/PATCH/DELETE /api/tasks`, `POST /api/tasks/smart`.
      ⚠️ Guide bug #4: a mount-time GET resolving *after* the user's first
      edit wipes it. Use a `dirtyRef`.
- [ ] **Finance**, **Marketing**, **Calendar** — fuller pages behind the
      corresponding cards.
- [ ] **Brain** — depends on Phase 6; leave the tab inert until then rather
      than shipping a dead search box.

---

## Phase 6 — Memory / brain layer

The guide's own advice is to defer this until you're querying a *year* of
data, not a week — plain SQL covers ~80% until then. So this is correctly
last among the features.

- [ ] Enable `pgvector`; add `memory_chunks` (`source_type`, `source_id`,
      `text`, `embedding vector(1536)`) with an ivfflat index on
      `vector_cosine_ops`.
- [ ] Add the embedding step to the capture pipeline (OpenAI
      `text-embedding-3-small`) — the step our pipeline is missing versus
      the guide's.
- [ ] `POST /api/memory/search` — embed query, nearest 20 by cosine
      distance, join source rows.
- [ ] Brain tab as a search surface over it.
- [ ] `/ask` — question + top-20 chunks → Claude, answering *only* from
      provided context, citing capture IDs, streamed back.

**Done when:** "what did we say about the Riverside contract in March"
returns the actual capture.

---

## Phase 7 — Operations

- [ ] `vercel.json` cron + `CRON_SECRET` → daily FinancePulse snapshot
      (verify the `Authorization: Bearer` header in the route).
- [ ] **Morning briefing** — 7am Telegram message: today's calendar, top
      priorities, blockers, finance change. High daily value, cheap to
      build once cron exists.
- [ ] `/api/admin/export` — JSON snapshot of every table, for manual or
      cron backup.
- [ ] **Demo mode** — top-rail toggle swapping every card to realistic fake
      data from `lib/demoData.ts`, fully isolated from the real DB. Needed
      before this is ever screen-shared outside the company.

---

## Phase 8 — GoHighLevel CRM integration · *blocked*

**Blocked on:** the GoHighLevel account/client/project structure.

- [ ] Pull client/project records into Supabase (or query live).
- [ ] Extend `classifyCapture` to resolve client/project *within* a
      business — e.g. "the Elm St job" → OpenForge → that project. Nullable,
      and DB-revalidated exactly like `org_slug`.
- [ ] Surface client/project context on cards; likely settles Pipeline's
      data source (Phase 3).

---

## Sequencing notes

- **0 → 1 are strictly ordered and strictly first.** Everything else is
  guesswork until a deploy is green and the schema is checked in.
- **2 gates 3.** The pattern and the org-filtering contract get decided once,
  in Phase 2, then copied seven times.
- **4 can be done any time** after Phase 0 and is independent of the card
  work — good filler if Phase 1 is blocked waiting on Supabase access.
- **8 may reshape 3's Pipeline card.** If GoHighLevel is coming soon, build
  Pipeline last or stub it.
- **Per-phase discipline:** `npx tsc --noEmit` + a dummy-env `next build`
  before every push; branch/PR conventions in `HANDOFF.md`.

## Decisions the next session will need from a human

1. **Pipeline's data source** — model deals in Supabase now, or wait for
   GoHighLevel? (Affects Phase 3.)
2. **MarketingPulse's data source** — manual entry, or a real ads API?
3. **Selected-org transport** — URL search param vs. client-side fetching.
   (Recommend the search param; it's server-readable and shareable.)
4. **Whether the Brain tab ships inert or hidden** until Phase 6.
