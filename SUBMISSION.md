# Metered - Hackathon Submission Answers

Copy-paste these answers into the submission form.

---

## Vision (under 256 characters)

AI agents pay for compute like humans pay for coffee. Metered makes any AI API payable over HTTP using WDK wallets and the x402 protocol. No API keys, no accounts. Just a wallet and USDC.

---

## Short description (max 100 characters)

AI gateway where agents pay per call in USDC over HTTP. No API keys. Just a wallet.

---

## Description (min 280 characters)

Metered is a pay-per-call AI inference gateway built on the x402 payment protocol and WDK self-custodial wallets. Any autonomous agent with a WDK wallet and USDC can call AI models (Llama 3.1, Llama 3.3, DeepSeek R1) by paying per request over HTTP. No API keys, no accounts, no signup.

The gateway uses Express with x402 payment middleware. When an agent sends a request without payment, it gets a 402 response with the price. The agent's WDK wallet signs an EIP-3009 transferWithAuthorization (gasless for the agent), attaches it to the retry, and the gateway settles the payment on-chain before returning the AI response. The whole cycle happens in one HTTP round trip.

A treasury agent runs autonomously every hour, adjusting model prices based on demand and supplying idle funds to Aave V3 for yield. A Next.js dashboard lets you watch the full payment flow live, including the 402 rejection, successful payment, and on-chain transaction proof on BaseScan.

---

## How it's made (min 280 characters)

The gateway server is built with Express and the x402 payment middleware (@x402/express). Every AI route is gated behind a paywall. We run the x402 facilitator in-process using @semanticio/wdk-wallet-evm-x402-facilitator, which wraps a WDK wallet to verify EIP-3009 signatures and submit settlement transactions. This avoids depending on any external facilitator service.

On the client side, agents create self-custodial wallets using @tetherto/wdk-wallet-evm from a BIP-39 seed phrase. The @x402/fetch library wraps the standard fetch API so the 402-sign-retry cycle is completely transparent to the agent. From the agent's perspective, it is just a normal fetch call.

One notable hack: the WDK x402 facilitator adapter has a bug in ethers v6 where readContract() tries to send a transaction instead of doing a static call. We wrote a postinstall patch (patches/fix-facilitator.js) that fixes this automatically on npm install by replacing contract[functionName](...args) with contract[functionName].staticCall(...args).

The treasury agent uses @tetherto/wdk-protocol-bridge-usdt0-evm for LayerZero bridging and @tetherto/wdk-protocol-lending-aave-evm for Aave V3 yield. It polls for bridge settlement before supplying to Aave to avoid race conditions. Dynamic pricing works by overriding getRouteConfig on the x402HTTPResourceServer so it reads live prices from a shared state file on every request, without needing a server restart.

The dashboard is Next.js 16 with React 19 and Tailwind CSS v4. It proxies API calls to the gateway and shows a two-phase live demo: first a 402 rejection (no wallet), then a successful agent payment with an on-chain transaction link to BaseScan.

---

## GitHub Repositories

https://github.com/AtharvaMaskar26/Metered

---

## Link to the demo

[ADD YOUR VIDEO LINK HERE]

---

## Which programming languages are you using in your project?

JavaScript, TypeScript

---

## Which blockchain networks does your project interact with?

Base Sepolia (testnet), Plasma (mainnet), Arbitrum (for Aave V3 yield)

---

## Are you using any web frameworks for your project?

Express.js (gateway server), Next.js 16 (dashboard frontend)

---

## What AI Agent are you using for your project?

Custom autonomous agents built with WDK wallets. The treasury agent manages pricing and yield autonomously. Client agents use WDK wallets with x402 fetch wrapper for payment. Also integrated with OpenClaw agent runtime via a custom plugin.

---

## Are you using any databases for your project?

No. State is stored in a JSON file (.state.json) shared between the server and treasury agent. No external database required.

---

## Are you using any design tools for your project?

Tailwind CSS v4 for styling. Google Fonts (DM Serif Display, DM Sans, JetBrains Mono).

---

## Are there any other specific technologies, libraries, frameworks, or tools you're making heavy usage of that don't fit into the categories above?

- x402 protocol (@x402/express, @x402/fetch, @x402/evm, @x402/core) for HTTP-native payments
- EIP-3009 (transferWithAuthorization) for gasless USDC transfers
- Groq API for fast AI inference (Llama 3.1, Llama 3.3, DeepSeek R1)
- Aave V3 via WDK lending protocol for yield generation
- LayerZero bridge via WDK bridge protocol for cross-chain USDT0 transfers
- OpenClaw agent runtime with custom x402 payment plugin

---

## Which track(s) are you applying to?

Agent Wallets

---

## Explain how your project aligns with the track(s) you selected and why it fits their objectives.

Metered is built entirely around agent wallets as first-class economic participants. Every component demonstrates agents using WDK self-custodial wallets autonomously:

1. Client agents create WDK wallets from seed phrases and use them to discover, pay for, and consume AI services without any human involvement. The wallet IS the agent's identity and payment method.

2. The treasury agent has its own WDK wallet and makes autonomous financial decisions: adjusting prices based on demand, bridging tokens cross-chain, and supplying to Aave V3 for yield. No human approves these actions.

3. The multi-agent demo shows two independent agents, each with their own WDK wallet, collaborating on a research task and paying separately from their own funds.

4. The OpenClaw integration gives any OpenClaw agent a WDK wallet and transparent x402 payment capability through a single plugin.

The core thesis is that agents need wallets that work like agent wallets, not like human wallets. WDK provides exactly this: programmatic, self-custodial, no UI required. Combined with x402, it turns any HTTP API into an agent-accessible paid service.

---

## How easy was it to get started with WDK?

Easy

---

## What WDK modules did you use?

Wallet modules, Core module, Examples

---

## How long did it take to get your first wallet working?

Less than 1 hour

---

## What was your biggest blocker?

Documentation gaps, Debugging/error messages

The main blocker was an ethers v6 compatibility issue in the x402 facilitator adapter (@semanticio/wdk-wallet-evm-x402-facilitator). The readContract method tried to send a transaction instead of a static call. We had to trace through 5 layers of code to find the root cause and wrote a postinstall patch to fix it.

---

## How easy was it to find the guide or section you needed in the WDK documentation?

Moderate

---

## How would you rate the documentation quality?

Good

---

## Which modules or sections from the documentation were most useful to you?

wallet-evm, wdk-protocol-lending-aave-evm, wdk-protocol-bridge-usdt0-evm, Examples section

---

## What's the one thing we should fix or add next to the WDK documentation?

Add a dedicated guide for using WDK with the x402 protocol. The x402 facilitator adapter (@semanticio/wdk-wallet-evm-x402-facilitator) is powerful but undocumented. A guide covering wallet setup, EIP-3009 signing, and facilitator configuration would save developers significant debugging time. Also document the ethers v6 staticCall requirement for readContract.

---

## Would you use WDK in a real project after this hackathon?

Yes

---

## Are you interested in further developing this project through grants or other funding and support opportunities?

Yes

---

## Anything else you want to share?

We built a working in-process x402 facilitator using WDK, which means the gateway has zero external dependencies for payment settlement. This is significant because it removes the risk of third-party facilitator downtime or version mismatches. The entire payment flow, from agent wallet creation to on-chain settlement to AI response, happens in a single Node.js process. We also discovered and patched a bug in the WDK x402 facilitator adapter (ethers v6 staticCall issue) and included the fix as a postinstall script so it works out of the box for anyone cloning the repo.
