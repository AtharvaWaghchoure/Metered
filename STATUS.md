# Metered — Project Status

> Last updated: 2026-03-22

---

## Summary

Metered is a pay-per-call AI inference gateway where agents pay for AI in USDT0/USDC over HTTP using the x402 protocol and WDK self-custodial wallets. No API keys. No accounts. Just a wallet and money.

The project is **code-complete and submission-ready**. All features are implemented, all known risks have been resolved, and the project can be run today on Base Sepolia testnet with free USDC.

---

## File Structure

```
metered/
├── server/
│   ├── index.js              # x402 gateway + Groq proxy + self-hosted facilitator
│   └── pricing.js            # shared live state, network config
├── agent/
│   └── treasury.js           # autonomous treasury agent
├── client/
│   ├── demo.js               # single agent demo
│   └── multi-agent-demo.js   # two-agent coordination demo
├── openclaw/
│   ├── config.yml            # OpenClaw agent configuration
│   └── metered-plugin.js   # x402 fetch patch for OpenClaw
├── .env.example              # all environment variables documented
├── README.md                 # full project writeup
├── STATUS.md                 # this file
└── package.json              # all deps installed
```

---

## Component Details

### `server/index.js` — Gateway Server

The core of the project. An Express server that gates every AI inference route behind an x402 paywall.

**How it works:**
1. On startup, initialises a WDK self-custodial wallet (`GATEWAY_SEED_PHRASE`) to receive payments
2. Initialises an in-process x402 facilitator using `@semanticio/wdk-wallet-evm-x402-facilitator` — no external facilitator dependency
3. Registers all model routes with `x402HTTPResourceServer`
4. Patches `getRouteConfig` to read live prices from `.state.json` on every incoming request (no server restart needed when treasury agent updates prices)
5. On a paid request: Groq API is called, response returned with `price_paid_usdt` field
6. Records every request to `.state.json` for treasury agent demand tracking

**Models served:**

| Model ID | Label | Base Price |
|---|---|---|
| `llama-3.1-8b-instant` | Llama 3.1 8B Instant | $0.0002/call |
| `llama-3.3-70b-versatile` | Llama 3.3 70B Versatile | $0.001/call |
| `moonshard-deepseek-r1-distill-llama-70b` | DeepSeek R1 Distill 70B | $0.002/call |

**Public endpoints (no payment):**
- `GET /health` — liveness check
- `GET /models` — lists all models with live prices and endpoints

**Key implementation detail — dynamic pricing:**
`paymentMiddleware` compiles route configs once at startup. To allow live price updates, `getRouteConfig` is overridden on the `x402HTTPResourceServer` instance to inject the current price from `.state.json` on every payment check. This means the treasury agent can change prices at any time and the next request picks them up without a restart.

---

### `server/pricing.js` — Shared State

Manages the shared `.state.json` file that the server and treasury agent both read/write.

**Exports:**
- `CHAIN_CONFIG` — active network config (RPC, token address, symbol, decimals)
- `PLASMA_NETWORK` / `USDT0_PLASMA` — compatibility aliases
- `MODELS` — model registry with base prices from env vars
- `getPrice(modelId)` — reads live price from state file (falls back to base price)
- `setPrice(modelId, amount)` — treasury agent writes new prices here
- `recordRequest(modelId)` — server calls this on every paid inference
- `getRecentRequests(modelId)` — treasury agent reads hourly demand counts

**Network switching:**

Controlled by the `NETWORK` environment variable:

| `NETWORK` | Chain | Token | Use case |
|---|---|---|---|
| `plasma` (default) | Plasma (`eip155:9745`) | USDT0 | Mainnet, real money |
| `base-sepolia` | Base Sepolia (`eip155:84532`) | USDC | Testnet, free faucet |

---

### `agent/treasury.js` — Treasury Agent

Runs on a cron schedule (immediately + every hour). Fully autonomous — no human input required once started.

**Cycle steps:**

1. **Price adjustment** — reads hourly request counts for each model from `.state.json`, applies pricing rules:
   - `< 5 req/hr` → 20% discount (attract volume)
   - `5–50 req/hr` → hold base price
   - `50–100 req/hr` → 20% surge
   - `> 100 req/hr` → 50% surge
   - Writes new prices to `.state.json` → picked up by server on next request

