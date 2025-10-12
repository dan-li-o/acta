# Acta v0.1 – SMS Socratic Assistant

Acta is a lightweight SMS assistant that lets students text reflective questions and receive short, Socratic prompts in reply. This MVP focuses on dependable texting, privacy-safe prompt generation, and basic logging for instructor review.

## Features

- Telnyx webhook handler running on Vercel Edge Functions (sub-second cold starts).
- PII scrubbing before any message touches the LLM.
- Weekly topic guidance injected into the system prompt.
- Supabase-backed storage for students, messages, and redaction logs.
- Optional nightly digest stub (toggle via `DIGEST_TOGGLE`).
- Rate limiting and duplicate detection earmarked for the next phase.

## Repository Layout

```
acta/
├── api/                    # Vercel Edge routes
│   ├── webhooks/
│   │   ├── sms.ts          # inbound SMS webhook
│   │   └── dlr.ts          # delivery receipts
│   └── cron/
│       └── digest.ts       # optional daily digest
├── lib/                    # core application logic
│   ├── adapters/           # carrier integrations
│   ├── core/               # pipeline, prompts, LLM, rate limiting
│   ├── db/                 # Supabase client + queries
│   └── util/               # crypto helpers, logging, idempotency
├── db/                     # SQL schema + seeds
├── prompts/                # base prompt + examples
├── scripts/                # curl helpers for local testing
└── tests/                  # vitest coverage for core modules
```

## Getting Started

### 1. Install Dependencies

```bash
pnpm install   # or npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required secrets:

- `TELNYX_API_KEY`, `TELNYX_NUMBER` or `TELNYX_MESSAGING_PROFILE_ID`, `TELNYX_WEBHOOK_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional extras: `OPENAI_BASE_URL`, `SENDGRID_API_KEY`, `DIGEST_TOGGLE`, `DIGEST_TO`

### 3. Database Setup

Run the SQL schema and seeds in Supabase (SQL Editor or CLI):

```sql
-- db/schema.sql
-- db/seeds.sql
```

The schema creates four core tables (`students`, `messages`, `redactions`, `weekly_topics`) plus indexes to keep lookups fast.

### 4. Local Development

```bash
vercel dev
```

Send a test payload (signature check is bypassed when the secret is missing):

```bash
./scripts/curl_inbound.sh
```

Run unit tests:

```bash
pnpm test
```

### 5. Deploy

1. Push to GitHub.
2. Link the repo in Vercel (`vercel link` then `vercel`).
3. Add production/preview environment variables (`vercel env add`).
4. Deploy with `vercel --prod`.
5. Point the Telnyx webhook to `https://<your-app>.vercel.app/api/webhooks/sms`.

## Operational Notes

- **PII scrubbing:** `lib/core/scrub.ts` replaces phone numbers, emails, addresses, etc. Every redaction is logged to the `redactions` table.
- **Student phone storage:** Numbers are stored in Supabase for this pilot. TODO v0.2: reintroduce hashing/encryption before scaling.
- **Rate limiting:** Deferred to the next phase—every inbound message currently flows through for the pilot.
- **Idempotency:** Duplicate detection is a TODO; each webhook call is processed once received.
- **Prompt updates:** Adjust `prompts/acta_base.txt` (and optionally `ACTA_BASE_PROMPT`) for global tone; populate `weekly_topics` for weekly nudges.
- **Digest:** `DIGEST_TOGGLE=true` enables the cron endpoint to summarize the previous day's conversations (counts + short LLM summary).

## Testing Checklist

- ✅ `scripts/curl_inbound.sh` inserts inbound/outbound messages in Supabase.
- ✅ `pnpm test` validates scrubbing, prompt generation, and command parsing.
- ✅ Manual SMS to Telnyx number responds in <3 seconds (target).
- ✅ STOP/START/HELP commands flip student status appropriately.
- ✅ Supabase logs show `scrubbed_text` only (no raw PII) in LLM context.

## Next Steps

- Wire the optional SendGrid digest (`api/cron/digest.ts`) to an instructor email.
- Add a minimal instructor dashboard or Supabase SQL view for transcript review.
- Tune regex scrubbing for institution-specific IDs if needed.
- Layer in budgeting alarms using the `metrics` pattern described in the spec.
