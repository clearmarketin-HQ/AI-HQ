# Capture Pipeline

An operator's raw thought — voice or text — becomes a classified, routed
database record through the same pipeline regardless of which surface it
came in on. There are two entry points today; both call the same
classification function and write to the same tables.

```
Telegram voice/text  ──┐
                        ├──> classifyCapture(text, orgs) ──> raw_captures ──> (task?) tasks ──> audit_log
Web capture box      ──┘
```

## Entry points

### `app/api/telegram/webhook/route.ts`

- Verifies `x-telegram-bot-api-secret-token` against `TELEGRAM_WEBHOOK_SECRET`.
- Looks up the operator by `telegram_id` (via the service-role client —
  `lib/supabase/admin.ts`).
- Voice messages: downloads the file via `lib/telegram/api.ts`
  (`downloadVoiceFile`) and transcribes it with `lib/telegram/transcribe.ts`
  (OpenAI Whisper, `whisper-1`). Transcription failures are caught and
  answered gracefully in-chat rather than left to fail silently or retry-storm
  Telegram — this was a real incident (OpenAI quota exhaustion silently
  dropping captures) fixed by adding this try/catch.
- Sends a confirmation message back to the operator, with an inline-keyboard
  urgency override (`buildUrgencyKeyboard`) when the capture became a task.
  The callback handler (`handleCallbackQuery`) re-validates the task exists
  before writing an urgency/`key` update — never trusts `callback_data`
  blindly.

### `app/api/capture/route.ts`

- Web-dashboard equivalent, POSTed to by `components/dashboard/CaptureBox.tsx`.
- Auth: uses the **session-aware** Supabase client
  (`lib/supabase/server.ts`) to get the logged-in user via
  `supabase.auth.getUser()` — `/api/` routes are excluded from the
  middleware's redirect gate, so this route must check auth itself.
- Operator resolution: looks the operator up **by `email`** against the
  logged-in user's email, using the **service-role** client for the actual
  read/write (the `operators`/`raw_captures`/`tasks`/`audit_log` tables
  aren't RLS-scoped to the Supabase Auth user). This `email` lookup is an
  assumption, not a confirmed schema fact — see `docs/ARCHITECTURE.md`.
- No Telegram-style confirmation message; responds with
  `{ ok, org, classification }` JSON, which `CaptureBox` turns into a
  toast.
- `source` is written as `"web"` instead of `"telegram"` on the
  `raw_captures` row so the two entry points stay distinguishable.

## `classifyCapture` (`lib/telegram/classify.ts`)

Shared by both entry points, unchanged between them.

- Model: `claude-haiku-4-5`, called via `@anthropic-ai/sdk`'s
  `anthropic.messages.parse()` with a zod-defined `output_config.format`
  (`zodOutputFormat`), reading `response.parsed_output`.
- Input: the raw text plus the full list of orgs (`{ slug, name }[]`).
- The prompt instructs the model to match `org_slug` against an org's actual
  **name** or any clear reference to it — not just the slug string — and to
  return `null` rather than invent a slug when the business is unclear.
- Output shape (`Classification`):
  ```ts
  {
    org_slug: string | null;
    kind: "task" | "note" | "decision";
    urgency: "today" | "this_week" | "this_month" | "someday";
    title: string;
    summary: string;
    tags: string[];
  }
  ```
- **Never trust the returned `org_slug` directly.** Every caller re-resolves
  it by looking it up in the `orgs` rows it fetched from the DB moments
  earlier, and only uses the matched org's real `id` for `org_id`. If no
  match, `org_id` is `null` and the capture is still saved (as an
  unrouted/unassigned record) rather than dropped.

## Writes, in order

1. `raw_captures` insert — always happens, even if `org_id` ends up `null`.
2. `tasks` insert — only when `classification.kind === "task"` **and** an
   org was resolved. On success, the `raw_captures` row is updated with
   `routed_to: "tasks"` and `routed_id: <task id>`.
3. `audit_log` insert — always happens, referencing whichever resource
   (`task` or `raw_capture`) is the actual outcome.

If you add a third capture surface, follow this exact order and reuse
`classifyCapture` rather than re-implementing classification.
