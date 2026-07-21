"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DeveloperShell,
  CodeBlock,
  DocHeader,
  DocSection,
} from "../../../_components/developer-portal";
import { CAPABILITY_REGISTRY } from "@/lib/developers/capability-registry";

const STEPS = ["Identity", "Capability", "Permission", "Runtime", "Review"] as const;

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("acme");
  const [slug, setSlug] = useState("ops-helper");
  const [category, setCategory] = useState("经营分析");
  const [capabilityIds, setCapabilityIds] = useState<string[]>([
    "ops.diagnosis.health_check",
  ]);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const agentId = useMemo(
    () => `partner.${org.trim().toLowerCase() || "org"}.${slug.trim().toLowerCase() || "agent"}`,
    [org, slug],
  );

  function toggleCap(id: string) {
    setCapabilityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/developers/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          agentId,
          category,
          capabilityIds,
          endpointUrl: endpointUrl || undefined,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        clientSecret?: string;
        agent?: { id: string };
      };
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/developers/console/agents/new")}`);
        return;
      }
      if (!res.ok || !body.ok || !body.agent) {
        throw new Error(body.error || "创建失败");
      }
      setCreatedSecret(body.clientSecret ?? null);
      setCreatedId(body.agent.id);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="CREATE AGENT"
          title="创建 Agent"
          description="从 Capability Registry 点选能力，生成 Manifest。密钥仅展示一次。"
          authority="IA §5 · Protocol Manifest"
        />

        <div className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                step === i
                  ? "bg-[#181817] text-white"
                  : "bg-[rgba(24,24,23,0.06)] text-[#5f6368]"
              }`}
            >
              {i + 1} {label}
            </button>
          ))}
        </div>

        {step === 0 ? (
          <DocSection title="Identity">
            <label className="block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">Agent Name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                placeholder="餐厅经营诊断"
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[#5f6368]">org</span>
                <input
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[#5f6368]">slug</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                />
              </label>
            </div>
            <p className="mt-2 text-[12px] text-[#6f747b]">
              Agent ID：<code className="rounded bg-white/80 px-1">{agentId}</code>
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={!name.trim()}
              className="mt-4 inline-flex min-h-10 rounded-[10px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              下一步
            </button>
          </DocSection>
        ) : null}

        {step === 1 ? (
          <DocSection title="Capability（Registry）">
            <div className="space-y-4">
              {CAPABILITY_REGISTRY.map((group) => (
                <div key={group.category}>
                  <p className="text-[13px] font-semibold text-[#171717]">{group.category}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const on = capabilityIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleCap(item.id)}
                          className={`rounded-[10px] px-2.5 py-1.5 text-[12px] ${
                            on
                              ? "bg-[#181817] text-white"
                              : "border border-[rgba(24,24,23,0.1)] bg-white text-[#5f6368]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 py-2 text-[13px]"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={capabilityIds.length === 0}
                className="rounded-[10px] bg-[#181817] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                下一步
              </button>
            </div>
          </DocSection>
        ) : null}

        {step === 2 ? (
          <DocSection title="Permission">
            <p className="text-[14px] leading-6 text-[#5f6368]">
              V1 默认：`read:restaurant` · `read:evidence` · `maxInsightLevel=3` · ports signal/insight/gap。
              不可申请默认拒绝域（银行明细 / 老板隐私等）。
            </p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">Category</span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 py-2 text-[13px]"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-[10px] bg-[#181817] px-4 py-2 text-[13px] font-semibold text-white"
              >
                下一步
              </button>
            </div>
          </DocSection>
        ) : null}

        {step === 3 ? (
          <DocSection title="Runtime">
            <p className="text-[14px] text-[#5f6368]">runtimeMode 固定 cloud_https（禁 Core inprocess）。</p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[12px] text-[#5f6368]">Endpoint URL（可后填）</span>
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[14px]"
                placeholder="https://your-agent.example.com"
              />
            </label>
            {error ? <p className="mt-3 text-[13px] text-[#8b3a2f]">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 py-2 text-[13px]"
              >
                上一步
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onCreate()}
                className="rounded-[10px] bg-[#181817] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "创建中…" : "生成 Manifest 并创建"}
              </button>
            </div>
          </DocSection>
        ) : null}

        {step === 4 && createdId ? (
          <DocSection title="Review · 已创建">
            <p className="text-[14px] text-[#3a3d41]">Agent 已创建。请立即保存密钥（只显示一次）。</p>
            {createdSecret ? (
              <div className="mt-3">
                <CodeBlock>{createdSecret}</CodeBlock>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/developers/console/agents/${createdId}/sandbox`}
                className="inline-flex min-h-10 items-center rounded-[10px] bg-[#181817] px-4 text-[13px] font-semibold text-white"
              >
                去 Sandbox
              </Link>
              <Link
                href="/developers/console"
                className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium"
              >
                返回 Console
              </Link>
            </div>
          </DocSection>
        ) : null}
      </main>
    </DeveloperShell>
  );
}
