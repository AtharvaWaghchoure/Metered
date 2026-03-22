import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme as registerFacilitatorScheme } from "@x402/evm/exact/facilitator";
import WalletAccountEvmX402Facilitator from "@semanticio/wdk-wallet-evm-x402-facilitator";
import {
  PLASMA_NETWORK,
  USDT0_PLASMA,
  CHAIN_CONFIG,
  MODELS,
  getPrice,
  recordRequest,
} from "./pricing.js";

const PORT = parseInt(process.env.PORT ?? "4021");
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// --- Wallet setup ---
const account = await new WalletManagerEvm(process.env.GATEWAY_SEED_PHRASE, {
  provider: CHAIN_CONFIG.rpc,
}).getAccount();

const sellerAddress = await account.getAddress();
console.log(`Gateway wallet: ${sellerAddress}`);

// --- x402 self-hosted facilitator ---
// Uses an in-process facilitator (same process, no external dependency).
// Eliminates version mismatch risk with third-party hosted facilitators.
// The facilitator wallet needs native gas on Plasma to submit settlement txs.
const facilitatorAccount = await new WalletManagerEvm(
  process.env.FACILITATOR_SEED_PHRASE ?? process.env.GATEWAY_SEED_PHRASE,
  { provider: CHAIN_CONFIG.rpc }
).getAccount();

const facilitatorSigner = new WalletAccountEvmX402Facilitator(facilitatorAccount);
const facilitator = new x402Facilitator();
registerFacilitatorScheme(facilitator, {
  signer: facilitatorSigner,
  networks: PLASMA_NETWORK,
});

const resourceServer = new x402ResourceServer(facilitator).register(
  PLASMA_NETWORK,
  new ExactEvmScheme()
);

// --- Express app ---
const app = express();
app.use(express.json());

// Build a static route skeleton (regex compiled once) then override
// getRouteConfig to inject live prices on every request — no restart needed.
function buildRouteConfig() {
  const config = {};
  for (const modelId of Object.keys(MODELS)) {
    config[`POST /v1/chat/${modelId}`] = {
      accepts: [
        {
          scheme: "exact",
          network: PLASMA_NETWORK,
          price: {
            amount: String(getPrice(modelId)),
            asset: CHAIN_CONFIG.token,
            extra: { name: CHAIN_CONFIG.symbol, version: CHAIN_CONFIG.version, decimals: CHAIN_CONFIG.decimals },
          },
          payTo: sellerAddress,
        },
      ],
      description: `${MODELS[modelId].label} — pay per call in USDT0`,
      mimeType: "application/json",
    };
  }
  return config;
}

const httpServer = new x402HTTPResourceServer(resourceServer, buildRouteConfig());

// Patch: re-read live price from .state.json on every payment check
const _originalGetRouteConfig = httpServer.getRouteConfig.bind(httpServer);
httpServer.getRouteConfig = function (path, method) {
  const routeConfig = _originalGetRouteConfig(path, method);
  if (!routeConfig) return routeConfig;

  // Extract modelId from path e.g. /v1/chat/claude-haiku-4-5-20251001
  const modelId = path.split("/").pop();
  if (!MODELS[modelId]) return routeConfig;

  // Return a fresh config object with the current live price
  return {
    ...routeConfig,
    accepts: routeConfig.accepts.map((a) => ({
      ...a,
      price: { ...a.price, amount: String(getPrice(modelId)) },
    })),
  };
};

app.use(paymentMiddlewareFromHTTPServer(httpServer));

// --- AI inference routes ---
for (const modelId of Object.keys(MODELS)) {
  app.post(`/v1/chat/${modelId}`, async (req, res) => {
    const { messages, max_tokens = 1024, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Record demand for treasury agent pricing decisions
    recordRequest(modelId);

    try {
      const response = await groq.chat.completions.create({
        model: modelId,
        max_tokens,
        messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      });

      res.json({
        model: modelId,
        price_paid_usdt: getPrice(modelId) / 1_000_000,
        content: response.choices[0].message.content,
        usage: response.usage,
      });
    } catch (err) {
      console.error("Groq error:", err.message);
      res.status(502).json({ error: "upstream inference failed" });
    }
  });
}

// --- Public endpoints ---
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/models", (_req, res) => {
  const list = Object.entries(MODELS).map(([id, m]) => ({
    id,
    label: m.label,
    price_usdt: getPrice(id) / 1_000_000,
    endpoint: `/v1/chat/${id}`,
    network: PLASMA_NETWORK,
  }));
  res.json({ models: list, gateway: sellerAddress });
});

