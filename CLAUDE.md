# CryptoWill

Dead man's switch for crypto wallets. Users create wills, confirm they're alive monthly via wallet signature, funds auto-transfer to beneficiary if grace period expires.

## Architecture

- **Smart Contract**: Solidity on Base (L2), built with Foundry → `contracts/`
- **Frontend**: Next.js 14 + React + wagmi + RainbowKit → `apps/web/`
- **Backend**: Next.js API routes + Supabase + Resend → `apps/web/app/api/`
- **Docs**: Architecture docs per layer → `docs/`

## Documentation

Read before working on any layer:
- `docs/SMART_CONTRACT.md` — contract architecture, security rules, testing rules
- `docs/BACKEND.md` — API design, DB schema, cron jobs, env vars
- `docs/FRONTEND.md` — component structure, styling rules, user flows

## Branch Strategy

- `main` — protected, requires PR review
- `feat/<issue-number>-<short-description>` — feature branches
- `fix/<issue-number>-<short-description>` — bug fixes

## PR Workflow

1. Create branch from `main`
2. Implement changes
3. Create PR linking to GitHub issue (`Closes #<number>`)
4. PR reviewer agent reviews
5. Merge to `main`

## Agent Roles

| Agent | Scope | Rules |
|-------|-------|-------|
| **smart-contract** | `contracts/` | Follow `docs/SMART_CONTRACT.md`. Foundry tests required. |
| **backend** | `apps/web/app/api/`, `apps/web/lib/` | Follow `docs/BACKEND.md`. Zod validation on all inputs. |
| **frontend** | `apps/web/app/` (pages), `apps/web/components/`, `apps/web/hooks/` | Follow `docs/FRONTEND.md`. Server components by default. |
| **pr-reviewer** | All files | Review PRs for security, correctness, style. Check docs compliance. |

## Commit Convention

```
<type>(<scope>): <subject>

type: feat, fix, refactor, test, docs, chore
scope: contract, api, web, docs, config
```

## Key Commands

```bash
# Contract
cd contracts && forge build && forge test

# Frontend
cd apps/web && npm run dev

# Lint
npm run lint
```