2. **Balance check** — reads USDT0 balance on Plasma via `account.getTokenBalance()`

3. **Yield management** — two wallets: same seed phrase, different RPC:
   - `plasmaAccount` (Plasma RPC) — gateway payments wallet
   - `arbAccount` (Arbitrum RPC) — Aave yield wallet

   Logic:
   - If Plasma balance > `$5 reserve + $50 idle threshold`: bridge idle USDT0 Plasma → Arbitrum via LayerZero, poll for settlement (up to 3 minutes), supply to Aave V3 on Arbitrum
   - If Plasma balance < `$3`: withdraw `$50` from Aave on Arbitrum, bridge back to Plasma
   - Otherwise: hold liquid, log reasoning

4. **All decisions logged** as structured JSON with `ts`, `action`, `reasoning`, and data fields — full audit trail

**Bridge settlement polling:**
```
waitForBalance(arbAccount, USDT0_ARBITRUM, expectedAmount)
  → polls every 10s, up to 18 attempts (3 min max)
  → throws if timeout exceeded
```
This prevents the race condition where `aave.supply()` fires before LayerZero delivers the funds.

---

### `client/demo.js` — Single Agent Demo

Shows the minimal agent-side x402 payment flow:

1. Creates WDK self-custodial wallet from `CLIENT_SEED_PHRASE`
2. Calls `GET /models` to discover available models and live prices
3. Selects the cheapest model
4. Calls `POST /v1/chat/:model` via `wrapFetchWithPayment` — the x402 cycle (402 → sign EIP-3009 → retry) is fully transparent
5. Prints model, price paid, token usage, and response

Network (Plasma or Base Sepolia) inferred from `NETWORK` env var.

---

### `client/multi-agent-demo.js` — Multi-Agent Demo

Two fully autonomous AI agents, each with their own WDK wallet, collaborating on a research task:

**CoordinatorAgent** (`CLIENT_SEED_PHRASE`):
1. Calls Metered to break the research topic into 2 sub-questions (1 paid call)
2. Researches each sub-question (2 paid calls)
3. Synthesizes findings (1 paid call)
— 4 total payments, all from coordinator's wallet

**ResearchAgent** (`RESEARCHER_SEED_PHRASE`, falls back to `CLIENT_SEED_PHRASE`):
1. Independently verifies the coordinator's synthesis (1 paid call)
— 1 payment from researcher's own wallet

Both agents operate without any human involvement. Research topic configurable via `RESEARCH_TOPIC` env var.

---

### `openclaw/` — OpenClaw Integration

**`config.yml`** — Configures an OpenClaw agent to use Metered as a custom AI provider. The agent gets a system prompt that tells it it has a self-custodial WDK wallet and pays per call. WDK agent skills give it wallet operations (create, send, swap, bridge).

**`metered-plugin.js`** — Solves the core OpenClaw x402 problem: OpenClaw's custom provider feature just sets a base URL, it doesn't know about 402 responses. This plugin:
1. Initialises a WDK wallet from `WALLET_SEED_PHRASE`
2. Creates an x402 payment client with the wallet as signer
3. Patches `globalThis.fetch` with `wrapFetchWithPayment`

Since OpenClaw uses the global fetch for all HTTP calls, every request to Metered automatically handles the 402 → sign → retry cycle transparently.

