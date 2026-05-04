# Smart Contract — CryptoWill

## Overview

Solidity smart contract on Base (L2) that manages crypto wills. Holds token approvals, tracks alive heartbeats, and executes fund transfers when grace period expires.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Solidity | ^0.8.24 | Contract language |
| Foundry | latest | Build, test, deploy |
| OpenZeppelin | ^5.x | ReentrancyGuard, IERC20 |
| Base Sepolia | — | Testnet deployment |
| Base Mainnet | — | Production deployment |

---

## Contract Architecture

### CryptoWill.sol — Core Contract

```
CryptoWill.sol
├── Structs
│   └── Will { owner, beneficiary, tokens[], lastAlive, gracePeriod, active }
├── State
│   ├── mapping(address => Will) public wills
│   └── mapping(address => uint256) public ethBalances
├── Functions
│   ├── createWill(beneficiary, tokens[], gracePeriod) → external
│   ├── signAlive() → external, onlyOwner
│   ├── executeWill(owner) → external, anyone (after grace)
│   ├── revokeWill() → external, onlyOwner
│   ├── updateBeneficiary(newBeneficiary) → external, onlyOwner
│   ├── depositETH() → external payable
│   └── getWill(owner) → external view
└── Events
    ├── WillCreated(owner, beneficiary, gracePeriod)
    ├── AliveConfirmed(owner, timestamp)
    ├── WillExecuted(owner, beneficiary, tokenCount)
    └── WillRevoked(owner)
```

---

## Rules & Conventions

### Code Style
- Use Solidity style guide (NatSpec comments on all public functions)
- 4-space indentation
- Events emitted for every state change
- Custom errors over require strings (gas efficient)

### Security Rules
1. **ReentrancyGuard** on `executeWill` and `depositETH`
2. **Checks-Effects-Interactions** pattern everywhere
3. No `delegatecall` usage
4. All external calls at end of function
5. Token transfers via `SafeERC20` (handles non-standard tokens)
6. Grace period minimum: 30 days (prevent accidental execution)
7. No `selfdestruct`

### Testing Rules
- 100% function coverage required
- Test every revert path
- Fuzz tests for grace period boundary
- Integration test: full lifecycle (create → alive → miss → execute)
- Gas snapshot for all public functions

---

## Folder Structure

```
contracts/
├── src/
│   ├── CryptoWill.sol          # Core contract
│   └── interfaces/
│       └── ICryptoWill.sol     # Interface
├── test/
│   ├── CryptoWill.t.sol        # Unit tests
│   ├── CryptoWill.fuzz.t.sol   # Fuzz tests
│   └── mocks/
│       └── MockERC20.sol       # Test token
├── script/
│   └── Deploy.s.sol            # Deployment script
├── foundry.toml
└── .env.example
```

---

## Deployment

### Testnet (Base Sepolia)
```bash
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
```

### Mainnet (Base)
```bash
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

---

## Key Design Decisions

1. **Approval-based, not custodial** — Contract holds ERC-20 approvals, not tokens. User retains full control until execution.
2. **Permissionless execution** — Anyone can call `executeWill()` after grace expires. No trusted executor needed.
3. **Single will per address** — Simplifies MVP. Multi-will in v2.
4. **ETH handled separately** — User deposits ETH into contract (custodial for ETH only). ERC-20 stays in user wallet.
5. **No proxy/upgradeable** — MVP ships immutable. Upgrade path via migration contract in v2.
