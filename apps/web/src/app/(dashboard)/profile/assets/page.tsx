"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileAudio, FileImage, FileText, FileVideo, Trash2 } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

function getKindLabel(kind: string) {
  switch (kind) {
    case "audio":
      return "语音";
    case "image":
      return "图片";
    case "video":
      return "视频";
    default:
      return "文档";
  }
}

function getKindIcon(kind: string) {
  switch (kind) {
    case "audio":
      return FileAudio;
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    default:
      return FileText;
  }
}

export default function AssetCenterPage() {
  const utils = trpc.useUtils();
  const { data: categories = [], isLoading: loadingCategories, error: categoryError } = trpc.asset.categories.useQuery();
  const { data: assets = [], isLoading: loadingAssets, error: assetError } = trpc.asset.list.useQuery({ limit: 100 });
  const updateAsset = trpc.asset.update.useMutation({
    onSuccess: async () => {
      await utils.asset.list.invalidate({ limit: 100 });
    },
  });
  const deleteAsset = trpc.asset.delete.useMutation({
    onSuccess: async () => {
      await utils.asset.list.invalidate({ limit: 100 });
    },
  });
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  const filteredAssets = useMemo(() => {
    if (activeCategoryId === "all") return assets;
    return assets.filter((item) => item.category?.id === activeCategoryId);
  }, [activeCategoryId, assets]);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      audio: assets.filter((item) => item.kind === "audio").length,
      image: assets.filter((item) => item.kind === "image").length,
      video: assets.filter((item) => item.kind === "video").length,
      document: assets.filter((item) => item.kind === "document").length,
    };
  }, [assets]);

  if (loadingCategories || loadingAssets) {
    return <PageLoadingState eyebrow="资料中心" title="AI 正在整理你的资料资产" description="正在读取分类、摘要和可用于经营判断的资料素材。" />;
  }

  if (categoryError || assetError) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="资料中心"
          title="暂时打不开"
          description="资料还在同步。先回画像或去开会。"
          primaryAction={{ href: "/profile", label: "回画像" }}
          secondaryAction={{ href: "/projects", label: "我的企业" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <MKPageHeader
        eyebrow="资料中心"
        title="资料"
        description="开会会用到的材料，不是附件堆。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
            长期
          </div>
        }
      />

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[16px] bg-white/75 p-4">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">资料总量</p>
            <p className="mt-1 text-[28px] leading-none tracking-[-0.03em] text-[#202124]">{stats.total}</p>
          </div>
          <div className="rounded-[16px] bg-white/75 p-4">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">文档</p>
            <p className="mt-1 text-[28px] leading-none tracking-[-0.03em] text-[#202124]">{stats.document}</p>
          </div>
          <div className="rounded-[16px] bg-white/75 p-4">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">图片</p>
            <p className="mt-1 text-[28px] leading-none tracking-[-0.03em] text-[#202124]">{stats.image}</p>
          </div>
          <div className="rounded-[16px] bg-white/75 p-4">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">语音 / 视频</p>
            <p className="mt-1 text-[28px] leading-none tracking-[-0.03em] text-[#202124]">{stats.audio + stats.video}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategoryId("all")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              activeCategoryId === "all"
                ? "bg-[#181817] text-white"
                : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
            }`}
          >
            全部资料
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                activeCategoryId === category.id
                  ? "bg-[#181817] text-white"
                  : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">分类管理</p>
            <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">当前资料</h2>
          </div>
          <Link
            href="/projects"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-3 py-2 text-[13px] font-medium text-[#202124]"
          >
            继续去会议使用
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredAssets.map((asset) => {
            const KindIcon = getKindIcon(asset.kind);
            return (
              <div key={asset.id} className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[12px] text-[#6f747b]">
                      <KindIcon className="h-4 w-4" />
                      <span>{getKindLabel(asset.kind)}</span>
                    </div>
                    <p className="mt-2 truncate text-[16px] font-medium leading-6 text-[#202124]">{asset.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">{asset.fileName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={asset.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-medium text-[#66735E] no-underline"
                    >
                      查看
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("确认删除这份资料？删除后不可恢复。")) {
                          deleteAsset.mutate({ assetId: asset.id });
                        }
                      }}
                      disabled={deleteAsset.isPending}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-1.5 text-[#8b877f] transition hover:bg-[rgba(180,124,92,0.10)] hover:text-[#B47C5C] disabled:opacity-50"
                      aria-label="删除资料"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-[14px] leading-[1.72] text-[#202124]">
                  {asset.summary ?? "这份资料已归档，可被会议分析和长期画像调用。"}
                </p>

                {asset.extractedText && !/[\x00-\x08\x0E-\x1F]/.test(asset.extractedText) ? (
                  <div className="mt-3 rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-3">
                    <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">提取内容</p>
                    <p className="mt-1 line-clamp-3 text-[13px] leading-6 text-[#6f747b]">{asset.extractedText}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  <select
                    value={asset.category?.id ?? ""}
                    onChange={(event) =>
                      updateAsset.mutate({
                        assetId: asset.id,
                        categoryId: event.target.value || null,
                      })
                    }
                    className="min-h-10 flex-1 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] focus:outline-none"
                  >
                    <option value="">未分类</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] text-[#6f747b]">
                    {asset.category?.name ?? "未分类"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] px-4 py-10 text-center">
            <p className="text-[16px] leading-7 text-[#202124]">当前分类下还没有资料</p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              开会时上传预算、图片、语音或文档，就会出现在这里。
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
