# NEXUS — AI Work Assistant

A chat interface over your team's shared Google Sheet. Ask what's pending, overdue,
or what happened yesterday — NEXUS reads the live sheet, filters the relevant rows,
and answers in plain language. Read-only: it never modifies the sheet.

## How it works

```
Google Sheet (source of truth)
        ↓
Google Sheets API — read-only, via a service account
        ↓
lib/normalize.ts — maps your sheet's actual column names to
                    canonical fields (Person, Project, Status, Due Date, etc.)
        ↓
lib/query-engine.ts — parses your question (dates, status, keywords)
                       and filters to ONLY the matching rows
        ↓
Google Gemini (free tier) — phrases the answer using just those rows
        ↓
Chat UI
```

The sheet is fetched fresh on every question — there's no caching or database, so
whatever your team last typed into the sheet is what NEXUS sees.

## Try it now with demo data (no sheet needed yet)

If `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, or `GOOGLE_SHEET_ID` aren't
set, NEXUS automatically uses built-in dummy data (`lib/mock-data.ts`) shaped like a
real sheet export, instead of erroring. This means you can test the full chat flow —
including real Gemini responses — with just a `GEMINI_API_KEY` set, before your
actual sheet exists. The header shows an amber "Demo Data" indicator whenever this
fallback is active, and it switches to your real sheet automatically the moment you
add the three Google env vars — no code changes needed.

## 1. Set up the Google Sheets connection

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project.
2. Enable the **Google Sheets API** for that project.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**. Give it any name (e.g. `nexus-reader`).
4. Open the new service account → **Keys → Add Key → Create new key → JSON**. This downloads a `.json` file — keep it private.
5. Open your Google Sheet → **Share** → paste the service account's email (looks like `nexus-reader@your-project.iam.gserviceaccount.com`) → give it **Viewer** access.
6. Copy your Sheet's ID from its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

## 2. Set up Gemini (free, no credit card required)

Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click **Create API key**. No billing setup needed for the free tier.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — from the service account
- `GOOGLE_PRIVATE_KEY` — the `private_key` field from the downloaded JSON (keep the `\n` sequences and quotes)
- `GOOGLE_SHEET_ID` — from the sheet's URL
- `GOOGLE_SHEET_RANGE` — the tab name, e.g. `Sheet1` (defaults to `Sheet1` if omitted)
- `GEMINI_API_KEY` — your Gemini key from AI Studio
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash` if omitted

## 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Sheet column names

Columns don't need to match exactly — `lib/normalize.ts` matches headers by pattern
(e.g. any column containing "owner", "assignee", or "person" is treated as the person
column). If NEXUS misreads a column, adjust the regex patterns in `FIELD_PATTERNS`
inside that file to match your actual headers.

Expected concepts (column names are flexible):

| Concept | Matches headers containing |
|---|---|
| Date | "date", "work date", "log date" |
| Person | "person", "owner", "assignee", "who" |
| Project | "project", "client", "account" |
| Task | "task", "activity", "title" |
| Description | "description", "details", "summary" |
| Status | "status", "state" |
| Priority | "priority" |
| Due Date | "due" |
| Notes | "note", "comment", "remark" |
| Last Updated | "updated" |

"Overdue" is computed automatically (due date in the past and not marked Completed) —
you don't need an explicit Overdue status in the sheet.

## Deploying

This is a standard Next.js app — deploy it to [Vercel](https://vercel.com) (recommended,
same company as Next.js) or any Node host. Set the same environment variables in your
hosting provider's dashboard. Don't commit `.env.local` — it's already gitignored.

## What's intentionally left out of V1

Per the original brief: no Gmail, Calendar, WhatsApp, voice, notifications, or
autonomous agents. It's read-only — it never writes back to the sheet. Follow-up
questions ("what's still pending there?") work within a single chat session by
carrying the last topic keyword forward, but there's no long-term memory across
sessions yet.
