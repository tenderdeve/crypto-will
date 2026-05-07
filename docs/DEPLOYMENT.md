# Deployment Guide

## Prerequisites

- Funded deployer wallet on Base Sepolia (get ETH from [Coinbase faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
- Basescan API key (from [basescan.org](https://basescan.org/apis))
- Alchemy or Infura RPC URLs for Base Sepolia and Base Mainnet

---

## 1. Configure environment

```bash
# contracts/.env
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0x...       # deployer wallet private key (never commit this)
BASESCAN_API_KEY=...
```

---

## 2. Build and test

```bash
cd contracts
forge build
forge test
```

All 42 tests must pass before deploying.

---

## 3. Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

The script logs the deployed address. Copy it to your frontend env:

```bash
# apps/web/.env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...    # paste deployed address here
NEXT_PUBLIC_CHAIN_ID=84532
```

Broadcast artifacts are saved to `contracts/broadcast/Deploy.s.sol/84532/`.

---

## 4. Verify on Basescan (if --verify flag failed)

```bash
forge verify-contract \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  <DEPLOYED_ADDRESS> \
  contracts/src/CryptoWill.sol:CryptoWill
```

View on Basescan: `https://sepolia.basescan.org/address/<DEPLOYED_ADDRESS>`

---

## 5. Deploy to Base Mainnet

Same command with `--rpc-url base` and `--chain 8453`.

```bash
forge script script/Deploy.s.sol \
  --rpc-url base \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Update frontend:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=8453
```

---

## Deployed Addresses

| Network | Address | Basescan |
|---------|---------|---------|
| Base Sepolia | `TBD` | — |
| Base Mainnet | `TBD` | — |

*Update this table after deployment.*

---

## Local development (Anvil)

```bash
# Terminal 1: start local chain
cd contracts && anvil

# Terminal 2: deploy with test tokens
forge script script/DeployLocal.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast

# Copy logged address to apps/web/.env.local:
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_CHAIN_ID=31337
```
