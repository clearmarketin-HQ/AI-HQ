# Dashboard

`app/page.tsx` renders: `Shell > TopRail + DashboardGrid (8 cards) + CaptureBox`.
It started as a Claude Design mockup (single HTML artboard) and was ported
into real Tailwind/React components — the mockup itself was never committed
to this repo; this doc plus the component source is the record of that
design now.

## Layout

- **`Shell`** (`components/Shell.tsx`) — outer flex-column wrapper,
  `min-h-screen`. Not the "3-column grid" — see `DashboardGrid` for that.
- **`TopRail`** (`components/TopRail.tsx`) — a three-zone flex row:
  - Left (`flex-shrink-0`): brand ("AI HQ") + `OrgSwitcher`.
  - Center (`flex-1 justify-center`): nav tabs (Home, CRM, Brain, Finance,
    Marketing, Calendar) — currently visual only; only "Home" is a real
    page.
  - Right (`flex-shrink-0`): live clock (`TopRailClock`, a client component
    so the date/time doesn't cause an SSR/CSR mismatch), an avatar showing
    initials derived from the user's email (the email itself is a `title`
    tooltip on the avatar, not shown in the rail), and `SignOutButton`.
  - This used to be `absolute`-positioned for the tabs, which let them
    overlap the right zone once it grew wide. It's a plain three-zone flex
    row now — don't reintroduce absolute positioning here.
- **`DashboardGrid`** (`components/dashboard/DashboardGrid.tsx`) — the
  3-column responsive grid (`280px | minmax(0,1fr) | 320px` on `md+`) that
  lays out the eight cards into left/center/right slots.
- **`CaptureBox`** (`components/dashboard/CaptureBox.tsx`) — fixed to the
  bottom center, POSTs to `/api/capture` (see `CAPTURE_PIPELINE.md`), shows a
  self-dismissing toast on success/failure.

## Cards

All eight live in `components/dashboard/`, each wrapped in the shared
`Panel` (glassmorphism card: blurred `bg-ink-1/55`, `border-ink-2/55`,
rounded, a title + icon header). Shared small pieces (`Tag`, `Dot`,
`Divider`, `Avatar`) live in `components/dashboard/primitives.tsx`.

| Card | Column | Shows |
|---|---|---|
| `Operators.tsx` | Left | The two operators, status dot, last-capture time. |
| `FinancePulse.tsx` | Left | Total cash + per-business breakdown with % change. |
| `KeyBlockers.tsx` | Left | Cross-business blocked items. |
| `Session.tsx` | Center | Today's top 3 priorities for the current session. |
| `Pipeline.tsx` | Center | Deal-stage counts + a couple of named deals. |
| `Priorities.tsx` | Center | Numbered top-4 priority list. |
| `Calendar.tsx` | Right | Today's/this-week's scheduled events. |
| `MarketingPulse.tsx` | Right | Per-channel ad spend + conversions, with a total. |

**All eight currently render hardcoded placeholder data** (constants at the
top of each file) — none of them query Supabase yet. Wiring them to real
data (per-business, and respecting the org switcher's selection) is open
work — see `ROADMAP.md`.

## Org switcher

`components/OrgSwitcher.tsx` is a plain `<select>` bound to
`lib/org/OrgContext.tsx`'s `useOrg()`. Do not rebuild it — it's
intentionally simple. `OrgContext` injects a synthetic pseudo-org,
`{ id: "__all__", name: "All Businesses" }` (exported as `ALL_ORGS_ID`), as
the **first** entry in the option list, and it is the **default selection on
login** (the provider's initial state is always `ALL_ORGS_ID`, not the first
real org). Selecting a real org does not currently filter any card's data —
that wiring doesn't exist yet (see `ROADMAP.md`).
