"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  DeveloperShell,
  DocHeader,
} from "../../../../_components/developer-portal";
import { LIFECYCLE_LABEL } from "@/lib/developers/capability-registry";

type AgentDetail = {
  name: string;
  agentId: string;
  category: string;
  lifecycleStatus: string;
  listingId?: string | null;
  listingSlug?: string | null;
  version?: {
    pricing?: { model?: string; priceMonthlyFen?: number } | null;
  } | null;
};

export default function AgentListingPreviewPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/developers/agents/${id}`, { cache: "no-store" });
    const body = (await res.json()) as { ok?: boolean; error?: string; agent?: AgentDetail };
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/developers/console/agents/${id}/listing`)}`);
      return;
    }
    if (!res.ok || !body.ok || !body.agent) {
      setError(body.error || "加载失败");
      return;
    }
    setAgent(body.agent);
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const price =
    agent?.version?.pricing?.model === "subscription" && agent.version.pricing.priceMonthlyFen
      ? `¥${(agent.version.pricing.priceMonthlyFen / 100).toFixed(0)}/月`
      : agent?.version?.pricing?.model === "free" || !agent?.version?.pricing
        ? "免费"
        : agent.version.pricing.model;

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-lg px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="MARKETPLACE PREVIEW"
          title="上架预览"
          description="开发者看到的老板侧卡片草稿。发布后可跳转 Store 安装。"
          authority="UI/UX §7 · Marketplace PRD"
        />

        {error ? <p className="text-[13px] text-[#8b3a2f]">{error}</p> : null}

        {agent ? (
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.1)] bg-white/80 px-5 py-6">
            <p className="font-display text-[22px] font-semibold tracking-[-0.03em] text-[#171717]">
              {agent.name}
            </p>
            <p className="mt-2 text-[13px] text-[#6f747b]">提供商 · {agent.agentId}</p>
            <p className="mt-4 text-[14px] text-[#3a3d41]">能力品类：{agent.category}</p>
            <p className="mt-1 text-[14px] text-[#3a3d41]">适用：餐饮老板 / 运营</p>
            <p className="mt-4 text-[15px] font-semibold text-[#171717]">{price}</p>
            <p className="mt-2 text-[12px] text-[#8a8f98]">
              状态：{LIFECYCLE_LABEL[agent.lifecycleStatus] ?? agent.lifecycleStatus}
            </p>
            {agent.lifecycleStatus === "published" && (agent.listingSlug || agent.agentId) ? (
              <Link
                href={`/store/agents/${agent.listingSlug || agent.agentId
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")}`}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[#181817] text-[14px] font-semibold text-white"
              >
                在 Store 查看 / 安装
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[rgba(24,24,23,0.12)] text-[14px] font-semibold text-[#6f747b]"
              >
                Install（发布后在 Store 可用）
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
          <Link
            href="/developers/console"
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            返回 Console
          </Link>
          <Link
            href={`/developers/console/agents/${id}/sandbox`}
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            Sandbox
          </Link>
        </div>
      </main>
    </DeveloperShell>
  );
}
