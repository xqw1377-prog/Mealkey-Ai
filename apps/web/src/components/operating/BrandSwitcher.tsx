"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { refreshBrandAcrossApp } from "@/lib/invalidate-brand-queries";
import { trpc } from "@/lib/trpc";

type BrandSwitcherProps = {
  projectId: string;
  variant?: "compact" | "full";
  className?: string;
  dirtyGuard?: boolean;
  onDiscardDirty?: () => void;
};

type PendingSwitch = {
  brandId: string;
  title: string;
  description: string;
  discardDirty: boolean;
};

/**
 * 品牌栏：切换当前工作品牌。
 */
export function BrandSwitcher({
  projectId,
  variant = "compact",
  className = "",
  dirtyGuard = false,
  onDiscardDirty,
}: BrandSwitcherProps) {
  const utils = trpc.useUtils();
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const { data, isLoading } = trpc.project.listBrands.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const switchBrand = trpc.project.switchBrand.useMutation({
    onSuccess: async () => {
      setPending(null);
      await refreshBrandAcrossApp(utils, projectId);
    },
  });

  if (!projectId || isLoading || !data?.activeBrand) {
    return null;
  }

  const settingsHref = `/projects/${projectId}/settings`;
  const metaById = new Map((data.brandsMeta || []).map((m) => [m.id, m]));

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label className="relative inline-flex min-h-11 items-center gap-1.5 border border-[rgba(24,24,23,0.08)] bg-white px-2.5 text-[13px] text-[#202124]">
        <span className="text-[11px] tracking-[0.06em] text-[#6f747b]">品牌</span>
        <select
          className="max-w-[180px] cursor-pointer appearance-none border-0 bg-transparent py-1.5 pr-5 text-[13px] font-medium text-[#202124] outline-none disabled:cursor-not-allowed disabled:opacity-60"
          value={data.activeBrandId || ""}
          disabled={switchBrand.isPending || Boolean(pending)}
          onChange={(e) => {
            const brandId = e.target.value;
            e.target.value = data.activeBrandId || "";
            if (!brandId || brandId === data.activeBrandId) return;

            const meta = metaById.get(brandId);
            const name =
              data.brands.find((b) => b.id === brandId)?.brandName || "该品牌";
            setPending({
              brandId,
              discardDirty: dirtyGuard,
              title: dirtyGuard
                ? "切换将丢弃未保存编辑"
                : `切换到「${name}」？`,
              description: dirtyGuard
                ? `未保存的修改会丢弃。切换到「${name}」后，${
                    meta?.hasConsultingArchive
                      ? "会恢复该品牌的咨询进度。"
                      : "将开始新的咨询。"
                  }`
                : meta?.hasConsultingArchive
                  ? "会商与能力将默认用它，并恢复历史咨询。当前品牌进度会保留。"
                  : "会商与能力将默认用它，并开始新的咨询。当前品牌进度会保留。",
            });
          }}
          aria-label="切换当前工作品牌"
        >
          {data.brands.map((b) => {
            const meta = metaById.get(b.id);
            const tag = meta?.hasConsultingArchive ? " · 有历史" : "";
            return (
              <option key={b.id} value={b.id}>
                {b.brandName}
                {tag}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[#6f747b]" />
      </label>
      {dirtyGuard ? (
        <span className="text-[11px] text-[#B47C5C]">编辑中 · 切换前请先保存</span>
      ) : null}
      {variant === "full" ? (
        <Link
          href={settingsHref}
          prefetch={false}
          className="text-[12px] font-medium text-[#66735E] no-underline"
        >
          管理品牌 →
        </Link>
      ) : (
        <Link
          href={settingsHref}
          prefetch={false}
          className="text-[12px] text-[#6f747b] no-underline hover:text-[#66735E]"
          title="企业与品牌设置"
        >
          设置
        </Link>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title || "确认切换"}
        description={pending?.description}
        confirmLabel="确认切换"
        danger={Boolean(pending?.discardDirty)}
        busy={switchBrand.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.discardDirty) onDiscardDirty?.();
          switchBrand.mutate({ projectId, brandId: pending.brandId });
        }}
      />
    </div>
  );
}
