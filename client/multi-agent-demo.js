/**
 * Metered Multi-Agent Demo
 *
 * Two fully autonomous AI agents, each with their own self-custodial WDK wallet,
 * collaborating on a research task — paying each other in USDT0 via x402.
 *
 * Coordinator Agent
 *   - Has its own WDK wallet funded with USDT0
 *   - Discovers available models on Metered
 *   - Breaks a research question into sub-tasks
 *   - Pays Metered (via x402) for each sub-task
 *   - Synthesizes results autonomously
 *
 * Research Agent
 *   - Also has its own WDK wallet (simulated here as a second seed phrase)
 *   - Independently calls Metered for a verification pass
 *   - Pays separately from the coordinator
 *
 * No human in the loop. Each agent manages its own funds.
 */

import "dotenv/config";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4021";

// --- Agent factory ---
async function createAgent(name, seedPhrase) {
  const rpc = process.env.NETWORK === "base-sepolia"
    ? "https://sepolia.base.org"
    : "https://rpc.plasma.to";

  const account = await new WalletManagerEvm(seedPhrase, {
    provider: rpc,
  }).getAccount();

  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const address = await account.getAddress();
  console.log(`[${name}] wallet: ${address}`);

  async function callModel(modelId, prompt, system) {
    const res = await fetchWithPayment(`${GATEWAY_URL}/v1/chat/${modelId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        ...(system ? { system } : {}),
        max_tokens: 400,
      }),
    });
    if (!res.ok) throw new Error(`[${name}] Gateway error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    console.log(`[${name}] paid $${data.price_paid_usdt} USDT0 for ${modelId}`);
    return data.content;
  }

  return { name, address, callModel };
}

// --- Coordinator Agent logic ---
async function coordinatorAgent(agent, model, researchTopic) {
  console.log(`\n[${agent.name}] Starting research on: "${researchTopic}"`);

  // Step 1: Break topic into sub-questions
  const planPrompt = `You are an autonomous research coordinator agent with a self-custodial crypto wallet.
You are researching: "${researchTopic}"
Break this into exactly 2 focused sub-questions that will give the most insight.
Reply with only the 2 questions, one per line, no numbering.`;

  const plan = await agent.callModel(model, planPrompt);
  const subQuestions = plan.trim().split("\n").filter(q => q.trim()).slice(0, 2);
  console.log(`\n[${agent.name}] Sub-questions:\n${subQuestions.map((q, i) => `  ${i+1}. ${q}`).join("\n")}`);

  // Step 2: Research each sub-question (paying per call)
  const findings = [];
  for (const question of subQuestions) {
    const answer = await agent.callModel(
      model,
      question,
      "You are a concise research agent. Answer in 2-3 sentences."
    );
    findings.push({ question, answer });
    console.log(`\n[${agent.name}] Finding: ${answer.trim().slice(0, 100)}...`);
  }

  // Step 3: Synthesize
  const synthesis = await agent.callModel(
    model,
    `Synthesize these research findings into a 3-sentence summary:\n\n${findings.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`,
    "You are a synthesis agent. Be concise and direct."
  );

  return { subQuestions, findings, synthesis };
}

// --- Research Agent logic (independent verification) ---
async function researchAgent(agent, model, topic, coordinatorSummary) {
  console.log(`\n[${agent.name}] Independently verifying coordinator's findings...`);

  const verification = await agent.callModel(
    model,
    `A coordinator agent researched "${topic}" and concluded:\n\n"${coordinatorSummary}"\n\nDo you agree with this summary? What's the most important thing it might be missing? Answer in 2 sentences.`,
    "You are an independent verification agent."
  );

  return verification;
}

// --- Main ---
async function main() {
  // Discover models
  const catalogRes = await fetch(`${GATEWAY_URL}/models`);
  if (!catalogRes.ok) throw new Error("Gateway unreachable — is the server running?");
  const catalog = await catalogRes.json();
  const fastModel = catalog.models.sort((a, b) => a.price_usdt - b.price_usdt)[0].id;
  console.log(`\nUsing model: ${fastModel}`);
  console.log(`Gateway: ${catalog.gateway}\n`);

  // Create two independent agents with separate wallets
  const coordinator = await createAgent(
    "CoordinatorAgent",
    process.env.CLIENT_SEED_PHRASE
  );

  const researcher = await createAgent(
    "ResearchAgent",
    process.env.RESEARCHER_SEED_PHRASE ?? process.env.CLIENT_SEED_PHRASE
  );

  const topic = process.env.RESEARCH_TOPIC ?? "How does the x402 payment protocol enable autonomous AI agent economies?";

  // Run coordinator
  const { synthesis } = await coordinatorAgent(coordinator, fastModel, topic);
  console.log(`\n[${coordinator.name}] Final synthesis:\n${synthesis}`);

  // Run independent researcher for verification
  const verification = await researchAgent(researcher, fastModel, topic, synthesis);
  console.log(`\n[${researcher.name}] Verification:\n${verification}`);

  // Final tally
  console.log("\n--- Session Complete ---");
  console.log(`Both agents operated autonomously with self-custodial wallets.`);
  console.log(`All payments settled on Plasma chain in USDT0 via x402.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
