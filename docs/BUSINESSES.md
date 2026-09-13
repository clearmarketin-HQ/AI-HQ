# Businesses

AI HQ operates across seven businesses under one holding company. The
classifier (`lib/telegram/classify.ts`) resolves a capture to one of these by
slug or by name/reference in the operator's text — never by guessing; the
result is always re-validated against the live `orgs` table before anything
is written (see `docs/CAPTURE_PIPELINE.md`).

| Business | Notes |
|---|---|
| Clear Market-In | |
| OpenForge Construction | Construction — permits, site walkthroughs, inspections. |
| Goldys Maids | Cleaning services. |
| VES Law Group | Law firm — retainers, client calls, filings. |
| CENA Immigration | Immigration services — case filings (e.g. I-130s), intake backlog. |
| ProfitShield AI | Ad spend / marketing ops. |
| Top Player Placement | Recruiting / placement — candidate pipeline, placement fees. |

The exact `slug`/`name`/`id` values live in the `orgs` table in Supabase, not
in this repo (see `docs/ARCHITECTURE.md` for the inferred schema). The
dashboard's placeholder data (`docs/DASHBOARD.md`) uses this same set of
businesses so the mocked numbers read as plausible, not as real figures.
