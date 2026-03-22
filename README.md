# Metered

> A pay-per-call AI inference gateway where anyone — human or agent — pays for AI in USDT0 over HTTP, with no API keys, no accounts, and no signup.

Built for **Hackathon Galáctica: WDK Edition 1** — track: **Agent Wallets**.

---

## The Problem

Today, accessing AI APIs requires:
- Creating an account
- Storing API keys
- Managing billing cycles

This works fine for humans. It breaks completely for AI agents.

An autonomous agent can't sign up for an account. It can't receive a verification email. It can't manage a billing relationship. If agents are going to be real economic participants — paying for compute, data, and services — they need a payment primitive that works the same way HTTP works: stateless, open, and programmable.

---

## What Metered Does

Metered is an AI inference gateway built entirely around the **x402 protocol** and **WDK self-custodial wallets**.

Instead of API keys, callers pay per request in **USDT0** on the **Plasma chain** (near-instant, near-zero fees). The gateway receives the payment, verifies it on-chain, and returns the AI response — all in a single HTTP round trip.

Any agent with a WDK wallet and some USDT0 can call any model on the gateway. No registration. No trust relationship. Just money and HTTP.

```
Agent                          Metered Gateway
  |                                   |
  |--- POST /v1/chat/llama-3.3-70b -->|
  |                                   |
  |<-- 402 Payment Required ----------|  ← price: $0.001 USDT0
  |                                   |
  |--- POST (+ X-Payment header) ---->|  ← signed EIP-3009 authorization
  |                                   |
  |         [on-chain settlement]     |  ← Plasma, ~1s, ~$0.00001 fee
  |                                   |
  |<-- 200 { content, usage } --------|  ← AI response
```

---

## How It Works

### Three components

**1. Gateway Server** (`server/`)

An Express server with x402 payment middleware in front of every AI route. When a request arrives:

1. The middleware checks for a payment header
2. If missing, it responds with `402` and the price in USDT0
3. The caller signs an EIP-3009 authorization with their WDK wallet and retries
4. The Semantic facilitator verifies the signature and settles on-chain
5. The request reaches the AI backend (Groq) and the response is returned

Prices are **live** — the treasury agent can update them at any time and the next request picks up the new price automatically, with no server restart.

**2. Treasury Agent** (`agent/`)

An autonomous agent that runs every hour and manages the gateway's economics:

- **Dynamic pricing** — adjusts per-model prices based on demand in the last hour
  - `< 5 req/hr` → 20% discount to attract volume
  - `50–100 req/hr` → 20% surge
  - `> 100 req/hr` → 50% surge
- **Yield generation** — when idle USDT0 balance exceeds $50, supplies to Aave V3 to earn interest
- **Liquidity management** — when balance drops below $3, withdraws from Aave to restore liquidity
- Logs every decision with structured JSON reasoning — full audit trail

The treasury agent never requires human input. It reads demand data from a shared state file written by the server, makes its own decisions, and executes them.

**3. Client Demo** (`client/`)

Shows the full agent-side flow:

1. Create a self-custodial WDK wallet
2. Discover available models and live prices from the public `/models` endpoint
3. Select the cheapest model
4. Call it — `wrapFetchWithPayment` handles the 402 → sign → retry cycle transparently
5. Receive and display the response

---

## Models

| Model | Price per call |
|---|---|
| Llama 3.1 8B Instant | $0.0002 |
| Llama 3.3 70B Versatile | $0.001 |
| DeepSeek R1 Distill 70B | $0.002 |

Prices adjust dynamically based on demand. Check `/models` for live prices.

---

## Stack

| Layer | Technology |
|---|---|
| Wallets | WDK (`@tetherto/wdk-wallet-evm`) |
| Payment protocol | x402 (`@x402/express`, `@x402/fetch`) |
| Settlement chain | Plasma (EVM, `eip155:9745`) |
| Payment token | USDT0 (`0xB8CE59FC3717...`) |
| Facilitator | Semantic Pay (`x402.semanticpay.io`) |
| AI backend | Groq API |
| Yield | Aave V3 (`@tetherto/wdk-protocol-lending-aave-evm`) |

---

## Setup

### 1. Install

```sh
pnpm install
```

### 2. Configure

```sh
cp .env.example .env
```

Fill in `.env`:

```env
GATEWAY_SEED_PHRASE="twelve word mnemonic for the gateway wallet"
TREASURY_SEED_PHRASE="twelve word mnemonic for the treasury agent"
CLIENT_SEED_PHRASE="twelve word mnemonic for the paying client"
GROQ_API_KEY="gsk_..."
```

### 3. Fund the client wallet

The client wallet needs USDT0 on Plasma. Bridge from Ethereum using the WDK bridge or acquire directly on Plasma.

### 4. Run

```sh
# Terminal 1 — gateway
pnpm server

# Terminal 2 — treasury agent (autonomous, runs hourly)
pnpm agent

# Terminal 3 — run the paying client demo
pnpm client
```

---

## API

### `GET /models`
Returns available models and live prices. No payment required.

```json
{
  "models": [
    {
      "id": "llama-3.1-8b-instant",
      "label": "Llama 3.1 8B Instant",
      "price_usdt": 0.0002,
      "endpoint": "/v1/chat/llama-3.1-8b-instant",
      "network": "eip155:9745"
    }
  ],
  "gateway": "0x..."
}
```

### `POST /v1/chat/:model`
Requires x402 payment. Returns AI response.

**Request body:**
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "max_tokens": 1024,
  "system": "Optional system prompt"
}
```

**Response:**
```json
{
  "model": "llama-3.3-70b-versatile",
  "price_paid_usdt": 0.001,
  "content": "Hello! How can I help you?",
  "usage": { "prompt_tokens": 10, "completion_tokens": 8 }
}
```

### `GET /health`
Returns `{ "status": "ok" }`. No payment required.

---

## Why This Matters

The x402 protocol turns payment into a native HTTP primitive. Combined with WDK self-custodial wallets, it means any agent — running anywhere, owned by anyone — can access AI compute without a human ever setting up an account.

This is what agent-native infrastructure looks like: the agent discovers the price, signs the payment, gets the resource, and moves on. No human in the loop. No API key rotation. No billing dashboard.

Metered is a small but complete demonstration of that idea.
