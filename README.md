# Metered

> Pay-per-call AI inference gateway where any agent pays for AI in USDC over HTTP. No API keys. No accounts. Just a wallet and money.

Built for **Hackathon Galactica: WDK Edition 1** | Track: **Agent Wallets**

---

## The Problem

Today, accessing AI APIs requires creating an account, storing API keys, and managing billing cycles. This works fine for humans. It breaks completely for AI agents.

An autonomous agent can't sign up for an account. It can't receive a verification email. It can't manage a billing relationship. If agents are going to be real economic participants, they need a payment primitive that works the same way HTTP works: stateless, open, and programmable.

---

## What Metered Does

Metered is an AI inference gateway built around the **x402 protocol** and **WDK self-custodial wallets**.

Instead of API keys, callers pay per request in **USDC** on **Base Sepolia** (or **USDT0** on **Plasma** for mainnet). The gateway receives the payment, verifies it on-chain, and returns the AI response in a single HTTP round trip.

```
Agent                          Metered Gateway
  |                                   |
  |--- POST /v1/chat/llama-3.3-70b -->|
  |                                   |
  |<-- 402 Payment Required ----------|  price: $0.001 USDC
  |                                   |
  |--- POST (+ X-Payment header) ---->|  signed EIP-3009 authorization
  |                                   |
  |         [on-chain settlement]      |  Base Sepolia, ~1s
  |                                   |
  |<-- 200 { content, usage } --------|  AI response
```

---

## Architecture

### 1. Gateway Server (`server/`)

Express server with x402 payment middleware. On every request:

1. Middleware checks for payment header
2. If missing, responds with `402 Payment Required` and the price
3. Agent signs EIP-3009 `transferWithAuthorization` with WDK wallet and retries
4. In-process facilitator verifies signature and settles on-chain
5. Request reaches Groq API, AI response returned

Prices are live. The treasury agent can update them anytime without restarting the server.

### 2. Treasury Agent (`agent/`)

Autonomous agent running every hour:

- **Dynamic pricing** based on demand (discount at low traffic, surge at high traffic)
- **Yield generation** by supplying idle USDT0 to Aave V3 on Arbitrum
- **Liquidity management** by withdrawing from Aave when balance is low
- All decisions logged as structured JSON

### 3. Client Demos (`client/`)

- `demo.js` - Single agent paying for inference
- `multi-agent-demo.js` - Two agents collaborating on a research task, each paying from their own wallet

### 4. Dashboard (`dashboard/`)

Next.js frontend with a live demo showing:
- 402 rejection when requesting without a wallet (proves the paywall works)
- Full agent payment flow with WDK wallet (proves payment works)
- On-chain transaction proof linked to block explorer

### 5. OpenClaw Integration (`openclaw/`)

Plugin that patches `globalThis.fetch` with x402 payment support, letting any OpenClaw agent use Metered transparently.

---

## Models

| Model | Base Price |
|---|---|
| Llama 3.1 8B Instant | $0.0002/call |
| Llama 3.3 70B Versatile | $0.001/call |
| DeepSeek R1 Distill 70B | $0.002/call |

Prices adjust dynamically based on demand.

---

## Stack

| Layer | Technology |
|---|---|
| Wallets | WDK (`@tetherto/wdk-wallet-evm`) |
| Payment Protocol | x402 (`@x402/express`, `@x402/fetch`, `@x402/evm`) |
| Settlement | Base Sepolia (testnet) / Plasma (mainnet) |
| Token | USDC (testnet) / USDT0 (mainnet) |
| Facilitator | In-process (`@semanticio/wdk-wallet-evm-x402-facilitator`) |
| AI Backend | Groq API (Llama, DeepSeek) |
| Yield | Aave V3 via `@tetherto/wdk-protocol-lending-aave-evm` |
| Bridge | LayerZero via `@tetherto/wdk-protocol-bridge-usdt0-evm` |
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |

