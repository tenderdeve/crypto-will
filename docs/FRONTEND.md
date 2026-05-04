# Frontend — CryptoWill

## Overview

Next.js 14 React app with wallet-first UX. Users connect wallet, create wills, sign alive checks, and manage everything from a dashboard.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 | App router, SSR, API routes |
| React 18 | UI components |
| TypeScript | Type safety |
| wagmi v2 | React hooks for Ethereum |
| viem | Low-level EVM interactions |
| RainbowKit | Wallet connection modal |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| React Hook Form | Form handling |
| zod | Form + data validation |
| Framer Motion | Animations (minimal) |

---

## Page Architecture

```
apps/web/app/
├── layout.tsx                  # Root layout (providers, navbar)
├── page.tsx                    # Landing page (hero, how it works, CTA)
├── dashboard/
│   ├── layout.tsx              # Dashboard layout (sidebar, auth guard)
│   └── page.tsx                # Will overview, status cards
├── create/
│   └── page.tsx                # Multi-step will creation wizard
├── alive/
│   ├── page.tsx                # Sign alive check (from email link)
│   └── [token]/
│       └── page.tsx            # Token-specific alive check page
├── will/
│   └── [id]/
│       └── page.tsx            # Will detail view (history, actions)
└── providers.tsx               # wagmi, RainbowKit, QueryClient providers
```

---

## Component Structure

```
apps/web/components/
├── ui/                         # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/
│   ├── navbar.tsx              # Top nav with wallet connect
│   ├── sidebar.tsx             # Dashboard sidebar
│   └── footer.tsx
├── wallet/
│   ├── connect-button.tsx      # Custom RainbowKit wrapper
│   └── wallet-guard.tsx        # Auth gate — redirect if not connected
├── will/
│   ├── create-form.tsx         # Multi-step form
│   ├── will-card.tsx           # Will summary card
│   ├── will-status-badge.tsx   # Status indicator
│   ├── token-approval.tsx      # Token approve flow
│   └── will-actions.tsx        # Revoke, update actions
├── alive/
│   ├── sign-alive.tsx          # Wallet signature component
│   └── alive-history.tsx       # Past alive checks list
└── landing/
    ├── hero.tsx
    ├── how-it-works.tsx
    ├── features.tsx
    └── cta.tsx
```

---

## Rules & Conventions

### Code Style
- TypeScript strict mode, no `any`
- Functional components only
- Named exports only (no default exports)
- One component per file, filename matches component name (kebab-case)
- Colocate hooks in `hooks/`, utils in `lib/`

### Component Rules
1. **Server components by default** — only add `"use client"` when needed (state, effects, browser APIs)
2. **No prop drilling beyond 2 levels** — use context or composition
3. **Loading states** via React Suspense + `loading.tsx` files
4. **Error boundaries** via `error.tsx` files per route
5. **Forms** use React Hook Form + zod resolver
6. **No inline styles** — Tailwind only

### Wallet/Web3 Rules
1. **All chain interactions** go through wagmi hooks (useReadContract, useWriteContract)
2. **Never store private keys or seed phrases** in frontend
3. **Always show tx status** — pending, confirming, confirmed, failed
4. **Chain switching** — prompt user to switch to Base if on wrong chain
5. **Wallet signature for auth** — SIWE standard
6. **Token approvals** — show clear explanation of what user is approving

### Styling Rules
- Mobile-first responsive design
- Dark mode support (Tailwind `dark:` prefix)
- Consistent spacing: use Tailwind spacing scale
- Colors from shadcn/ui theme tokens
- Animations: subtle, purposeful, max 300ms
- Accessible: proper ARIA labels, keyboard nav, contrast ratios

---

## State Management

| State Type | Solution |
|------------|----------|
| Server data | React Query (via wagmi) + fetch |
| Wallet state | wagmi hooks (useAccount, useChainId) |
| Form state | React Hook Form |
| UI state | React useState (local) |
| Global app state | React Context (minimal) |

No Redux/Zustand needed for MVP.

---

## Key User Flows

### 1. Will Creation (3 steps)
```
Step 1: Enter Details
├── Beneficiary wallet address
├── Email address (for alive checks)
└── Grace period (dropdown: 30/60/90/180 days)

Step 2: Select & Approve Tokens
├── Show wallet token balances
├── Select tokens to include
└── Approve each token (separate tx per token)

Step 3: Create Will
├── Review summary
├── Sign createWill transaction
└── Confirmation + dashboard redirect
```

### 2. Sign Alive Check
```
Email link → /alive/[token]
├── Connect wallet (if not connected)
├── Verify wallet matches will owner
├── Sign "I am alive" message
├── POST signature to /api/alive
└── Success confirmation
```

---

## Folder Structure (Full)

```
apps/web/
├── app/                        # Next.js app router pages
├── components/                 # React components
├── hooks/
│   ├── use-will.ts             # Will contract interactions
│   ├── use-alive.ts            # Alive check signing
│   ├── use-token-approval.ts   # ERC-20 approval flow
│   └── use-user.ts             # User data
├── lib/
│   ├── contracts.ts            # ABI, addresses, config
│   ├── wagmi.ts                # wagmi + RainbowKit config
│   ├── supabase.ts             # Supabase browser client
│   ├── utils.ts                # Shared utilities
│   └── constants.ts            # App constants
├── styles/
│   └── globals.css             # Tailwind base + custom
├── public/
│   ├── logo.svg
│   └── og-image.png
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.js
```

---

## Environment Variables (Frontend)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=84532        # Base Sepolia
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```
