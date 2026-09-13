# Architecture

## Stack

- **Next.js 15** (App Router, `next dev --turbopack` / `next build --turbopack`)
- **TypeScript**, strict mode
- **Tailwind v4**, with a dark, oklch-based design token system defined in
  `app/globals.css` (`--ink-0`…`--ink-4`, `--accent`, `--accent-foreground`,
  `--ok`, `--warn`, `--danger`) and exposed as Tailwind utilities
  (`bg-ink-1`, `text-ink-4`, `border-ink-2`, etc.). Do not hardcode colors
  outside this token set.
- **Supabase**: Postgres + Auth (email/password) + Row Level Security.
- **Anthropic Claude** (`claude-haiku-4-5`) for capture classification, via
  `@anthropic-ai/sdk` — see the rule in `docs/README.md`.
- **OpenAI Whisper** (`whisper-1`) for voice transcription, via raw `fetch`.
- **Telegram Bot API** as one of the two capture surfaces.

## Directory map

```
app/
  layout.tsx              Root layout — fetches the user's orgs (RLS-scoped),
                           feeds OrgProvider, mounts Geist fonts.
  page.tsx                Home dashboard: Shell > TopRail + DashboardGrid + CaptureBox.
  login/page.tsx           Email/password sign-in (Supabase Auth).
  api/telegram/webhook/    Telegram capture pipeline (see CAPTURE_PIPELINE.md).
  api/capture/             Web capture pipeline — same pipeline, session-based operator.

components/
  Shell.tsx               Outer page wrapper (flex column, min-h-screen).
  TopRail.tsx             Top nav: brand, OrgSwitcher, tabs, clock, avatar, sign-out.
  TopRailClock.tsx        Client component, live-updating date/time (avoids SSR mismatch).
  OrgSwitcher.tsx         <select> bound to OrgContext. Do not rebuild — extend in place.
  SignOutButton.tsx       Calls the signOut server action.
  dashboard/
    Panel.tsx             Shared glassmorphism card wrapper (title + icon + children).
    primitives.tsx        Tiny shared bits: Tag, Dot, Divider, Avatar.
    DashboardGrid.tsx     3-column responsive grid layout for the card columns.
    CaptureBox.tsx        Floating input pinned to the bottom; POSTs to /api/capture.
    Operators.tsx, FinancePulse.tsx, KeyBlockers.tsx, Session.tsx,
    Pipeline.tsx, Priorities.tsx, Calendar.tsx, MarketingPulse.tsx
                           One card each. All currently render placeholder data —
                           see DASHBOARD.md for what's real vs. not.

lib/
  supabase/
    client.ts             Browser Supabase client (@supabase/ssr).
    server.ts             Session-aware server client (cookie-based). Use this
                           in Server Components and Route Handlers that need
                           the logged-in user.
    admin.ts               Service-role client. Bypasses RLS. Webhook/cron/admin
                           use only — never for a user-facing read.
    middleware.ts          Session refresh logic used by root middleware.ts.
  org/
    OrgContext.tsx         OrgProvider/useOrg. Injects a synthetic "All
                           Businesses" pseudo-org (id: "__all__") as the first
                           entry and the default selection on login.
    types.ts               Org = { id, name }.
  telegram/
    classify.ts            classifyCapture(text, orgs) — Claude classification,
                            zod structured output, DB-validated org resolution.
    api.ts                  Telegram sendMessage / answerCallbackQuery /
                            downloadVoiceFile / buildUrgencyKeyboard.
    transcribe.ts           Whisper transcription.
    types.ts                Telegram webhook payload types.
  auth/
    actions.ts              signOut server action.

middleware.ts              Refreshes the Supabase session and redirects
                            unauthenticated requests to /login. Explicitly
                            excludes /api/ — API routes must check auth
                            themselves (see CAPTURE_PIPELINE.md).
```

## Database schema (inferred — not formally migrated in this repo)

There are no SQL migration files checked in. Whatever tables exist were
created directly in the Supabase dashboard/SQL editor. The shapes below are
reconstructed from the columns each query in code actually selects/inserts —
treat this as a best-effort map, not a source of truth, and correct it here
the moment you touch the real schema.

- **`orgs`** — `id`, `slug`, `name`. RLS-scoped to the current user via an
  (assumed) `org_members` join table — see the comment in `app/layout.tsx`.
  `org_members` itself is never queried directly in this codebase.
- **`operators`** — `id`. Looked up by `telegram_id` in the Telegram webhook.
  The web `/api/capture` route looks operators up **by `email`** instead —
  this is an unverified assumption made when that route was written (no
  migration exists to confirm `operators.email` is real); confirm/fix this
  against the actual table before relying on it.
- **`raw_captures`** — `id`, `org_id`, `user_id`, `source` (`"telegram"` |
  `"web"`), `raw_text`, `classification` (jsonb — the full `Classification`
  object), `llm_source`, `routed_to`, `routed_id`.
- **`tasks`** — `id`, `org_id`, `user_id`, `title`, `urgency`, `description`,
  `tags`, `key` (boolean, set via the Telegram urgency-override callback).
- **`audit_log`** — `org_id`, `user_id`, `action`, `resource_type`,
  `resource_id`.

## Auth

Supabase Auth, email/password only (see `app/login/page.tsx`). Session
refresh and the `/login` redirect gate live in `middleware.ts` /
`lib/supabase/middleware.ts`. `/api/` routes are excluded from that gate by
the middleware matcher, so any API route that needs to know who's logged in
(e.g. `/api/capture`) must call `lib/supabase/server.ts`'s `createClient()`
and `supabase.auth.getUser()` itself.
