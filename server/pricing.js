// Shared pricing state — treasury agent updates this at runtime via shared file
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "../.state.json");

// Network config — switch via NETWORK env var: "plasma" (mainnet) or "base-sepolia" (testnet)
const NETWORK_CONFIGS = {
  plasma: {
    network:  "eip155:9745",
    rpc:      "https://rpc.plasma.to",
    token:    "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    symbol:   "USDT0",
    version:  "1",
    decimals: 6,
  },
  "base-sepolia": {
    network:  "eip155:84532",
    rpc:      "https://sepolia.base.org",
    token:    "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    symbol:   "USDC",
    version:  "2",
    decimals: 6,
  },
};

const ACTIVE_NETWORK = process.env.NETWORK ?? "plasma";
if (!NETWORK_CONFIGS[ACTIVE_NETWORK]) {
  throw new Error(`Unknown NETWORK "${ACTIVE_NETWORK}". Use "plasma" or "base-sepolia".`);
}

export const CHAIN_CONFIG   = NETWORK_CONFIGS[ACTIVE_NETWORK];
export const PLASMA_NETWORK = CHAIN_CONFIG.network;  // kept for compat
export const USDT0_PLASMA   = CHAIN_CONFIG.token;    // kept for compat

export const MODELS = {
  "llama-3.1-8b-instant": {
    label: "Llama 3.1 8B Instant",
    basePrice: parseInt(process.env.PRICE_SMALL ?? "200"),
  },
  "llama-3.3-70b-versatile": {
    label: "Llama 3.3 70B Versatile",
    basePrice: parseInt(process.env.PRICE_MEDIUM ?? "1000"),
  },
  "moonshard-deepseek-r1-distill-llama-70b": {
    label: "DeepSeek R1 Distill 70B",
    basePrice: parseInt(process.env.PRICE_LARGE ?? "2000"),
  },
};

function loadState() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function getPrice(modelId) {
  const state = loadState();
  return state.prices?.[modelId] ?? MODELS[modelId]?.basePrice ?? MODELS["claude-haiku-4-5-20251001"].basePrice;
}

export function setPrice(modelId, amount) {
  if (!MODELS[modelId]) return;
  const state = loadState();
  state.prices = state.prices ?? {};
  state.prices[modelId] = amount;
  saveState(state);
}

export function recordRequest(modelId) {
  const state = loadState();
  state.demand = state.demand ?? {};
  state.demand[modelId] = state.demand[modelId] ?? [];
  state.demand[modelId].push(Date.now());
  saveState(state);
}

export function getRecentRequests(modelId, windowMs = 60 * 60 * 1000) {
  const state = loadState();
  const cutoff = Date.now() - windowMs;
  const raw = state.demand?.[modelId] ?? [];
  const recent = raw.filter((t) => t > cutoff);
  // Write back pruned list
  if (recent.length !== raw.length) {
    state.demand = state.demand ?? {};
    state.demand[modelId] = recent;
    saveState(state);
  }
  return recent.length;
}
