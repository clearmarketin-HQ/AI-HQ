# Deployment

## Environment variables

All required vars are listed (empty) in `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser +
  session-aware server Supabase clients (`lib/supabase/client.ts`,
  `lib/supabase/server.ts`).
- `SUPABASE_SERVICE_ROLE_KEY` — service-role client (`lib/supabase/admin.ts`).
  Bypasses RLS. Only used server-side for the webhook/capture pipeline.
- `TELEGRAM_WEBHOOK_SECRET` — validated against the
  `x-telegram-bot-api-secret-token` header on incoming Telegram updates.
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API calls (`lib/telegram/api.ts`).
- `OPENAI_API_KEY` — Whisper transcription (`lib/telegram/transcribe.ts`).
- `ANTHROPIC_API_KEY` — Claude classification (`lib/telegram/classify.ts`).

Optional:

- `OPENAI_CLASSIFIER_MODEL` — model for the OpenAI fallback tier of
  `classifyCapture`. Defaults to `gpt-4o-mini` when unset; the fallback
  works without it, reusing `OPENAI_API_KEY`.

Local dev: copy `.env.local.example` to `.env.local` and fill in real
values.

These seven are what the code uses *today*. The build guide's full checklist
(Appendix B) runs to ~19 — the extras cover parts we haven't built yet
(Google Calendar/Sheets credentials, `CRON_SECRET`). See [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) for which of those we'll
need and which don't apply to us.

## Vercel

The project deploys via Vercel's GitHub integration (no GitHub Actions
workflow exists in this repo — deploy status shows up purely as a `Vercel`
commit status / PR comment from `vercel[bot]`).

### ⚠️ Standing issue: missing env vars

As of this writing, the Vercel project (`ai-hq`, under the `cmhq` team) does
**not** have the seven env vars above set for the Preview and/or Production
environments. Every deployment since the Telegram webhook was added has
failed for this exact reason — it is a **Vercel dashboard configuration
gap, not a code bug**. If you see a deploy fail:

1. Check whether the failure reproduces with a clean local build:
   ```
   NEXT_PUBLIC_SUPABASE_URL=x NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
   SUPABASE_SERVICE_ROLE_KEY=x TELEGRAM_WEBHOOK_SECRET=x \
   TELEGRAM_BOT_TOKEN=x OPENAI_API_KEY=x ANTHROPIC_API_KEY=x \
   npx next build --turbopack
   ```
   If that passes, the deploy failure is almost certainly this same issue,
   not your change.
2. Don't try to "fix" it with a code change, an empty commit, or a
   close/reopen of the PR — none of that touches Vercel's env var config.
3. Fix it in **Vercel → Project Settings → Environment Variables**, scoped
   to at least Preview and Production, then redeploy.

### PR workflow used in this repo

- Feature work happens on `claude/nextjs-supabase-setup-k2gm8l` (a fixed
  branch name used across this project's automated sessions), opened as a
  PR against `main`, merged via squash.
- Once a PR on that branch has merged, the next round of work resets the
  branch from `origin/main` (`git checkout -B claude/nextjs-supabase-setup-k2gm8l origin/main`)
  before adding new commits, rather than stacking on top of already-merged
  history (which otherwise produces false merge-conflict states on GitHub).
- If a PR on that branch is still open, new commits stack onto it instead of
  resetting.
