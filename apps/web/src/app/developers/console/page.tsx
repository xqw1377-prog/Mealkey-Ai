"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import {
  DeveloperShell,
  DocHeader,
} from "../_components/developer-portal";

type AgentRow = {
  id: string;
  agentId: string;
  name: string;
  lifecycleStatus: string;
  lifecycleLabel: string;
  qualityScore: number | null;
  version: string | null;
  completion: {
    percent: number;
    steps: { manifest: boolean; connect: boolean; sandbox: boolean; submit: boolean };
  };
};

type ConsolePayload = {
  account: { id: string; displayName: string; status: string; contactEmail: string };
  agents: AgentRow[];
};

export default function DevelopersConsolePage() {
  const router = useRouter();
  const [data, setData] = useState<ConsolePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/developers/agents", { cache: "no-store" });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        account?: ConsolePayload["account"];
        agents?: AgentRow[];
      };
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/developers/console")}`);
        return;
      }
      if (res.status === 403) {
        setError(body.error ?? "请先完成入驻申请");
        setData(null);
        return;
      }
      if (!res.ok || !body.ok || !body.account) {
        throw new Error(body.error || "加载失败");
      }
      setData({ account: body.account, agents: body.agents ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const focus = data?.agents[0] ?? null;

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="CONSOLE"
          title="Developer Console"
          description="创建、连接、Sandbox、提审。上架审核由平台运营台处理。"
          authority="MEALKEY_DEVELOPER_PORTAL_IA_DATA_MODEL_V1 · UI/UX §8"
        />

        {loading ? (
          <p className="text-[14px] text-[#6f747b]">加载中…</p>
        ) : error ? (
          <div className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-4 py-5">
            <p className="text-[14px] text-[#8b3a2f]">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/developers/apply"
                className="inline-flex min-h-10 items-center rounded-[10px] bg-[#181817] px-4 text-[13px] font-semibold text-white"
              >
                去入驻申请
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium"
              >
                重试
              </button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8">
            <section>
              <p className="text-[15px] text-[#3a3d41]">
                你好，<span className="font-semibold text-[#171717]">{data.account.displayName}</span>
              </p>
              <p className="mt-1 text-[12px] text-[#8a8f98]">{data.account.contactEmail}</p>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/developers/console/agents/new"
                className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-[#181817] px-4 text-[14px] font-semibold text-white"
              >
                创建 Agent
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers/console/billing"
                className="inline-flex min-h-11 items-center rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#171717]"
              >
                分成与结算
              </Link>
            </div>

            {focus ? (
              <section className="border-t border-[rgba(24,24,23,0.1)] pt-6">
                <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">
                  当前焦点
                </p>
                <h2 className="mt-2 font-display text-[22px] font-semibold text-[#171717]">
                  {focus.name}
                </h2>
                <p className="mt-1 text-[13px] text-[#6f747b]">{focus.agentId}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-[13px]">
                  <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1">
                    {focus.lifecycleLabel}
                  </span>
                  <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1">
                    Quality {focus.qualityScore ?? "—"}
                  </span>
                  <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1">
                    v{focus.version ?? "—"}
                  </span>
                  <span className="rounded-full bg-[rgba(102,115,94,0.12)] px-2.5 py-1 text-[#3d4a34]">
                    完成度 {focus.completion.percent}%
                  </span>
                </div>
                <ul className="mt-4 space-y-1.5 text-[13px] text-[#5f6368]">
                  <li>{focus.completion.steps.manifest ? "✓" : "□"} 完成 Manifest</li>
                  <li>{focus.completion.steps.connect ? "✓" : "□"} 连接 Endpoint</li>
                  <li>{focus.completion.steps.sandbox ? "✓" : "□"} 通过 Sandbox</li>
                  <li>{focus.completion.steps.submit ? "✓" : "□"} 提交审核</li>
                </ul>
                <div className="mt-5 flex flex-wrap gap-3 text-[13px]">
                  <Link
                    href={`/developers/console/agents/${focus.id}/sandbox`}
                    className="font-medium text-[#465240] underline-offset-2 hover:underline"
                  >
                    Sandbox
                  </Link>
                  <Link
                    href={`/developers/console/agents/${focus.id}/submit`}
                    className="font-medium text-[#465240] underline-offset-2 hover:underline"
                  >
                    提交审核
                  </Link>
                  <Link
                    href={`/developers/console/agents/${focus.id}/listing`}
                    className="font-medium text-[#465240] underline-offset-2 hover:underline"
                  >
                    上架预览
                  </Link>
                </div>
              </section>
            ) : (
              <p className="text-[14px] text-[#6f747b]">还没有 Agent。从「创建 Agent」开始。</p>
            )}

            {data.agents.length > 1 ? (
              <section className="border-t border-[rgba(24,24,23,0.08)] pt-6">
                <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">
                  My Agents
                </p>
                <ul className="mt-3 space-y-2">
                  {data.agents.map((agent) => (
                    <li key={agent.id}>
                      <Link
                        href={`/developers/console/agents/${agent.id}/sandbox`}
                        className="flex items-center justify-between rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-3 py-3 text-[13px] no-underline hover:border-[#66735E]"
                      >
                        <span className="font-medium text-[#171717]">{agent.name}</span>
                        <span className="text-[#6f747b]">{agent.lifecycleLabel}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </DeveloperShell>
  );
}