// --- Demo: show 402 rejection (no wallet / no payment header) ---
app.post("/demo/reject", async (req, res) => {
  const { model: requestedModel } = req.body || {};
  const modelId = requestedModel || Object.keys(MODELS)[0];
  const endpoint = `/v1/chat/${modelId}`;

  try {
    // Make a raw fetch WITHOUT x402 payment — should get 402 back
    const response = await fetch(`http://localhost:${PORT}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });

    const status = response.status;
    const headers = {};
    for (const [k, v] of response.headers.entries()) {
      if (k.toLowerCase().includes("payment") || k.toLowerCase().includes("x-")) {
        headers[k] = v;
      }
    }

    let paymentDetails = null;
    const prHeader = response.headers.get("x-payment");
    if (prHeader) {
      try { paymentDetails = JSON.parse(Buffer.from(prHeader, "base64").toString()); } catch {}
    }

    res.json({
      status,
      statusText: response.statusText,
      model: modelId,
      endpoint,
      headers,
      paymentDetails,
      price_usdt: getPrice(modelId) / 1_000_000,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Live agent demo endpoint ---
// Runs the full x402 payment cycle server-side and streams steps as JSON
app.post("/demo/run", async (req, res) => {
  const { prompt = "Explain in 2 sentences what just happened: an AI agent paid for this inference using USDC via the x402 protocol.", model: requestedModel } = req.body || {};

  const steps = [];
  const push = (step) => steps.push({ ...step, ts: Date.now() });

  try {
    // Step 1: Create wallet
    const { default: WalletManagerEvm } = await import("@tetherto/wdk-wallet-evm");
    const { x402Client, wrapFetchWithPayment } = await import("@x402/fetch");
    const { registerExactEvmScheme } = await import("@x402/evm/exact/client");

    const clientAccount = await new WalletManagerEvm(process.env.CLIENT_SEED_PHRASE, {
      provider: CHAIN_CONFIG.rpc,
    }).getAccount();
    const clientAddress = await clientAccount.getAddress();
    push({ type: "wallet", status: "done", address: clientAddress });

    // Step 2: Discover models
    const modelList = Object.entries(MODELS).map(([id, m]) => ({
      id, label: m.label, price_usdt: getPrice(id) / 1_000_000,
      endpoint: `/v1/chat/${id}`,
    }));
    push({ type: "models", status: "done", models: modelList, gateway: sellerAddress });

    // Step 3: Select model
    const selected = requestedModel
      ? modelList.find((m) => m.id === requestedModel) || modelList[0]
      : modelList.sort((a, b) => a.price_usdt - b.price_usdt)[0];
    push({ type: "select", status: "done", model: selected.label, id: selected.id, price: selected.price_usdt });

    // Step 4: Setup x402 client and make payment
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: clientAccount });
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    push({ type: "payment", status: "signing", message: "Signing EIP-3009 authorization..." });

    const response = await fetchWithPayment(`http://localhost:${PORT}${selected.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      push({ type: "payment", status: "error", message: `Payment failed: ${response.status} ${body}` });
      return res.json({ success: false, steps });
    }

    // Extract tx hash from PAYMENT-RESPONSE header (base64-encoded JSON)
    let txHash = null;
    const paymentResponse = response.headers.get("payment-response");
    if (paymentResponse) {
      try {
        const decoded = JSON.parse(Buffer.from(paymentResponse, "base64").toString());
        txHash = decoded.transaction || null;
      } catch {}
    }

    const result = await response.json();
    push({
      type: "payment", status: "done",
      message: `Settled on-chain`,
      txPrice: result.price_paid_usdt,
      txHash,
    });

    // Step 5: Response
    push({
      type: "response", status: "done",
      model: result.model,
      content: result.content,
      price_paid: result.price_paid_usdt,
      usage: result.usage,
    });

    res.json({ success: true, steps });
  } catch (err) {
    push({ type: "error", status: "error", message: err.message });
    res.json({ success: false, steps });
  }
});

app.listen(PORT, () => {
  console.log(`Metered gateway running on port ${PORT}`);
  console.log(`Models: ${Object.keys(MODELS).join(", ")}`);
});
