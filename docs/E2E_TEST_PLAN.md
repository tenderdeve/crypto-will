# E2E Test Plan — CryptoWill Full Lifecycle

Tests the complete will lifecycle on Base Sepolia testnet.
Requires a deployed contract (see `docs/DEPLOYMENT.md`).

---

## Test Environment Setup

```bash
# Wallets needed (all funded with Base Sepolia ETH)
OWNER_WALLET=0x...        # will creator
BENEFICIARY_WALLET=0x...  # receives assets on execution
EXECUTOR_WALLET=0x...     # calls executeWill() permissionlessly

# Test ERC-20 tokens (deploy with DeployLocal.s.sol or use public testnet tokens)
TOKEN_A=0x...   # tUSDC
TOKEN_B=0x...   # tWETH
```

---

## Test Suite 1 — Will Creation

**TC-01: Create will**
1. Connect OWNER_WALLET in browser
2. Navigate to /create
3. Enter BENEFICIARY_WALLET address + email + 90-day grace period
4. Add TOKEN_A and TOKEN_B
5. Approve both tokens (two ERC-20 approve txs)
6. Click "Create Will"
7. ✅ Tx confirms on-chain
8. ✅ Dashboard shows will with active status
9. ✅ Database: `wills` table has new row with status `active`

**TC-02: Wrong network guard**
1. Switch MetaMask to Ethereum Mainnet
2. ✅ Red banner appears: "Wrong network — switch to Base Sepolia"
3. Click switch button → wallet prompts → banner disappears

**TC-03: Create page ETH warning**
1. Step 1: ✅ Info box explains wallet ETH is not automatically included

---

## Test Suite 2 — Alive Checks

**TC-04: Sign alive from dashboard**
1. Navigate to /dashboard
2. Click "Sign Alive"
3. ✅ Wallet prompts for tx
4. ✅ "Alive check confirmed on-chain. Timer reset."
5. ✅ `signAlive()` call visible on Basescan
6. ✅ Database: `alive_checks` table NOT updated (dashboard path skips check creation)
7. ✅ Database: will `last_alive_at` updated via `/api/alive`

**TC-05: Sign alive from email link**
1. Trigger cron manually: `GET /api/cron/send-alive-checks`
2. ✅ Email received at owner address
3. Click link in email → navigate to `/alive/[token]`
4. ✅ Wallet address shown, user prompted to connect
5. Click "Sign Alive" → wallet prompts for tx
6. ✅ "Your alive status has been confirmed on-chain."
7. ✅ `alive_checks` row updated: status → `confirmed`, `responded_at` set

**TC-06: Token replay prevention**
1. Revisit the same /alive/[token] URL after confirming
2. ✅ Page shows "Invalid or expired token" (token status is `confirmed`, not `sent`)

---

## Test Suite 3 — Dashboard Management

**TC-07: ETH deposit**
1. Navigate to /dashboard → ETH Deposit card
2. Enter 0.01 ETH → click Deposit
3. ✅ Wallet prompts payable tx
4. ✅ Card shows "0.01 ETH" after confirm

**TC-08: Token list update**
1. Navigate to /dashboard → Token List card
2. Remove TOKEN_A, add a new token address
3. Click "Save Token Changes"
4. ✅ Contract `updateTokens()` called, token list updated on-chain

**TC-09: Update beneficiary**
1. Navigate to /dashboard → Update Beneficiary card
2. Enter a new beneficiary address
3. ✅ Validation rejects: self-address, same-as-current, invalid hex
4. Valid address → click Update → ✅ tx confirms, card shows new address

**TC-10: Revoke confirmation guard**
1. Navigate to /dashboard → Actions
2. Click "Revoke Will" → ✅ confirmation box appears
3. Click Cancel → ✅ box dismissed, no tx
4. Click "Revoke Will" again → "Yes, Revoke"
5. Reject in MetaMask → ✅ box dismisses, no stuck state
6. Click "Revoke Will" → "Yes, Revoke" → confirm in wallet
7. ✅ Will deleted on-chain
8. ✅ Dashboard shows "No Will Found"
9. ✅ Database: will status → `revoked`
10. ✅ Deposited ETH refunded to owner wallet

---

## Test Suite 4 — Will Execution (Grace Period Expired)

> ⚠️ Requires manipulating block time (only possible on local Anvil or by waiting).
> On Base Sepolia: wait full grace period (90 days) OR use Anvil for this test.

**TC-11: Grace period expiry and execution (Anvil)**
```bash
# Fast-forward time past grace period
cast rpc anvil_increaseTime 7776001   # 90 days + 1 second
cast rpc anvil_mine 1
```

1. From EXECUTOR_WALLET, call `executeWill(OWNER_WALLET)`:
   ```bash
   cast send $CONTRACT "executeWill(address)" $OWNER_WALLET \
     --rpc-url http://127.0.0.1:8545 \
     --private-key $EXECUTOR_PRIVATE_KEY
   ```
2. ✅ TOKEN_A and TOKEN_B balance transferred to BENEFICIARY_WALLET
3. ✅ ETH credited to `pendingETH[BENEFICIARY_WALLET]`
4. ✅ `WillExecuted` event emitted
5. BENEFICIARY_WALLET calls `claimETH()`:
   ```bash
   cast send $CONTRACT "claimETH()" \
     --rpc-url http://127.0.0.1:8545 \
     --private-key $BENEFICIARY_PRIVATE_KEY
   ```
6. ✅ ETH transferred to beneficiary

**TC-12: Partial token failure (one bad token)**
1. Include a non-ERC20 address in the will token list
2. Execute will after grace period
3. ✅ Other tokens transfer successfully
4. ✅ `TokenTransferFailed` event emitted for bad token
5. ✅ Will execution completes (not reverted)

---

## Test Suite 5 — Edge Cases

**TC-13: Missing alive check (cron simulation)**
1. Trigger `GET /api/cron/check-expired`
2. ✅ Wills past grace + last_alive check are detected
3. ✅ Email notification sent to beneficiary (if implemented)

**TC-14: Zero-balance token warning**
1. On create page, manually add a token address not in wallet
2. ✅ Amber warning: "No balance detected. Token included but won't transfer if empty at execution."
3. Warning also shows in Step 3 review

---

## Verification Checklist

| Check | Tool |
|-------|------|
| Contract events on-chain | Basescan / `cast logs` |
| Database state | Supabase dashboard |
| Email delivery | Resend dashboard logs |
| Frontend state updates | Browser + React DevTools |

---

## Known Limitations (Out of Scope for E2E)

- Grace period cannot be shortened — must wait 30–180 days on testnet or use Anvil
- Cron jobs require Vercel deployment (or manual `GET /api/cron/*` triggers)
- ETH faucet tokens are rate-limited
