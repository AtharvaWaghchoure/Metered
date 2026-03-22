/**
 * Metered Client Demo
 *
 * Demonstrates an AI agent with a self-custodial WDK wallet autonomously:
 *   1. Discovering available models and live prices
 *   2. Selecting the best model for the task
 *   3. Paying with USDT0 via x402 — no API keys, no accounts, no signup
 *   4. Receiving the AI response
 */

import "dotenv/config";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4021";

async function main() {
  // 1. Self-custodial wallet — agent owns its keys
  // RPC is inferred from NETWORK env var (default: plasma mainnet)
  const rpc = process.env.NETWORK === "base-sepolia"
    ? "https://sepolia.base.org"
    : "https://rpc.plasma.to";

  const account = await new WalletManagerEvm(process.env.CLIENT_SEED_PHRASE, {
    provider: rpc,
  }).getAccount();

  const address = await account.getAddress();
  console.log(`Agent wallet: ${address}`);

  // 2. Wire up x402 — WalletAccountEvm satisfies ClientEvmSigner directly
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // 3. Discover models (free, no payment)
  const catalogRes = await fetch(`${GATEWAY_URL}/models`);
  if (!catalogRes.ok) throw new Error(`Gateway unreachable: ${catalogRes.status}`);
  const catalog = await catalogRes.json();

  console.log(`\nGateway: ${catalog.gateway}`);
  console.log("Available models:");
  for (const m of catalog.models) {
    console.log(`  ${m.id}  $${m.price_usdt.toFixed(6)}/call  →  ${m.endpoint}`);
  }

  // 4. Pick cheapest model
  const model = catalog.models.sort((a, b) => a.price_usdt - b.price_usdt)[0];
  console.log(`\nSelected: ${model.label} @ $${model.price_usdt}/call`);

  // 5. Call the model — fetchWithPayment handles the 402 → sign → retry cycle
  console.log("Sending request with x402 payment...\n");

  const response = await fetchWithPayment(`${GATEWAY_URL}${model.endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content:
            "You are an AI agent that just paid for this inference using USDT0 on the Plasma blockchain via the x402 protocol. Describe what just happened in 2 sentences.",
        },
      ],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gateway error ${response.status}: ${body}`);
  }

  const result = await response.json();

  console.log(`Model   : ${result.model}`);
  console.log(`Paid    : $${result.price_paid_usdt} USDT0`);
  console.log(`Tokens  : ${result.usage?.prompt_tokens} in / ${result.usage?.completion_tokens} out`);
  console.log(`\nResponse:\n${result.content}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
