"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { refreshBrandAcrossApp } from "@/lib/invalidate-brand-queries";
import { useProjectId } from "@/hooks/useProjectId";
import { trpc } from "@/lib/trpc";

type Draft = {
  id?: string;
  brandName: string;
  category: string;
  mentalPosition: string;
  targetCustomers: string;
  priceRange: string;
  differentiation: string;
  oneLiner: string;
};

const emptyDraft = (): Draft => ({
  brandName: "",
  category: "",
  mentalPosition: "",
  targetCustomers: "",
  priceRange: "",
  differentiation: "",
  oneLiner: "",
});

export default function ProjectSettingsPage() {
  const projectId = useProjectId() || "";
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.project.listBrands.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const upsert = trpc.project.upsertBrand.useMutation({
    onSuccess: async () => {
      await refreshBrandAcrossApp(utils, projectId);
      setEditing(false);
      setDraft(emptyDraft());
    },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  useEffect(() => {
    if (data?.activeBrand && !editing) {
      setDraft({
        id: data.activeBrand.id,
        brandName: data.activeBrand.brandName || "",
        category: data.activeBrand.category || "",
        mentalPosition: data.activeBrand.mentalPosition || "",
        targetCustomers: data.activeBrand.targetCustomers || "",
        priceRange: data.activeBrand.priceRange || "",
        differentiation: data.activeBrand.differentiation || "",
        oneLiner: data.activeBrand.oneLiner || "",
      });
    }
  }, [data?.activeBrand, editing]);

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="企业设置"
        title="正在打开…"
        description="读取品牌档案。"
      />
    );
  }

  if (error || !data) {
    return (
      <PageErrorState
        eyebrow="企业设置"
        title="暂时无法打开企业设置"
        description={error?.message || "请稍后重试"}
        primaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
      />
    );
  }

  const fields: Array<{ key: keyof Draft; label: string; placeholder: string }> = [
    { key: "brandName", label: "品牌名", placeholder: "例如：能力湘菜" },
    { key: "category", label: "品类", placeholder: "例如：湘菜 / 火锅" },
    { key: "mentalPosition", label: "心智定位", placeholder: "顾客一句话记住你什么" },
    { key: "targetCustomers", label: "目标客群", placeholder: "谁最愿意为你付费" },
    { key: "priceRange", label: "价格带", placeholder: "例如：人均 80–120" },
    { key: "differentiation", label: "差异化", placeholder: "相对竞品不可替代点" },
    { key: "oneLiner", label: "品牌一句话", placeholder: "对外主张" },
  ];

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="企业设置"
        title="品牌设置"
        description="改这里之后，会议、行动、能力都按当前品牌走。"
        meta={
          <>
            <BrandSwitcher
              projectId={projectId}
              variant="full"
              dirtyGuard={editing}
              onDiscardDirty={() => {
                setEditing(false);
                if (data.activeBrand) {
                  setDraft({
                    id: data.activeBrand.id,
                    brandName: data.activeBrand.brandName || "",
                    category: data.activeBrand.category || "",
                    mentalPosition: data.activeBrand.mentalPosition || "",
                    targetCustomers: data.activeBrand.targetCustomers || "",
                    priceRange: data.activeBrand.priceRange || "",
                    differentiation: data.activeBrand.differentiation || "",
                    oneLiner: data.activeBrand.oneLiner || "",
                  });
                } else {
                  setDraft(emptyDraft());
                }
              }}
            />
            <OpsSecondaryLinks
              projectId={projectId}
              links={[
                { href: `/projects/${projectId}/agent`, label: "回对话" },
                { href: `/projects/${projectId}/capability`, label: "能力一览" },
                { href: "/profile", label: "我的" },
              ]}
            />
          </>
        }
      />

      <section className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
            {draft.id ? "编辑当前品牌" : "新建品牌"}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setDraft(emptyDraft());
            }}
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[13px] font-medium text-[#66735E] touch-manipulation"
          >
            <Plus className="h-3.5 w-3.5" />
            新增品牌
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-[12px] text-[#6f747b]">{f.label}</span>
              <input
                value={String(draft[f.key] || "")}
                onChange={(e) => {
                  setEditing(true);
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                }}
                placeholder={f.placeholder}
                className="min-h-11 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[14px] text-[#202124] outline-none focus:border-[rgba(102,115,94,0.35)]"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={!draft.brandName.trim() || upsert.isPending}
          onClick={() =>
            upsert.mutate({
              projectId,
              id: draft.id,
              brandName: draft.brandName.trim(),
              category: draft.category || undefined,
              mentalPosition: draft.mentalPosition || undefined,
              targetCustomers: draft.targetCustomers || undefined,
              priceRange: draft.priceRange || undefined,
              differentiation: draft.differentiation || undefined,
              oneLiner: draft.oneLiner || undefined,
              setActive: true,
            })
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {upsert.isPending ? "保存中…" : draft.id ? "保存品牌修改" : "创建并设为当前"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-[12px] leading-5 text-[#6f747b]">
          修改品牌名 / 品类 / 心智 / 客群等关键字段后，定位咨询进度会清空并需按新品牌重跑。
        </p>
        {upsert.error ? (
          <p className="text-[13px] text-[#B47C5C]">{upsert.error.message}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">全部品牌</p>
        <ul className="divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
          {data.brands.map((b) => (
            <li key={b.id} className="flex items-baseline justify-between gap-3 py-3">
              <div>
                <p className="text-[15px] font-medium text-[#202124]">
                  {b.brandName}
                  {b.id === data.activeBrandId ? (
                    <span className="ml-2 text-[12px] font-normal text-[#66735E]">当前</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[13px] text-[#6f747b]">
                  {[b.category, b.mentalPosition].filter(Boolean).join(" · ") || "档案待完善"}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] touch-manipulation"
                onClick={() => {
                  setEditing(true);
                  setDraft({
                    id: b.id,
                    brandName: b.brandName,
                    category: b.category || "",
                    mentalPosition: b.mentalPosition || "",
                    targetCustomers: b.targetCustomers || "",
                    priceRange: b.priceRange || "",
                    differentiation: b.differentiation || "",
                    oneLiner: b.oneLiner || "",
                  });
                }}
              >
                编辑
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/projects/${projectId}/capability`}
          prefetch={false}
          className="text-[14px] font-medium text-[#66735E] no-underline"
        >
          回到能力中心 →
        </Link>
        <Link
          href="/dashboard?radar=1"
          prefetch={false}
          className="text-[14px] font-medium text-[#6f747b] no-underline"
        >
          经营动态
        </Link>
      </div>
    </PageContent>
  );
}
