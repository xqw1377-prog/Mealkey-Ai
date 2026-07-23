"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageEmptyState } from "@/components/operating/PageState";

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
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="我的 Agent"
        title="已安装能力"
        description="安装 = 授权进经营台。停用后 Gateway 对该 Agent 返回未安装。"
        meta={
          <OpsSecondaryLinks
            links={[
              { href: "/profile", label: "我的" },
              { href: "/store", label: "能力商店" },
            ]}
          />
        }
      />

      {error ? <p className="text-[13px] text-[#8b3a2f]">{error}</p> : null}

      {agents.length === 0 ? (
        <PageEmptyState
          eyebrow="我的 Agent"
          title="尚未安装 Agent"
          description="去商店浏览并安装，再回到经营台使用。"
          primaryAction={{ href: "/store", label: "去商店" }}
          secondaryAction={{ href: "/profile", label: "我的" }}
          inset="shell"
        />
      ) : (
        <div className="divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
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

    </PageContent>
  );
}
