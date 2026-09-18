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

## ⚠️ What an agent session can and can't reach

Verified 2026-09-14 from a Claude Code web session. **Neither Phase 0 nor
Phase 1 can be completed from inside an agent session as currently
configured**, for two independent reasons:

1. **No credentials.** `.env.local` is gitignored (correctly), so a fresh
   clone has none, and the environment config doesn't supply them either.
2. **The network policy blocks Supabase and Telegram.** Even with
   credentials pasted in, the connection never opens — the agent proxy
   returns `403 to CONNECT` for `supabase.com:443` and
   `api.telegram.org:443`. GitHub and npm are allowlisted; these are not.

Also verified 2026-09-14, and relevant to what a session can test of the
capture path: **`api.anthropic.com` is reachable** (a bogus key gets a real
401 back), but **`api.openai.com` is not** — it returns
`403 Host not in allowlist`. So tier 1 of the classifier fallback chain can
be exercised from a session and tier 2 cannot. Adding `api.openai.com` to
the network policy would let a session verify tier 2 and the Whisper
transcription path.

To change that, edit the **environment settings** for Claude Code on the web
([docs](https://code.claude.com/docs/en/claude-code-on-the-web)) — network
policy and environment variables both live there.

⚠️ Before adding `SUPABASE_SERVICE_ROLE_KEY` to an environment: it bypasses
RLS entirely, so every session in that environment gains full read/write on
every table. Reasonable for real development work, but make it a deliberate
choice rather than a side effect of unblocking a one-time schema dump —
Phase 1 below has a path that needs no session connectivity at all.

---

## Phase 0 — Unblock · *not a coding task*

**Goal:** a green deploy and one capture proven end-to-end in production.

All of this is dashboard and phone work by definition — an agent session
can't do any of it (see the reachability note above). Hand the results back
to the next session.

**Status as of 2026-09-18: nearly done.** Both environments deploy green,
and Telegram text *and* voice capture are confirmed working end-to-end in
the deployed bot. Two verification steps remain, marked below — both are
quick, and the second doubles as a free partial answer to Phase 1.

- [x] Set the 7 env vars in Vercel for **Production**.
- [x] Set the same 7 for Preview — done 2026-09-18. Only the three
      Supabase vars were missing; the other four were already scoped to
      both. Preview builds now go green.
- [x] Redeploy; confirm the `Vercel` check goes green on `main`.
- [x] Telegram webhook points at the live URL — implicitly confirmed:
      the deployed bot receives and replies to real messages. (Command kept
      for reference if it ever needs re-pointing:)
      ```
      curl -F "url=https://<live-domain>/api/telegram/webhook" \
           -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
           "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
      ```
- [x] Send a real text from Telegram — confirmed, the bot classifies and
      replies in the deployed chat.
- [ ] **Still open:** confirm the `raw_captures`, `tasks` and `audit_log`
      rows actually land, with the correct `org_id` resolved. The reply
      proves classification, not persistence.
- [x] A real voice note — confirmed working 2026-09-15, once credit was
      added to the OpenAI account (auto-reload is now on, so the quota
      failure shouldn't recur). Whisper transcription and the full capture
      path both run end-to-end in production.
- [ ] **Still open:** log in to the deployed dashboard and submit via the
      web capture box. **Worth doing before the schema dump** — it is a
      free partial answer to Phase 1's main question. `/api/capture` looks
      the operator up by `operators.email === user.email`, so:
      - a successful capture proves `operators.email` exists, is populated,
        and matches the Supabase Auth user — the assumption holds, and the
        route needs no change;
      - a 403 ("account isn't linked to an operator record") means the
        column exists but no row matches that email;
      - a 500 means the column probably isn't there at all, and the real
        link is something else (e.g. `auth_user_id`).

      Whichever happens, note it — it decides one of Phase 1's tasks before
      the migration is even written.

**Done when:** a capture sent from a phone shows up in Supabase, from the
deployed app, with no manual intervention.

---

## Phase 1 — Ground truth: get the schema into the repo

**Goal:** stop guessing. Everything after this depends on knowing the real
table shapes.

**This does not require a connected session** — it needs the schema *text*,
which a human can produce in about a minute. Fastest route, run on a laptop
(not in a session):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db dump --schema public > supabase/migrations/0001_init.sql
```

Commit that file and the next session has ground truth. Zero-install
fallback — run in the Supabase SQL editor and paste the output into the
chat, and the agent reconstructs the DDL (less faithful, but unblocks):

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

And the single highest-value query — this settles the `operators.email`
assumption that `/api/capture` is built on, in five seconds:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'operators';
```

- [ ] Dump the live schema from Supabase (CLI or SQL editor, above) and
      commit it as `supabase/migrations/0001_init.sql` — tables,
      constraints, indexes, and RLS policies as they actually exist.
- [ ] **Settle the `operators` ↔ auth-user link.** `app/api/capture/route.ts`
      assumes `operators.email === user.email`. Confirm or correct it. If
      the real link is a different column (e.g. `auth_user_id`), fix the
      route and note it.
- [ ] Reconcile the "Database schema" section of
      [`ARCHITECTURE.md`](./ARCHITECTURE.md) against reality and delete the
      "inferred" caveats once it's true.
- [ ] Adopt the Supabase CLI for future changes so schema edits arrive as
      reviewable migrations, not dashboard clicks.
- [ ] **Then immediately: persist failed voice notes.** A voice note whose
      transcription fails is currently dropped with no DB row at all (see
      `ROADMAP.md` 4b — observed in production 2026-09-14). Write the
      `raw_captures` row *before* transcribing, holding Telegram's
      `file_id`, so a failure leaves something to re-run instead of
      nothing. Blocked on this phase only because it needs verified column
      nullability.

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

## Phase 4 — Harden the capture path · ✅ done

**Goal:** the front door shouldn't have a single point of failure. It
already failed once — silently — when the OpenAI quota ran out.

- [x] Add the fallback chain to `classifyCapture`: Claude
      (`claude-haiku-4-5`) → OpenAI (`OPENAI_CLASSIFIER_MODEL`) → regex
      last resort.
- [x] Keep the DB-revalidation of `org_slug` in every path — never trust a
      model-returned identifier, whichever model returned it. Both routes
      still resolve against the DB, and `normalizeClassification` nulls any
      slug outside the list the tier was handed.
- [x] Audit for swallowed errors (`.catch(() => {})`) across the capture
      path — guide bug #3. Both existing `catch` blocks were legitimate;
      `CaptureBox` now logs the error it reports.
- [x] **Not on the original list, found during the audit:** three
      credential reads threw at *module* scope. A missing `OPENAI_API_KEY`
      took down the entire Telegram webhook on import — including text
      captures, which never touch Whisper — and a missing
      `ANTHROPIC_API_KEY` would have crashed `classify.ts` before the
      fallback chain could run. All three now read per call.
- [x] Degraded captures are visible to the operator: the Telegram
      confirmation appends a "filed without AI" line, and `/api/capture`
      returns `degraded: true` for the web toast.

**Done when:** killing the Anthropic key in a local run still files the
capture, degraded but not lost. ✅ Verified — with both keys removed, seven
sample captures (including empty and degenerate input) all filed with a
valid org, kind, urgency and title. With bogus keys, both model tiers fail,
log, and fall through to regex.

⚠️ **Tier 2 is unverified against the live API.** This environment blocks
`api.openai.com`, so the OpenAI request shape (strict `json_schema`) is
typechecked and exercised but has never received a real success response.
Confirm it in the deployment — easiest check is a capture with the
Anthropic key temporarily unset, which should land `llm_source` as the
OpenAI model id rather than `regex`.

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

## Decisions — settled 2026-09-14

1. **Pipeline's data source** → **stub until GoHighLevel.** Phase 3 renders
   Pipeline as an explicit "not connected" state; the real thing is built in
   Phase 8 against the actual CRM structure. Do not model a deals table in
   Supabase — it would be contradicted by the integration.
2. **MarketingPulse's data source** → **a real ads API** (Meta / Google
   Ads), not manual entry. ⚠️ **This blocks the MarketingPulse card**: it
   needs ad account access, an OAuth app, and credentials before any of it
   can be built. Treat it like Phase 8 — stub the card and schedule the
   integration once access exists. Do not build manual entry as a stopgap;
   it was explicitly not chosen.
3. **Selected-org transport** → **URL search param.** `?org=<id>` read by
   server components, applied uniformly across all eight cards. Keeps cards
   server-rendered, survives refresh, and is shareable. `OrgContext` becomes
   a driver of the param rather than the source of truth.
4. **Brain tab** → **ships inert.** The tab stays visible and routes to a
   page that states the feature is coming in Phase 6. It must not render a
   search box that does nothing.

### Still needed from a human

- **Phase 0** — Vercel env vars and the Telegram webhook URL. Needs
  dashboard access to the `ai-hq` project under team `cmhq`.
- **Phase 1** — Supabase access to dump the live schema.
- **Phase 3 (MarketingPulse)** — ad platform account access and
  credentials, per decision 2.
- **Phase 8** — the GoHighLevel account/client/project structure.