---

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A BIP-39 seed phrase (12 words) for wallets
- A Groq API key (free at https://console.groq.com)

### Step 1: Clone and Install

```sh
git clone https://github.com/YOUR_USERNAME/Metered.git
cd Metered
pnpm install
```

The `postinstall` script automatically patches a known ethers v6 bug in the x402 facilitator adapter.

### Step 2: Configure Environment

```sh
cp .env.example .env
```

Edit `.env` with your values:

```env
# Gateway wallet (receives payments)
GATEWAY_SEED_PHRASE="your twelve word seed phrase for the gateway"

# Facilitator wallet (submits settlement txs, needs native gas on the chain)
# Falls back to GATEWAY_SEED_PHRASE if not set
FACILITATOR_SEED_PHRASE="your twelve word seed phrase"

# Client wallet (the agent that pays for AI)
CLIENT_SEED_PHRASE="your twelve word seed phrase with USDC"

# Groq API key
GROQ_API_KEY="gsk_..."

# Network: "base-sepolia" for testnet (free), "plasma" for mainnet (real money)
NETWORK=base-sepolia
```

**Important:** The gateway and client MUST use different seed phrases (different wallets). An address cannot pay itself via EIP-3009.

### Step 3: Fund Wallets (Testnet)

For Base Sepolia testnet, you need free test tokens:

1. **Get test ETH** for gas: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. **Get test USDC** for payments: https://faucet.circle.com (select Base Sepolia)

Fund both the **client wallet** and the **facilitator wallet** (or gateway wallet if using the same).

To find your wallet addresses, run:

```sh
node -e "
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
const a = await new WalletManagerEvm('YOUR_SEED_PHRASE', {provider:'https://sepolia.base.org'}).getAccount();
console.log(await a.getAddress());
"
```

### Step 4: Run the Gateway

```sh
# Terminal 1: Start the gateway server
pnpm server

# Terminal 2: Run the single agent demo
pnpm client

# Terminal 3 (optional): Start the treasury agent
pnpm agent

# Terminal 4 (optional): Run the multi-agent demo
pnpm multi-agent
```

### Step 5: Run the Dashboard

```sh
# Install dashboard dependencies (first time only)
cd dashboard && pnpm install && cd ..

# Start the dashboard (runs on port 3000)
pnpm dashboard
```

Open http://localhost:3000 in your browser. The dashboard proxies API calls to the gateway at localhost:4021.

---

## API Reference

### `GET /models` (free, no payment)

Returns available models and live prices.

```json
{
  "models": [
    {
      "id": "llama-3.1-8b-instant",
      "label": "Llama 3.1 8B Instant",
      "price_usdt": 0.0002,
      "endpoint": "/v1/chat/llama-3.1-8b-instant",
      "network": "eip155:84532"
    }
  ],
  "gateway": "0x..."
}
```

### `POST /v1/chat/:model` (requires x402 payment)

```json
// Request
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "max_tokens": 1024,
  "system": "Optional system prompt"
}

// Response
{
  "model": "llama-3.3-70b-versatile",
  "price_paid_usdt": 0.001,
  "content": "Hello! How can I help you?",
  "usage": { "prompt_tokens": 10, "completion_tokens": 8 }
}
```

### `GET /health` (free)

Returns `{ "status": "ok" }`.

---

## Notable Implementation Details

**In-process facilitator:** Instead of depending on a third-party hosted facilitator, we run the x402 facilitator in the same process as the gateway using `@semanticio/wdk-wallet-evm-x402-facilitator`. This eliminates version mismatch issues.

**Live dynamic pricing:** The x402 middleware compiles route configs once at startup. We override `getRouteConfig` on the `x402HTTPResourceServer` to inject current prices from the state file on every payment check. No restart needed when the treasury agent changes prices.

**ethers v6 staticCall patch:** The WDK x402 facilitator has a bug where `readContract()` calls `contract[functionName](...args)` which tries to send a transaction in ethers v6. We patch it to use `.staticCall()` via `patches/fix-facilitator.js`.

---

## Why This Matters

The x402 protocol turns payment into a native HTTP primitive. Combined with WDK self-custodial wallets, any agent running anywhere can access AI compute without a human setting up an account. The agent discovers the price, signs the payment, gets the resource, and moves on. No human in the loop. No API key rotation. No billing dashboard.

Metered is a complete demonstration of agent-native infrastructure.
