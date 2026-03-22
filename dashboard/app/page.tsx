"use client";

import { useState, useEffect, useRef } from "react";

const GATEWAY_URL = "/api";

type Model = {
  id: string;
  label: string;
  price_usdt: number;
  endpoint: string;
  network: string;
};

type PaymentLog = {
  id: number;
  model: string;
  price: number;
  tokens: number;
  ts: number;
};

function Navbar() {
  const [section, setSection] = useState("home");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 600) setSection("home");
      else if (y < 1200) setSection("models");
      else if (y < 1800) setSection("demo");
      else setSection("how");
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "home", label: "Home" },
    { id: "models", label: "Models" },
    { id: "demo", label: "Try It" },
    { id: "how", label: "How It Works" },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#e8e8e8] bg-white/80 px-6 sm:px-12 py-3 backdrop-blur-md rounded-t-2xl">
      <div className="flex items-center gap-1">
        <span className="text-[17px] font-semibold tracking-tight">
          Metered
        </span>
        <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-200">
          LIVE
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1">
        {links.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              section === l.id
                ? "bg-[#f5f5f5] text-[#111]"
                : "text-[#888] hover:bg-[#fafafa] hover:text-[#333]"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
        <span className="text-[12px] text-[#888] font-mono">Base Sepolia</span>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section id="home" className="px-6 sm:px-12 pt-16 pb-20 grid-pattern">
      <div className="mx-auto max-w-2xl text-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e8e8e8] bg-[#fafafa] px-4 py-1.5 text-[12px] font-medium text-[#888]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Hackathon Galactica: WDK Edition
          </span>
        </div>

        <h1 className="mt-6 font-display text-[48px] sm:text-[56px] leading-[1.08] tracking-tight text-[#111] animate-fade-up-1">
          AI inference,{" "}
          <span className="italic text-emerald-600">paid per call</span>
        </h1>

        <p className="mt-5 text-[16px] leading-relaxed text-[#888] animate-fade-up-2">
          An AI gateway where any agent — human or autonomous — pays for
          inference in USDC over HTTP. No API keys. No accounts. No signup.
          Just a wallet and money.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 animate-fade-up-3">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full bg-[#111] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#333]"
          >
            Try Live Demo
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#e0e0e0] px-6 py-2.5 text-[14px] font-medium text-[#555] transition-colors hover:border-[#111] hover:text-[#111]"
          >
            How It Works
          </a>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 animate-fade-up-4">
          {[
            { label: "Protocol", value: "x402" },
            { label: "Settlement", value: "~1 sec" },
            { label: "Cost per tx", value: "< $0.001" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-center"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">
                {s.label}
              </div>
              <div className="mt-1 text-[17px] font-semibold text-[#111]">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModelsSection() {
  const [models, setModels] = useState<Model[]>([]);
  const [gateway, setGateway] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${GATEWAY_URL}/models`)
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models);
        setGateway(d.gateway);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section id="models" className="px-6 sm:px-12 py-16 border-t border-[#f0f0f0]">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Model Catalog
        </span>
        <h2 className="mt-2 font-display text-[32px] text-[#111]">
          Live Models & Pricing
        </h2>
        <p className="mt-2 text-[14px] text-[#888]">
          Prices adjust dynamically based on demand. Treasury agent updates
          every hour.
        </p>
      </div>

      {gateway && (
        <div className="mt-6 text-center">
          <span className="text-[12px] text-[#999]">Gateway wallet: </span>
          <span className="font-mono text-[12px] text-[#666]">{gateway}</span>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {loading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl border-[1.5px] border-[#e8e8e8] bg-[#fafafa] animate-pulse"
              />
            ))
          : models.map((m, i) => (
              <div
                key={m.id}
                className={`group rounded-2xl border-[1.5px] border-[#e8e8e8] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#d0d0d0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                  i === 0
                    ? "animate-fade-up"
                    : i === 1
                    ? "animate-fade-up-1"
                    : "animate-fade-up-2"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      i === 0
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : i === 1
                        ? "bg-blue-50 text-blue-600 border border-blue-200"
                        : "bg-violet-50 text-violet-600 border border-violet-200"
                    }`}
                  >
                    {i === 0 ? "Fastest" : i === 1 ? "Balanced" : "Smartest"}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbb]">
                    {m.network.split(":")[1]}
                  </span>
                </div>

                <h3 className="mt-4 text-[17px] font-semibold text-[#111]">
                  {m.label}
                </h3>
                <p className="mt-1 font-mono text-[12px] text-[#999]">
                  {m.id}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[28px] font-semibold text-[#111]">
                    ${m.price_usdt.toFixed(4)}
                  </span>
                  <span className="text-[13px] text-[#999]">
                    USDC / call
                  </span>
                </div>

                <div className="mt-3 font-mono text-[11px] text-[#bbb]">
                  POST {m.endpoint}
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}

type DemoStep = {
  type: string;
  status: string;
  ts: number;
  address?: string;
  models?: { id: string; label: string; price_usdt: number; endpoint: string }[];
  gateway?: string;
  model?: string;
  id?: string;
  price?: number;
  message?: string;
  txPrice?: number;
  txHash?: string;
  content?: string;
  price_paid?: number;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

type RejectResult = {
  status: number;
  statusText: string;
  model: string;
  endpoint: string;
  price_usdt: number;
  headers: Record<string, string>;
};

function TerminalWindow({ title, running, children }: { title: string; running?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-[12px] text-[#666] font-mono">{title}</span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-[11px] text-emerald-400 font-mono">live</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function DemoSection() {
  const [phase, setPhase] = useState<"idle" | "rejecting" | "rejected" | "paying" | "done">("idle");
  const [rejectResult, setRejectResult] = useState<RejectResult | null>(null);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [prompt, setPrompt] = useState(
    "You are an AI agent that just paid for this inference using USDC on Base Sepolia via the x402 protocol. Describe what just happened in 2 sentences."
  );
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [txHash, setTxHash] = useState<string | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${GATEWAY_URL}/models`)
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models);
        if (d.models.length) setSelectedModel(d.models[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [steps]);

  const runFullDemo = async () => {
    if (phase === "rejecting" || phase === "paying") return;

    // Phase 1: Show 402 rejection
    setPhase("rejecting");
    setRejectResult(null);
    setSteps([]);
    setTxHash(null);

    try {
      const rejectRes = await fetch(`${GATEWAY_URL}/demo/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      });
      const reject = await rejectRes.json();
      setRejectResult(reject);
      setPhase("rejected");

      // Brief pause to let user see the rejection
      await new Promise((r) => setTimeout(r, 1500));

      // Phase 2: Run the full payment
      setPhase("paying");
      setSteps([{ type: "init", status: "done", ts: Date.now(), message: "Starting x402 payment demo..." }]);

      const res = await fetch(`${GATEWAY_URL}/demo/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });
      const data = await res.json();

      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const step = data.steps[i];
        setSteps((prev) => [...prev, step]);
        if (step.txHash) setTxHash(step.txHash);
      }

      setPhase("done");
    } catch (e: unknown) {
      setSteps((prev) => [
        ...prev,
        { type: "error", status: "error", ts: Date.now(), message: e instanceof Error ? e.message : "Connection failed" },
      ]);
      setPhase("done");
    }
  };

  const renderStep = (step: DemoStep, i: number) => {
    switch (step.type) {
      case "init":
        return (
          <div key={i} className="animate-slide-in">
            <span className="text-[#888]">$</span>{" "}
            <span className="text-emerald-500">metered-agent</span>{" "}
            <span className="text-[#888]">--pay --model {selectedModel}</span>
            <div className="mt-1 text-[#ccc]">{step.message}</div>
          </div>
        );

      case "wallet":
        return (
          <div key={i} className="animate-slide-in">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">[1/5]</span>
              <span className="text-white">Creating WDK self-custodial wallet...</span>
            </div>
            <div className="mt-1 pl-6">
              <span className="text-[#888]">Address: </span>
              <span className="text-amber-300">{step.address}</span>
            </div>
            <div className="mt-0.5 pl-6 text-emerald-400 text-[12px]">
              &#10003; Wallet ready — agent owns its keys
            </div>
          </div>
        );

      case "models":
        return (
          <div key={i} className="animate-slide-in">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">[2/5]</span>
              <span className="text-white">Discovering models from gateway...</span>
            </div>
            <div className="mt-1 pl-6 text-[#888]">
              Gateway: <span className="text-amber-300">{step.gateway}</span>
            </div>
            {step.models?.map((m) => (
              <div key={m.id} className="pl-6 text-[#ccc]">
                <span className="text-blue-300">{m.id}</span>
                <span className="text-[#888]"> @ </span>
                <span className="text-emerald-300">${m.price_usdt.toFixed(4)}</span>
                <span className="text-[#888]">/call</span>
              </div>
            ))}
            <div className="mt-0.5 pl-6 text-emerald-400 text-[12px]">
              &#10003; {step.models?.length} models available
            </div>
          </div>
        );

      case "select":
        return (
          <div key={i} className="animate-slide-in">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">[3/5]</span>
              <span className="text-white">Selected model: </span>
              <span className="text-blue-300">{step.model}</span>
            </div>
            <div className="mt-0.5 pl-6 text-[#ccc]">
              Price: <span className="text-emerald-300 font-semibold">${step.price?.toFixed(4)} USDC</span> per call
            </div>
          </div>
        );

      case "payment":
        return (
          <div key={i} className="animate-slide-in">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">[4/5]</span>
              <span className="text-white">{step.message}</span>
              {step.status === "signing" && (
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              )}
            </div>
            {step.status === "done" && (
              <>
                <div className="mt-0.5 pl-6 text-[#ccc]">
                  Paid: <span className="text-emerald-300 font-semibold">${step.txPrice} USDC</span>
                </div>
                {step.txHash && (
                  <div className="mt-0.5 pl-6">
                    <span className="text-[#888]">Tx: </span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                    </a>
                  </div>
                )}
                <div className="mt-0.5 pl-6 text-emerald-400 text-[12px]">
                  &#10003; EIP-3009 transferWithAuthorization — settled on Base Sepolia
                </div>
              </>
            )}
          </div>
        );

      case "response":
        return (
          <div key={i} className="animate-slide-in">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">[5/5]</span>
              <span className="text-white">AI response received!</span>
            </div>
            <div className="mt-1.5 pl-6 text-[#ccc] flex flex-wrap gap-3">
              <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-[11px] text-emerald-300 border border-emerald-800/40">
                PAID ${step.price_paid} USDC
              </span>
              <span className="rounded bg-blue-900/30 px-2 py-0.5 text-[11px] text-blue-300 border border-blue-800/40">
                {(step.usage?.prompt_tokens || 0) + (step.usage?.completion_tokens || 0)} tokens
              </span>
              <span className="rounded bg-violet-900/30 px-2 py-0.5 text-[11px] text-violet-300 border border-violet-800/40">
                {step.model}
              </span>
            </div>
            <div className="mt-2 pl-6 rounded-lg bg-[#1e1e1e] border border-[#333] p-3 text-[13px] leading-relaxed text-[#e0e0e0]">
              {step.content}
            </div>
            <div className="mt-2 pl-6 text-emerald-400 text-[12px] font-semibold">
              &#10003; Complete — agent discovered, paid, and received AI in one HTTP round trip
            </div>
          </div>
        );

      case "error":
        return (
          <div key={i} className="animate-slide-in">
            <span className="text-red-400">&#10007; Error: </span>
            <span className="text-red-300">{step.message}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="demo" className="px-6 sm:px-12 py-16 border-t border-[#f0f0f0]">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Live Demo
        </span>
        <h2 className="mt-2 font-display text-[32px] text-[#111]">
          Watch an Agent Pay for AI
        </h2>
        <p className="mt-2 text-[14px] text-[#888] max-w-lg mx-auto">
          First: a raw request gets <strong className="text-red-500">rejected (402)</strong> without payment.
          Then: an agent with a WDK wallet <strong className="text-emerald-600">pays and gets a response</strong> — with on-chain proof.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">
              Prompt
            </label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 w-full rounded-lg border-[1.5px] border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5 text-[14px] outline-none focus:border-[#111] focus:bg-white transition-colors"
            />
          </div>
          <div className="sm:w-56">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-1 w-full rounded-lg border-[1.5px] border-[#e8e8e8] bg-[#fafafa] px-3 py-2.5 text-[14px] outline-none focus:border-[#111] focus:bg-white transition-colors"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={runFullDemo}
              disabled={phase === "rejecting" || phase === "paying"}
              className="inline-flex items-center gap-2 rounded-full bg-[#111] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-30 whitespace-nowrap"
            >
              {phase === "rejecting" || phase === "paying" ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {phase === "rejecting" ? "Testing 402..." : "Paying..."}
                </>
              ) : (
                <>
                  Run Full Demo
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Phase labels */}
        {phase !== "idle" && (
          <div className="flex items-center gap-4 text-[12px] font-semibold">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              phase === "rejecting"
                ? "border-red-300 bg-red-50 text-red-600"
                : rejectResult
                ? "border-red-200 bg-red-50/50 text-red-400"
                : "border-[#e8e8e8] text-[#ccc]"
            }`}>
              {rejectResult ? "&#10003;" : phase === "rejecting" ? (
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
              ) : null}
              Phase 1: 402 Rejection
            </div>
            <svg className="h-4 w-4 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              phase === "paying"
                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                : phase === "done"
                ? "border-emerald-200 bg-emerald-50/50 text-emerald-400"
                : "border-[#e8e8e8] text-[#ccc]"
            }`}>
              {phase === "done" ? "&#10003;" : phase === "paying" ? (
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              ) : null}
              Phase 2: Agent Payment
            </div>
          </div>
        )}

        {/* Two terminals side by side on large screens, stacked on small */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Terminal 1: 402 Rejection */}
          <TerminalWindow title="curl — no wallet (rejected)" running={phase === "rejecting"}>
            <div className="p-5 font-mono text-[13px] leading-relaxed min-h-[200px] max-h-[400px] overflow-y-auto space-y-2">
              {phase === "idle" ? (
                <div className="text-[#555] py-8 text-center">
                  <div className="text-[14px] mb-1 text-red-400/60">Phase 1: 402 Rejection</div>
                  <div className="text-[12px] text-[#444]">
                    Shows what happens without a wallet
                  </div>
                </div>
              ) : (
                <>
                  <div className="animate-slide-in">
                    <span className="text-[#888]">$</span>{" "}
                    <span className="text-amber-400">curl</span>{" "}
                    <span className="text-[#888]">-X POST</span>{" "}
                    <span className="text-[#ccc]">localhost:4021{rejectResult?.endpoint || `/v1/chat/${selectedModel}`}</span>
                  </div>
                  {phase === "rejecting" && !rejectResult && (
                    <div className="animate-slide-in flex items-center gap-2 text-[#888]">
                      <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#666] border-t-transparent" />
                      Sending request without payment header...
                    </div>
                  )}
                  {rejectResult && (
                    <>
                      <div className="animate-slide-in mt-2">
                        <span className="text-red-400 font-semibold text-[15px]">
                          HTTP {rejectResult.status} Payment Required
                        </span>
                      </div>
                      <div className="animate-slide-in mt-2 rounded-lg bg-[#1e1e1e] border border-red-900/40 p-3 space-y-1">
                        <div className="text-red-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
                          Response Headers
                        </div>
                        {Object.entries(rejectResult.headers).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-amber-300 shrink-0">{k}:</span>
                            <span className="text-[#999] break-all text-[11px]">{typeof v === "string" && v.length > 60 ? v.slice(0, 60) + "..." : v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="animate-slide-in mt-2 text-[#ccc]">
                        <span className="text-[#888]">Price required: </span>
                        <span className="text-amber-300 font-semibold">${rejectResult.price_usdt.toFixed(4)} USDC</span>
                      </div>
                      <div className="animate-slide-in mt-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2">
                        <span className="text-red-400 text-[12px]">
                          &#10007; Access denied — no x402 payment signature provided.
                          The gateway requires a signed EIP-3009 authorization to proceed.
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </TerminalWindow>

          {/* Terminal 2: Successful Payment */}
          <TerminalWindow title="metered-agent — with wallet (paid)" running={phase === "paying"}>
            <div
              ref={termRef}
              className="p-5 font-mono text-[13px] leading-relaxed min-h-[200px] max-h-[400px] overflow-y-auto space-y-3"
            >
              {steps.length === 0 ? (
                <div className="text-[#555] py-8 text-center">
                  <div className="text-[14px] mb-1 text-emerald-400/60">Phase 2: Agent Payment</div>
                  <div className="text-[12px] text-[#444]">
                    Agent pays with WDK wallet via x402
                  </div>
                </div>
              ) : (
                steps.map((step, i) => renderStep(step, i))
              )}
            </div>
          </TerminalWindow>
        </div>

        {/* On-chain proof banner */}
        {txHash && (
          <div className="animate-fade-up rounded-2xl border-[1.5px] border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                  On-Chain Proof
                </div>
                <div className="text-[14px] text-[#333]">
                  Payment settled on Base Sepolia. Verified on-chain via EIP-3009 transferWithAuthorization.
                </div>
                <div className="mt-1 font-mono text-[12px] text-[#888] break-all">
                  {txHash}
                </div>
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
              >
                View on BaseScan
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Agent Discovers Models",
      desc: "GET /models returns available models and live prices. Free, no payment required.",
      code: 'GET /models → { models: [{ id: "llama-3.1-8b", price: 0.0002 }] }',
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      num: "02",
      title: "Agent Sends Request",
      desc: "POST to the model endpoint. Gateway responds with 402 Payment Required and the price.",
      code: "POST /v1/chat/llama-3.1-8b → 402 { price: 200 micro-USDC }",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      num: "03",
      title: "Agent Signs Payment",
      desc: "WDK wallet signs an EIP-3009 transferWithAuthorization. Off-chain, gasless for the agent.",
      code: "EIP-3009: authorize(from, to, 200, nonce, sig)",
      color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      num: "04",
      title: "Payment Settles On-Chain",
      desc: "Facilitator verifies the signature, settles on-chain (~1 sec), and returns the AI response.",
      code: "→ 200 { content: '...', price_paid: 0.0002 }",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <section id="how" className="px-6 sm:px-12 py-16 border-t border-[#f0f0f0]">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Protocol Flow
        </span>
        <h2 className="mt-2 font-display text-[32px] text-[#111]">
          How It Works
        </h2>
        <p className="mt-2 text-[14px] text-[#888]">
          One HTTP round trip. Payment as a native HTTP primitive.
        </p>
      </div>

      <div className="mt-10 space-y-0">
        {steps.map((step, i) => (
          <div key={step.num} className="relative flex gap-5">
            {/* Connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold ${step.color}`}
              >
                {step.num}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-[#e8e8e8]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-8 pt-1">
              <h3 className="text-[17px] font-semibold text-[#111]">
                {step.title}
              </h3>
              <p className="mt-1 text-[14px] text-[#888]">{step.desc}</p>
              <div className="mt-2 inline-block rounded-lg bg-[#fafafa] border border-[#e8e8e8] px-3 py-1.5 font-mono text-[12px] text-[#666]">
                {step.code}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const components = [
    {
      title: "Gateway Server",
      path: "server/",
      desc: "Express + x402 payment middleware. Receives USDC, proxies to Groq, returns AI response.",
      tags: ["x402", "Express", "Groq"],
    },
    {
      title: "Treasury Agent",
      path: "agent/",
      desc: "Autonomous bot adjusting prices based on demand. Supplies idle funds to Aave V3 for yield.",
      tags: ["Cron", "Aave V3", "Dynamic Pricing"],
    },
    {
      title: "Client SDK",
      path: "client/",
      desc: "WDK wallet + x402 fetch wrapper. Handles 402 → sign → retry cycle transparently.",
      tags: ["WDK", "EIP-3009", "Self-Custodial"],
    },
  ];

  return (
    <section className="px-6 sm:px-12 py-16 border-t border-[#f0f0f0] grid-pattern">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Architecture
        </span>
        <h2 className="mt-2 font-display text-[32px] text-[#111]">
          Three Components
        </h2>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {components.map((c) => (
          <div
            key={c.title}
            className="group rounded-2xl border-[1.5px] border-[#e8e8e8] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#d0d0d0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-[#111]">
                {c.title}
              </h3>
              <span className="font-mono text-[11px] text-[#bbb]">
                {c.path}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#888]">
              {c.desc}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[#e8e8e8] bg-[#fafafa] px-3 py-1 text-[11px] font-medium text-[#888]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StackSection() {
  const stack = [
    { layer: "Wallets", tech: "WDK (self-custodial EVM)", tag: "wdk" },
    { layer: "Payment", tech: "x402 protocol", tag: "x402" },
    { layer: "Settlement", tech: "Base Sepolia (EVM)", tag: "chain" },
    { layer: "Token", tech: "USDC (Circle)", tag: "token" },
    { layer: "AI Backend", tech: "Groq API (Llama, DeepSeek)", tag: "ai" },
    { layer: "Yield", tech: "Aave V3 (Arbitrum)", tag: "defi" },
  ];

  return (
    <section className="px-6 sm:px-12 py-16 border-t border-[#f0f0f0]">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Technology
        </span>
        <h2 className="mt-2 font-display text-[32px] text-[#111]">Stack</h2>
      </div>

      <div className="mx-auto mt-8 max-w-lg">
        <div className="rounded-2xl border-[1.5px] border-[#e8e8e8] bg-white divide-y divide-[#f0f0f0]">
          {stack.map((s) => (
            <div
              key={s.layer}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#999] w-24">
                {s.layer}
              </span>
              <span className="text-[14px] font-medium text-[#111] flex-1 text-right">
                {s.tech}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#f0f0f0] px-6 sm:px-12 py-8 text-center rounded-b-2xl">
      <p className="text-[13px] text-[#bbb]">
        Built for{" "}
        <span className="font-semibold text-[#888]">
          Hackathon Galactica: WDK Edition 1
        </span>{" "}
        — Agent Wallets Track
      </p>
      <p className="mt-2 text-[12px] text-[#ccc]">
        x402 protocol + WDK self-custodial wallets + Groq inference
      </p>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <ModelsSection />
      <DemoSection />
      <HowItWorksSection />
      <ArchitectureSection />
      <StackSection />
      <Footer />
    </>
  );
}
