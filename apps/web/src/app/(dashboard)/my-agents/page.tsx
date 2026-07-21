"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageContent } from "@/components/operating/PageContent";

type MyAgent = {
  id: string;
  agentCode: string;
  status: string;
  source: string;
  startedAt: string;
  listingId: string | null;
};

export default function MyAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<MyAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/my-agents", { cache: "no-store" });
    const body = (await res.json()) as { ok?: boolean; error?: string; agents?: MyAgent[] };
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/my-agents")}`);
      return;
    }
    if (!res.ok || !body.ok) {
      setError(body.error || "加载失败");
      return;
    }
    setAgents(body.agents ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/my-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", entitlementId: id }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || "停用失败");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContent width="narrow" inset="shell">
      <header className="mb-8">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-[#66735E]">MY AGENTS</p>
        <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.03em] text-[#171717]">
          我的 Agent
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[#5f6368]">
          安装 = 授权进经营台。停用后 Gateway 将对该 Agent 返回未安装 403。
        </p>
      </header>

      {error ? <p className="mb-4 text-[13px] text-[#8b3a2f]">{error}</p> : null}

      {agents.length === 0 ? (
        <div className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-5 py-6 text-[14px] text-[#6f747b]">
          尚未安装 Agent。
          <Link href="/store" className="ml-2 font-medium text-[#465240] underline-offset-2 hover:underline">
            去 Store 浏览
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white/80 px-4 py-4"
            >
              <div>
                <p className="text-[15px] font-semibold text-[#171717]">{agent.agentCode}</p>
                <p className="mt-1 text-[12px] text-[#8a8f98]">
                  {agent.status} · {agent.source} · {new Date(agent.startedAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              {agent.status === "active" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void revoke(agent.id)}
                  className="rounded-[10px] border border-[rgba(24,24,23,0.12)] px-3 py-2 text-[13px] font-medium disabled:opacity-50"
                >
                  停用授权
                </button>
              ) : (
                <span className="text-[12px] text-[#8a8f98]">已停用</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-[13px]">
        <Link href="/store" className="font-medium text-[#465240] underline-offset-2 hover:underline">
          Store
        </Link>
        <Link href="/billing" className="font-medium text-[#465240] underline-offset-2 hover:underline">
          经营点
        </Link>
        <Link href="/dashboard" className="font-medium text-[#465240] underline-offset-2 hover:underline">
          今日
        </Link>
      </div>
    </PageContent>
  );
}
