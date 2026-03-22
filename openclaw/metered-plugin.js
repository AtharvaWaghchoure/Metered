/**
 * Metered OpenClaw Plugin
 *
 * Wraps OpenClaw's outbound AI requests with x402 payment.
 * The OpenClaw agent automatically pays for every inference call
 * in USDT0 on Plasma — no API keys, no accounts.
 *
 * Usage: openclaw --plugin ./openclaw/metered-plugin.js --config ./openclaw/config.yml
 *
 * How it works:
 *   1. Plugin initializes a WDK self-custodial wallet from WALLET_SEED_PHRASE
 *   2. Registers the x402 payment client with the wallet as signer
 *   3. Patches globalThis.fetch so every HTTP call OpenClaw makes goes through
 *      wrapFetchWithPayment — 402 responses are handled transparently
 *   4. OpenClaw calls Metered → gets 402 → plugin signs USDT0 payment → retries
 *   5. Metered settles on Plasma and returns the AI response
 */

import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

export async function activate() {
  const seedPhrase = process.env.WALLET_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WALLET_SEED_PHRASE is required for the Metered OpenClaw plugin");
  }

  // Initialize self-custodial wallet
  const account = await new WalletManagerEvm(seedPhrase, {
    provider: "https://rpc.plasma.to",
  }).getAccount();

  const address = await account.getAddress();
  console.log(`[Metered Plugin] Wallet ready: ${address}`);

  // Wire x402 payment client
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Patch global fetch — OpenClaw uses globalThis.fetch for all HTTP calls
  // wrapFetchWithPayment only activates on 402 responses; all other requests
  // pass through unchanged.
  globalThis.fetch = fetchWithPayment;

  console.log(`[Metered Plugin] x402 payment active — paying in USDT0 on Plasma`);

  return {
    name: "metered",
    version: "1.0.0",
    walletAddress: address,
  };
}
