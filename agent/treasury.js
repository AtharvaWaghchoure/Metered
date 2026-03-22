/**
 * Metered Treasury Agent
 *
 * Runs autonomously on a cron schedule and:
 *   1. Checks gateway wallet USDT0 balance on Plasma
 *   2. Adjusts per-model prices based on hourly demand (from shared .state.json)
 *   3. Manages yield: bridges idle USDT0 from Plasma → Arbitrum and supplies to Aave V3
 *   4. Restores liquidity: withdraws from Aave and bridges back when balance is low
 *   5. Logs every decision with structured JSON reasoning
 *
 * Yield chain: Plasma (x402 payments) ↔ Arbitrum (Aave V3 yield)
 * Bridge: LayerZero via @tetherto/wdk-protocol-bridge-usdt0-evm
 */

import "dotenv/config";
import cron from "node-cron";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import AaveProtocolEvm from "@tetherto/wdk-protocol-lending-aave-evm";
import Usdt0ProtocolEvm from "@tetherto/wdk-protocol-bridge-usdt0-evm";
import {
  setPrice,
  getRecentRequests,
  MODELS,
  USDT0_PLASMA,
} from "../server/pricing.js";

const PLASMA_RPC    = "https://rpc.plasma.to";
const ARBITRUM_RPC  = "https://arb1.arbitrum.io/rpc";

// Poll for token balance to arrive after a bridge, max 3 minutes
async function waitForBalance(account, token, minAmount, intervalMs = 10_000, maxAttempts = 18) {
  for (let i = 0; i < maxAttempts; i++) {
    const bal = BigInt(await account.getTokenBalance(token));
    if (bal >= minAmount) return bal;
    log("bridge_polling", `waiting for bridge settlement (${i + 1}/${maxAttempts})`, {
      current_usdt: Number(bal) / 1_000_000,
      waiting_for_usdt: Number(minAmount) / 1_000_000,
    });
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Bridge settlement timed out after 3 minutes");
}

// USDT0 on Arbitrum (LayerZero OFT, same as Plasma USDT0 but on Arbitrum)
// See: https://docs.usdt0.to/technical-documentation/deployments
const USDT0_ARBITRUM = "0xfD086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

// Thresholds (USDT0, 6 decimals)
const IDLE_THRESHOLD = 50_000_000n;  // $50 idle on Plasma → bridge to Arbitrum + supply Aave
const RESERVE_FLOOR  = 5_000_000n;   // keep $5 liquid on Plasma at all times
const LOW_BALANCE    = 3_000_000n;   // below $3 on Plasma → withdraw from Aave + bridge back

function log(action, reasoning, data = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    action,
    reasoning,
    ...data,
  }));
}

// --- Dynamic pricing ---
function adjustPrices() {
  for (const [modelId, model] of Object.entries(MODELS)) {
    const rph = getRecentRequests(modelId);
    const base = model.basePrice;
    let newPrice = base;
    let reason;

    if (rph > 100) {
      newPrice = Math.round(base * 1.5);
      reason = `high demand (${rph} req/hr) → surge pricing`;
    } else if (rph > 50) {
      newPrice = Math.round(base * 1.2);
      reason = `moderate demand (${rph} req/hr) → slight increase`;
    } else if (rph < 5) {
      newPrice = Math.round(base * 0.8);
      reason = `low demand (${rph} req/hr) → discount to attract volume`;
    } else {
      reason = `steady demand (${rph} req/hr) → holding base price`;
    }

    setPrice(modelId, newPrice);
    log("price_adjusted", reason, {
      model: modelId,
      old_price_usdt: base / 1_000_000,
      new_price_usdt: newPrice / 1_000_000,
    });
  }
}

