# ChainWill

A non-custodial crypto will on Base. Approve your tokens, check in monthly, and know your loved ones are taken care of.

**Live:** [chainwill-dapp.vercel.app](https://chainwill-dapp.vercel.app)
**Contract (Base Sepolia):** [`0x1073293e0efeFBc14133a3ed5047BBD4095eA26B`](https://sepolia.basescan.org/address/0x1073293e0efeFBc14133a3ed5047BBD4095eA26B)

---

## How it works

1. **Connect** your wallet (MetaMask, Coinbase, WalletConnect)
2. **Approve & assign** — pick ERC-20 tokens, set a beneficiary and grace period (30-180 days)
3. **Check in monthly** — sign a gasless EIP-712 message or call `signAlive()` on-chain
4. **Silence triggers it** — after your grace period expires, anyone can call `executeWill()` and your tokens transfer to your beneficiary

Your tokens stay in your wallet under approval. The contract is non-custodial — it can only move tokens when execution conditions are met. ETH must be explicitly deposited into the contract.

---

## Architecture

```
Frontend (Next.js 14)          Smart Contract (Solidity)
┌──────────────────┐           ┌────────────────────┐
│ Landing          │           │ CryptoWill.sol      │
│ Create Will      │  wagmi    │ - createWill()      │
│ Dashboard        │◄────────►│ - signAlive()       │
│ Alive Check-in   │  viem    │ - signAliveBySig()  │
│ API Routes       │           │ - executeWill()     │
└────────┬─────────┘           │ - revokeWill()      │
         │                     │ - depositETH()      │
         │                     └────────────────────┘
    ┌────┴────┐
    │Supabase │  PostgreSQL — users, wills, alive_checks
    │Resend   │  Monthly check-in emails
    │Vercel   │  Hosting + cron jobs
    └─────────┘
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React, Tailwind CSS, shadcn/ui |
| Wallet | wagmi v2, viem, RainbowKit |
| Contract | Solidity 0.8.24, Foundry, OpenZeppelin |
| Chain | Base (L2) — Sepolia testnet / Mainnet |
| Database | Supabase (PostgreSQL) |
| Email | Resend |
| Hosting | Vercel |

---

## Project structure

```
crypto-will/
├── apps/web/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── create/            # 3-step will creation wizard
│   │   ├── dashboard/         # Will management dashboard
│   │   ├── alive/[token]/     # Monthly check-in page
│   │   └── api/
│   │       ├── will/          # Will CRUD
│   │       ├── alive/         # Alive check + relay
│   │       └── cron/          # Scheduled jobs
│   ├── components/
│   │   ├── landing/           # Hero, how-it-works, FAQ
│   │   └── dashboard/         # Countdown ring, cards
│   ├── hooks/                 # wagmi hooks
│   └── lib/                   # Contracts, DB, chain clients
├── contracts/                 # Solidity smart contracts
│   ├── src/
│   │   ├── CryptoWill.sol
│   │   └── interfaces/ICryptoWill.sol
│   ├── test/
│   │   └── CryptoWill.t.sol   # 49 tests
│   └── script/
│       ├── Deploy.s.sol       # Testnet/mainnet deploy
│       └── DeployLocal.s.sol  # Local Anvil deploy
└── docs/                      # Architecture docs
```

---

## Smart contract

The `CryptoWill` contract handles:

- **Will creation** — beneficiary, token list, grace period
- **Alive proofs** — on-chain `signAlive()` or gasless `signAliveBySig()` via EIP-712
- **Execution** — permissionless after grace period expires; transfers ERC-20s directly, ETH via pull-payment
- **Management** — update beneficiary, update tokens, deposit/withdraw ETH, revoke

Key design decisions:
- **Non-custodial** for ERC-20s (approval-based, not custody)
- **Custodial for ETH only** (must deposit into contract)
- **Pull-payment** for ETH (avoids re-entrancy, works with contract beneficiaries)
- **Partial failure tolerance** — one bad token can't block other transfers
- **EIP-712 gasless check-in** — owner signs typed data, relayer submits on-chain
- **Replay protection** — sequential nonce per owner + 7-day proof expiry

---

## Local development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)

### Setup

```bash
# Clone
git clone https://github.com/tenderdeve/crypto-will.git
cd crypto-will

# Install frontend deps
cd apps/web && npm install

# Start local chain
cd ../../contracts && anvil --chain-id 1337

# Deploy contracts + test tokens (new terminal)
forge script script/DeployLocal.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Copy logged addresses to apps/web/.env.local:
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_CHAIN_ID=1337
# NEXT_PUBLIC_KNOWN_TOKENS=0x...,0x...

# Start frontend (new terminal)
cd apps/web && npm run dev
```

### Run tests

```bash
cd contracts
forge test        # 49 tests
forge test -vvv   # verbose output
```

### Environment variables

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
NEXT_PUBLIC_KNOWN_TOKENS=0x...,0x...
NEXT_PUBLIC_GASLESS_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
RESEND_API_KEY=placeholder
BASE_RPC_URL=http://127.0.0.1:8545
EXECUTOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CRON_SECRET=test-cron-secret
```

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full deployment guide.

**Quick version:**

```bash
# 1. Deploy contract to Base Sepolia
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# 2. Deploy frontend to Vercel
cd apps/web
npx vercel --prod
```

### Deployed addresses

| Network | Address | Status |
|---------|---------|--------|
| Base Sepolia | [`0x1073293e0efeFBc14133a3ed5047BBD4095eA26B`](https://sepolia.basescan.org/address/0x1073293e0efeFBc14133a3ed5047BBD4095eA26B) | Verified |
| Base Mainnet | TBD | — |

---

## Security

- **Non-custodial** — contract holds approvals, not tokens
- **ReentrancyGuard** on all state-changing + ETH functions
- **Pull-payment** for ETH distribution (no push to unknown addresses)
- **EIP-712 replay protection** — sequential nonce + 7-day expiry
- **Partial failure tolerance** — `try/catch` on each token transfer
- **OpenZeppelin** — ECDSA, EIP712, ReentrancyGuard

**Audit status:** Pre-audit. Contract is verified on Basescan.

---

## License

MIT