Run with: `pnpm openclaw` (loads plugin via `--plugin` flag)

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@tetherto/wdk-wallet-evm` | `1.0.0-beta.10` | Self-custodial EVM wallets |
| `@tetherto/wdk-protocol-lending-aave-evm` | `1.0.0-beta.3` | Aave V3 supply/withdraw on Arbitrum |
| `@tetherto/wdk-protocol-bridge-usdt0-evm` | `1.0.0-beta.3` | USDT0 bridge via LayerZero |
| `@x402/express` | `2.7.0` | x402 payment middleware |
| `@x402/fetch` | `2.7.0` | x402 client (buyer side) |
| `@x402/evm` | `2.7.0` | EVM payment schemes |
| `@x402/core` | `2.7.0` | Facilitator core |
| `@semanticio/wdk-wallet-evm-x402-facilitator` | `1.0.0-beta.2` | In-process x402 facilitator |
| `openai` | `6.32.0` | Groq API (OpenAI-compatible) |
| `openclaw` | `2026.3.13` | OpenClaw agent runtime |
| `express` | `4.22.1` | HTTP server |
| `node-cron` | `3.0.3` | Treasury agent scheduling |
| `dotenv` | `16.6.1` | Environment config |

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GATEWAY_SEED_PHRASE` | Yes | — | Wallet that receives x402 payments |
| `FACILITATOR_SEED_PHRASE` | No | `GATEWAY_SEED_PHRASE` | Wallet that submits settlement txs (needs native gas) |
| `TREASURY_SEED_PHRASE` | Yes | — | Treasury agent wallet (Plasma + Arbitrum) |
| `CLIENT_SEED_PHRASE` | Yes | — | Paying client wallet (needs USDT0/USDC) |
| `RESEARCHER_SEED_PHRASE` | No | `CLIENT_SEED_PHRASE` | Second agent wallet for multi-agent demo |
| `WALLET_SEED_PHRASE` | No | — | OpenClaw agent wallet |
| `GROQ_API_KEY` | Yes | — | Groq API key (`gsk_...`) |
| `NETWORK` | No | `plasma` | `plasma` or `base-sepolia` |
| `PORT` | No | `4021` | Gateway server port |
| `GATEWAY_URL` | No | `http://localhost:4021` | Gateway URL for clients |
| `RESEARCH_TOPIC` | No | (hardcoded default) | Topic for multi-agent demo |
| `PRICE_SMALL` | No | `200` | Llama 8B base price (micro-USDT0) |
| `PRICE_MEDIUM` | No | `1000` | Llama 70B base price |
| `PRICE_LARGE` | No | `2000` | DeepSeek 70B base price |

---

## How to Run

### Testnet (Base Sepolia — free, no real money)

```sh
# 1. Get test ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# 2. Get test USDC: https://faucet.circle.com (select Base Sepolia)

cp .env.example .env
# Fill in: GATEWAY_SEED_PHRASE, CLIENT_SEED_PHRASE, GROQ_API_KEY
# NETWORK=base-sepolia is already set

pnpm server          # terminal 1 — start gateway
pnpm client          # terminal 2 — run single agent demo
pnpm multi-agent     # terminal 2 — run two-agent demo
pnpm agent           # terminal 3 — start treasury agent
pnpm openclaw        # terminal 4 — start OpenClaw agent
```

### Mainnet (Plasma — real USDT0)

```sh
# Change in .env:
NETWORK=plasma

# Fund CLIENT_SEED_PHRASE wallet with USDT0 on Plasma
# (bridge from Ethereum using WDK bridge or acquire directly)

pnpm server
pnpm client
```

---

## Resolved Risks

| Risk | Resolution |
|---|---|
| Semantic Pay facilitator version mismatch | Replaced with `@semanticio/wdk-wallet-evm-x402-facilitator` running in-process — no external service dependency |
| Bridge latency race condition (supply to Aave before funds arrive) | `waitForBalance()` polls Arbitrum every 10s, up to 3 minutes, before calling `aave.supply()` |
| OpenClaw doesn't natively handle 402 responses | `metered-plugin.js` patches `globalThis.fetch` with `wrapFetchWithPayment` at plugin activation |
| Aave V3 not deployed on Plasma | Treasury agent uses Arbitrum for Aave yield — same seed phrase, Arbitrum RPC |
| Static pricing (treasury agent price changes require server restart) | `getRouteConfig` overridden on `x402HTTPResourceServer` instance to read `.state.json` live on every payment check |

---

## What Remains

All code and operational verification is complete:

- [x] `.env` configured with seed phrases and Groq API key
- [x] Client wallet funded with test USDC on Base Sepolia (Circle faucet)
- [x] End-to-end x402 payment verified — agent pays $0.0002 USDC, receives AI response
- [ ] Record a demo video showing the end-to-end flow
- [ ] Submit on the hackathon portal

### Bug fix applied

The `@semanticio/wdk-wallet-evm-x402-facilitator` has a bug in `readContract()` — it calls `contract[functionName](...args)` which in ethers v6 tries to send a transaction for non-view functions instead of doing a static call. Fixed via `patches/fix-facilitator.js` (postinstall script) which patches it to use `contract[functionName].staticCall(...args)`.
