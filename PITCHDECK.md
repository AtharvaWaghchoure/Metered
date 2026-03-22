# Metered — Pitch Deck

---

## Slide 1 — Problem

### AI agents can't pay for their own compute

Today's AI agents have a fundamental flaw: they need humans to manage API keys, billing accounts, and payment rails. This breaks the vision of truly autonomous agents.

- **API keys leak.** Every agent needs a secret rotated by a human. One breach = total exposure.
- **Billing is centralized.** One credit card funds all agents — no per-agent accountability, no fine-grained cost control.
- **Agents can't earn and spend.** There's no native way for an agent to receive revenue from one service and pay another — without a human bank account in the middle.

> "An AI agent that needs a human to top up its balance isn't autonomous — it's remote-controlled."

---

## Slide 2 — Solution

### Metered: Pay-per-call AI inference, settled on-chain in real time

Metered is an AI API gateway where **agents pay for every inference call in USDT0 over HTTP** — no API keys, no accounts, no humans in the loop.

**How a call works:**
1. Agent sends a chat request to Metered
2. Server returns `HTTP 402 Payment Required` with price + payment address
3. Agent's WDK wallet signs an EIP-3009 authorization and retries
4. Payment settles on Plasma in ~1 second
5. Agent receives its AI response

**That's it.** One HTTP round-trip. The agent paid for its own compute.

**Live demo flow:**
- `pnpm server` — start the gateway
- `pnpm client` — agent discovers models, picks the cheapest, pays, gets a response
- `pnpm multi-agent` — two agents with separate wallets collaborate autonomously, each paying their own way
- `pnpm openclaw` — drop-in upgrade: any OpenClaw agent becomes a paying participant

---

## Slide 3 — How It Works

### Three layers, all WDK-native

**AI Agents** — the paying clients
- Each agent has a WDK self-custodial wallet (no API keys, no accounts)
- `wrapFetchWithPayment` handles the 402 → sign → retry cycle transparently
- Works with custom code (`client/demo.js`, `multi-agent-demo.js`) and OpenClaw (`metered-plugin.js`)

**Metered Gateway** — the paywall
- Express server with x402 payment middleware on every inference route
- In-process WDK x402 facilitator — verifies and settles payments with no external service dependency
- Groq AI backend (Llama 3.1 8B, Llama 3.3 70B, DeepSeek R1 70B)
- Prices read live from `.state.json` on every request — no restart needed when treasury updates them

**Treasury Agent** — autonomous capital manager (runs every hour)
- Reads hourly request counts and adjusts prices 0.8×–1.5× based on demand
- Bridges idle USDT0 from Plasma → Arbitrum via LayerZero when balance exceeds $50 reserve
- Supplies bridged funds to Aave V3 on Arbitrum for yield
- Polls for bridge settlement before supplying (prevents race condition)
- Withdraws from Aave and bridges back when Plasma balance drops below $3

**WDK features used:**
| Feature | Where |
|---|---|
| Self-custodial EVM wallet | Every agent, gateway, treasury |
| x402 payment client | `wrapFetchWithPayment` on all agents |
| x402 facilitator (in-process) | Gateway — verifies + settles payments |
| USDT0 bridge (LayerZero) | Treasury — Plasma ↔ Arbitrum |
| Aave V3 lending | Treasury — yield on idle capital |

**Networks:**
- **Plasma** (`eip155:9745`) — payment rail, near-zero fees, USDT0
- **Arbitrum** — Aave V3 yield on idle gateway revenue
- **Base Sepolia** — testnet mode, free USDC faucet, zero real money needed

---

## Slide 4 — Why Metered Wins

### Direct fit with every judging criterion

| Criterion | Metered |
|---|---|
| **WDK integration depth** | Wallet creation, x402 payment client, in-process facilitator, USDT0 bridge, Aave lending — 5 WDK primitives in one project |
| **Real economic activity** | Every AI call is a live on-chain USDT0 payment on Plasma — not simulated, not mocked |
| **Agent autonomy** | Agents pay for their own compute. Treasury agent manages yield. Zero human intervention required once started |
| **Production-readiness** | Mainnet (Plasma) and testnet (Base Sepolia) both supported. Dynamic pricing. Bridge latency handled. No external dependencies |
| **Novel use case** | First AI gateway where the gateway *itself* earns yield on its revenue via DeFi — the money works while it waits |

**Numbers that tell the story:**
- $0.0002 per call on the cheapest model
- ~1 second payment settlement on Plasma
- 5 agents can run fully autonomously with 0 API keys
- Treasury manages yield across 2 chains with 1 seed phrase

---

## Slide 5 — The Bigger Picture

### Metered is infrastructure for the agent economy

Today: one developer, one project, one gateway.

Tomorrow: any AI framework (LangChain, AutoGen, CrewAI, OpenClaw) adds one line — `wrapFetchWithPayment(fetch, wallet)` — and its agents become first-class economic participants. They pay for compute, earn from services, and manage their own capital.

**What this unlocks:**
- **Per-agent billing** — charge individual agents, not teams or companies
- **Agent marketplaces** — agents pay each other for specialized services
- **Self-sustaining AI infrastructure** — gateways that fund their own operation from inference revenue
- **DeFi-native AI** — idle AI revenue automatically deployed to yield protocols

**The stack is already built.** This isn't a prototype — it's a working system you can run today on Base Sepolia testnet with free USDC.

> Metered makes AI agents economically sovereign.
> WDK makes it possible.

---

*Built for Hackathon Galáctica: WDK Edition 1 by Tether*
*Stack: WDK · x402 · Plasma · Arbitrum · Aave V3 · LayerZero · Groq · OpenClaw*
