# Telegram Daily Brief Setup

The repo is configured to send one Telegram brief every day at **09:00 Bali time** (`01:00 UTC`). It combines:

- unfinished To-Do items due today through the next 3 days;
- overdue To-Do items;
- timeline stages active, starting, or ending in the same window;
- warnings for ongoing projects without a current/upcoming timeline;
- a short Claude-generated priority summary, with a non-AI fallback if Claude fails.

## 1. Telegram

1. Open your bot in Telegram and send `/start`.
2. Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`.
3. Copy the number under `message.chat.id`.

## 2. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add these to Production:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET` — any long random string

Keep your existing Google Sheets and `ANTHROPIC_API_KEY` variables.

Optional:

- `DAILY_BRIEF_SEND_EMPTY=true` to receive a message even on quiet days.

## 3. Deploy

Push this repo to GitHub. Vercel should deploy it and register the cron from `vercel.json`.

## 4. Manual test

After deployment, run this in Terminal:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://super-ellipse-portal.vercel.app/api/cron/daily-brief
```

The response includes `sent` and a `preview`. When `sent` is true, the bot should message you.

## Sheet requirements

No new sheet tab is required. For items to appear:

- `Tasks.due_date` must use `YYYY-MM-DD` and status must not be `done`.
- `Timeline.start_date` and `Timeline.end_date` must use `YYYY-MM-DD`.
- `Timeline.project_id` and `Tasks.project_id` must match the ID in `Projects.id` (or use `studio` for internal tasks).
