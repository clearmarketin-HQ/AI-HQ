# Roadmap / Known Gaps

Things that are explicitly deferred, unverified, or open work — not bugs,
but worth knowing before you assume a piece is finished.

## Client/project-scoped classification (GoHighLevel CRM integration)

Planned but not started. Once client/project data from the GoHighLevel CRM
is integrated, `classifyCapture` should be able to resolve a capture to a
specific client or project within a business (e.g. "the Elm St job" →
OpenForge Construction → a specific project), not just the business itself.
This needs:

- A way to pull client/project records from GoHighLevel into Supabase (or
  query it live) — not designed yet.
- Passing that client/project list into `classifyCapture` alongside the org
  list, and extending the `Classification` schema with a resolved
  client/project id (nullable, DB-revalidated the same way `org_slug` is
  today — never trust the model's returned id directly).
- Surfacing client/project context on the dashboard cards.

## Dashboard cards are all placeholder data

Every card in `components/dashboard/` renders hardcoded constants. None of
them query Supabase. Wiring them to real data is open work, and should
probably respect the org switcher's current selection (including "All
Businesses" aggregating across orgs) once it's done.

## `operators.email` lookup is unverified

`app/api/capture/route.ts` looks up the operator via
`operators.email === user.email` (the logged-in Supabase Auth user's
email). This was a reasonable assumption made without access to the actual
`operators` table schema (no migrations are checked into this repo — see
`docs/ARCHITECTURE.md`). Confirm this against the real table, and update
both the code and `docs/ARCHITECTURE.md` if the actual link between a
Supabase Auth user and an `operators` row is different (e.g. a dedicated
`auth_user_id` column).

## Nav tabs are visual-only

`TopRail`'s tabs (Home, CRM, Brain, Finance, Marketing, Calendar) render but
only "Home" is a real page. The other five need actual routes.

## No SQL migrations in this repo

The Supabase schema exists only in the live database (or whatever
dashboard/SQL-editor history created it) — nothing is version-controlled.
Consider adding a `supabase/migrations/` (or similar) directory backed by
the Supabase CLI so schema changes are reviewable and this repo stops
relying on `docs/ARCHITECTURE.md`'s inferred-from-code schema section as the
only record.

## Standing Vercel deployment issue

See `docs/DEPLOYMENT.md` — missing env vars in the Vercel project, not a
code issue. Worth fixing before it causes confusion for a new contributor
who assumes their own PR broke the deploy.
