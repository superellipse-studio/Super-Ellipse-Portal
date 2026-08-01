# Super Ellipse — Internal Portal

Real-time studio portal backed by your Google Sheet, editable by typing plain-English
commands into the command bar.

## Sheet tabs expected
`Projects`, `Tasks`, `Invoices`, `Team`, `Timeline` — see earlier setup notes for exact columns.
`Projects.category` now supports a fourth value: `on_hold`, for stalled/unresponsive clients.

## Deploying
1. Push this folder to GitHub (upload the full folder contents, don't cherry-pick files).
2. Import into Vercel, add env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
   GOOGLE_SHEET_ID, ANTHROPIC_API_KEY, PORTAL_PASSWORD, SESSION_SECRET.
3. Deploy.

## Project timeline calendar

The Calendar now supports full project-stage ranges, project-specific colors, and timeline updates through the Anthropic command bar.

### Google Sheet columns

Use these exact header rows. Existing columns should stay in the same order.

**Projects**

`id | client | name | category | currency | total_fee | paid | current_phase | drive_link | subtitle | type | timeline_color`

- `timeline_color` is an optional 6-digit hex color, for example `#D97757`.
- When blank, the app assigns a fallback color automatically.

**Timeline**

`id | project_id | label | start_date | end_date | status | sort_order`

- One row represents one stage of one project.
- Dates must use `YYYY-MM-DD`.
- `status` must be `upcoming`, `current`, or `completed`.
- `sort_order` is a number used to preserve the intended stage order.

Example:

`timeline_001 | proj_001 | Design Direction | 2026-08-01 | 2026-08-07 | completed | 1`

`timeline_002 | proj_001 | Feedback 1 | 2026-08-08 | 2026-08-10 | current | 2`

### Example command-bar instructions

- `Add Design Phase 1 for Shadow & Lens from August 11 to August 18.`
- `Move Shadow & Lens Design Phase 1 to August 12–20.`
- `Shadow & Lens is now in Feedback 1.`
- `Set Rajah and Kili calendar color to #D97757.`

Setting a timeline stage as `current` also updates the matching project's `current_phase` field.
