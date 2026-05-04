# Backend — CryptoWill

## Overview

Next.js API routes handling will metadata, alive check orchestration, email dispatch, and cron-based execution triggers. Not a separate service — lives inside the Next.js app.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 API Routes | REST endpoints |
| Supabase | PostgreSQL + Auth + Realtime |
| Resend | Transactional email |
| Vercel Cron | Scheduled jobs |
| viem | On-chain reads/writes from server |
| zod | Request validation |

---

## API Architecture

```
apps/web/app/api/
├── will/
│   ├── route.ts              # POST (create), GET (list user wills)
│   └── [id]/
│       └── route.ts          # GET (single), PATCH (update), DELETE (revoke)
├── alive/
│   ├── route.ts              # POST — verify wallet signature
│   └── status/
│       └── route.ts          # GET — check alive status for a will
├── cron/
│   ├── send-alive-checks/
│   │   └── route.ts          # Cron: monthly email dispatch
│   └── check-expired/
│       └── route.ts          # Cron: daily expired will checker
└── auth/
    └── wallet/
        └── route.ts          # POST — SIWE (Sign-In with Ethereum) verify
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto |
| wallet_address | text | unique, lowercase |
| email | text | for alive check notifications |
| created_at | timestamptz | auto |

### `wills`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto |
| user_id | uuid | FK → users |
| beneficiary_address | text | lowercase |
| token_addresses | text[] | ERC-20 contract addresses |
| contract_tx_hash | text | createWill tx hash |
| grace_period_days | int | default 90 |
| status | enum | active, pending_check, executed, revoked |
| last_alive_at | timestamptz | last confirmed alive |
| next_check_at | timestamptz | next email due date |
| created_at | timestamptz | auto |

### `alive_checks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto |
| will_id | uuid | FK → wills |
| sent_at | timestamptz | email sent time |
| responded_at | timestamptz | nullable |
| signature | text | nullable, wallet signature |
| token | text | unique link token |
| status | enum | sent, confirmed, expired |

---

## Rules & Conventions

### API Design
- RESTful endpoints, JSON responses
- All requests validated with zod schemas
- Consistent error format: `{ error: string, code: string }`
- Auth via wallet signature (SIWE) — no passwords
- Rate limiting on all public endpoints

### Security Rules
1. **Never trust client wallet address** — always verify via SIWE signature
2. **Cron endpoints** protected by `CRON_SECRET` header (Vercel cron auth)
3. **No raw SQL** — use Supabase client with RLS policies
4. **Alive check tokens** are single-use, expire after 30 days
5. **Email addresses** stored encrypted at rest
6. Wallet addresses always stored **lowercase**

### Code Style
- TypeScript strict mode
- Named exports only
- One route handler per file
- Shared types in `lib/types.ts`
- DB queries in `lib/db/` — not inline in routes
- Environment variables in `lib/env.ts` with zod validation

---

## Cron Jobs

### `send-alive-checks` (Monthly)
- Schedule: `0 10 1 * *` (1st of every month, 10 AM UTC)
- Query wills where `next_check_at <= now()` and `status = active`
- Send email via Resend with unique alive check link
- Update `next_check_at` to +1 month
- Create `alive_checks` record with status `sent`

### `check-expired` (Daily)
- Schedule: `0 0 * * *` (midnight UTC)
- Query wills where `last_alive_at + grace_period < now()` and `status = active`
- Call `executeWill()` on contract via server wallet
- Update will status to `executed`
- Send notification email to beneficiary (if email known)

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Chain
BASE_RPC_URL=
EXECUTOR_PRIVATE_KEY=          # Server wallet for executeWill calls

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CONTRACT_ADDRESS=
```

---

## Folder Structure

```
apps/web/
├── app/
│   └── api/                   # All API routes (see above)
├── lib/
│   ├── db/
│   │   ├── supabase.ts        # Supabase client
│   │   ├── queries/
│   │   │   ├── wills.ts       # Will CRUD queries
│   │   │   ├── users.ts       # User queries
│   │   │   └── alive-checks.ts
│   │   └── types.ts           # DB types (generated from Supabase)
│   ├── email/
│   │   ├── resend.ts          # Resend client
│   │   └── templates/
│   │       ├── alive-check.tsx # React Email template
│   │       └── will-executed.tsx
│   ├── chain/
│   │   ├── client.ts          # viem public + wallet clients
│   │   ├── contracts.ts       # ABI + addresses
│   │   └── actions.ts         # Contract read/write helpers
│   ├── auth/
│   │   └── siwe.ts            # Sign-In with Ethereum
│   ├── validations/
│   │   └── schemas.ts         # Zod schemas
│   ├── env.ts                 # Env validation
│   └── types.ts               # Shared types
```