// --- Yield management ---
async function manageYield(plasmaAccount, arbAccount, aave, bridge) {
  // Check Plasma balance
  let plasmaBalance;
  try {
    plasmaBalance = BigInt(await plasmaAccount.getTokenBalance(USDT0_PLASMA));
  } catch (err) {
    log("plasma_balance_failed", err.message);
    return;
  }

  log("plasma_balance", `Plasma wallet holds $${(Number(plasmaBalance) / 1_000_000).toFixed(4)} USDT0`, {
    balance_usdt: Number(plasmaBalance) / 1_000_000,
  });

  // Check Aave position on Arbitrum
  let aaveData;
  try {
    aaveData = await aave.getAccountData();
    log("aave_position", "Arbitrum Aave position", {
      total_collateral_usd: aaveData.totalCollateralBase?.toString(),
      health_factor: aaveData.healthFactor?.toString(),
    });
  } catch (err) {
    log("aave_fetch_failed", err.message);
  }

  const idle = plasmaBalance - RESERVE_FLOOR;

  if (plasmaBalance < LOW_BALANCE) {
    // Balance critically low — withdraw from Aave on Arbitrum and bridge back to Plasma
    if (aaveData && BigInt(aaveData.totalCollateralBase ?? 0) > 0n) {
      const withdrawAmount = IDLE_THRESHOLD;
      log("aave_withdraw_intent", "Plasma balance below $3 — withdrawing from Arbitrum Aave + bridging back", {
        withdraw_usdt: Number(withdrawAmount) / 1_000_000,
      });
      try {
        const withdrawTx = await aave.withdraw({ token: USDT0_ARBITRUM, amount: withdrawAmount });
        log("aave_withdrawn", "Withdrawn USDT0 from Arbitrum Aave", { tx_hash: withdrawTx.hash });

        const bridgeTx = await bridge.bridge({
          targetChain: "plasma",
          recipient: await plasmaAccount.getAddress(),
          token: USDT0_ARBITRUM,
          amount: withdrawAmount,
        });
        log("bridge_back", "Bridging USDT0 from Arbitrum → Plasma", { tx_hash: bridgeTx.hash });
      } catch (err) {
        log("withdraw_bridge_failed", err.message);
      }
    } else {
      log("low_balance_warning", "Plasma balance below $3, no Aave position to withdraw from");
    }
  } else if (idle > IDLE_THRESHOLD) {
    // Idle capital — bridge to Arbitrum and supply to Aave for yield
    const supplyAmount = idle;
    log("yield_intent", `$${(Number(supplyAmount) / 1_000_000).toFixed(2)} idle on Plasma — bridging to Arbitrum + supplying to Aave`, {
      amount_usdt: Number(supplyAmount) / 1_000_000,
    });
    try {
      const bridgeTx = await bridge.bridge({
        targetChain: "arbitrum",
        recipient: await arbAccount.getAddress(),
        token: USDT0_PLASMA,
        amount: supplyAmount,
      });
      log("bridged_to_arbitrum", "Bridged USDT0 Plasma → Arbitrum (LayerZero), polling for settlement", {
        tx_hash: bridgeTx.hash,
        amount_usdt: Number(supplyAmount) / 1_000_000,
      });

      // Wait for funds to arrive on Arbitrum before supplying to Aave
      const arbBalanceBefore = BigInt(await arbAccount.getTokenBalance(USDT0_ARBITRUM));
      await waitForBalance(arbAccount, USDT0_ARBITRUM, arbBalanceBefore + supplyAmount);
      log("bridge_settled", "Funds arrived on Arbitrum — proceeding to Aave supply");

      const aaveTx = await aave.supply({ token: USDT0_ARBITRUM, amount: supplyAmount });
      log("aave_supplied", "Supplied USDT0 to Aave V3 on Arbitrum for yield", {
        tx_hash: aaveTx.hash,
        amount_usdt: Number(supplyAmount) / 1_000_000,
      });
    } catch (err) {
      log("yield_supply_failed", err.message);
    }
  } else {
    log("yield_hold", `Idle $${(Number(idle > 0n ? idle : 0n) / 1_000_000).toFixed(2)} below $50 threshold — staying liquid on Plasma`);
  }
}

// --- Main cycle ---
async function runCycle(plasmaAccount, arbAccount, aave, bridge) {
  console.log(`\n=== Treasury Cycle @ ${new Date().toISOString()} ===`);
  adjustPrices();
  await manageYield(plasmaAccount, arbAccount, aave, bridge);
}

async function main() {
  // Plasma wallet — monitors gateway balance and initiates bridges
  const plasmaAccount = await new WalletManagerEvm(process.env.TREASURY_SEED_PHRASE, {
    provider: PLASMA_RPC,
  }).getAccount();

  // Arbitrum wallet — same seed phrase, supplies to Aave V3
  const arbAccount = await new WalletManagerEvm(process.env.TREASURY_SEED_PHRASE, {
    provider: ARBITRUM_RPC,
  }).getAccount();

  const plasmaAddress = await plasmaAccount.getAddress();
  const arbAddress = await arbAccount.getAddress();

  log("agent_started", "Treasury agent initialized", {
    plasma_address: plasmaAddress,
    arbitrum_address: arbAddress,
  });

  const aave   = new AaveProtocolEvm(arbAccount, { provider: ARBITRUM_RPC });
  const bridge = new Usdt0ProtocolEvm(plasmaAccount, { bridgeMaxFee: 100000000000000n });

  await runCycle(plasmaAccount, arbAccount, aave, bridge);
  cron.schedule("0 * * * *", () => runCycle(plasmaAccount, arbAccount, aave, bridge));

  console.log("\nTreasury agent running — cycles every hour on the hour");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
