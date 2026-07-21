"use client";

import type { Dispatch, SetStateAction } from "react";

import type { ListingRow, PlatformAdminMetric } from "@/server/services/platform-admin.service";

import {
  DemoChip,
  DetailField,
  EmptyState,
  MetricGrid,
  ObjectsTable,
  PanelShell,
  SectionIntro,
  SeededFilterToggle,
} from "../admin-console-ui";

type RefreshScope = "overview" | "billing" | "learning" | "marketplace" | "objects";

type RunAction = (
  action: () => Promise<unknown>,
  options: {
    successMessage: string;
    refreshScope?: RefreshScope | RefreshScope[];
    applyResult?: (result: unknown) => void;
  },
) => void;

type ListingEdit = {
  status: string;
  visibility: string;
  priceCents: string;
};

export function MarketplacePanel({
  showSeededData,
  hiddenSeededCount,
  setShowSeededData,
  derivedMarketplaceCards,
  formatMetricValue,
  visibleMarketplaceListings,
  getListingEdit,
  setListingEdits,
  runAction,
  readJson,
  isPending,
  formatNumber,
  formatListingRating,
  statusChipTone,
}: {
  showSeededData: boolean;
  hiddenSeededCount: number;
  setShowSeededData: Dispatch<SetStateAction<boolean>>;
  derivedMarketplaceCards: PlatformAdminMetric[];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  visibleMarketplaceListings: ListingRow[];
  getListingEdit: (listing: ListingRow) => ListingEdit;
  setListingEdits: Dispatch<SetStateAction<Record<string, ListingEdit>>>;
  runAction: RunAction;
  readJson: (response: Response) => Promise<unknown>;
  isPending: boolean;
  formatNumber: (value: number | null | undefined) => string;
  formatListingRating: (value: number | null | undefined) => string;
  statusChipTone: (status: string) => string;
}) {
  return (
    <PanelShell>
      <SectionIntro
        eyebrow="上架与分润"
        title="先看 Listing 是否健康，再处理价格和可见性"
        description="这里围绕上架对象的商业健康度展开：有没有安装、是不是公开、分润规则是否完整，然后才是价格与状态编辑。"
        aside={
          <SeededFilterToggle
            showSeededData={showSeededData}
            hiddenCount={hiddenSeededCount}
            onChange={setShowSeededData}
          />
        }
      />
      <MetricGrid metrics={derivedMarketplaceCards} formatMetricValue={formatMetricValue} />
      <ObjectsTable
        id="marketplace-listings"
        eyebrow="上架工作台"
        title="Listing 工作台"
        description="把安装、评分、可见性和分润状态放在一张工作台里管理。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(visibleMarketplaceListings.length)} 个 Listing
          </span>
        }
      >
        {visibleMarketplaceListings.length === 0 ? (
          <EmptyState title="没有 Listing" description="去对象管理里创建上架对象，或者执行演示数据初始化。" />
        ) : (
          <div className="space-y-3">
            {visibleMarketplaceListings.map((listing) => (
              <div key={listing.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#202124]">{listing.name}</p>
                      {listing.isSeeded ? <DemoChip /> : null}
                      <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(listing.status)}`}>{listing.status}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                      {listing.slug} · {listing.visibility} · {listing.detailHint}
                    </p>
                    {listing.isSeeded ? (
                      <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">该 Listing 为演示上架对象，便于验证安装、可见性与分润结构。</p>
                    ) : null}
                    <div className="mt-3 grid gap-2 xl:grid-cols-3">
                      <DetailField label="安装" value={formatNumber(listing.installCount)} />
                      <DetailField label="评分" value={formatListingRating(listing.rating)} />
                      <DetailField label="分润规则" value={formatNumber(listing.revenueShareCount)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      value={getListingEdit(listing).priceCents}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            priceCents: event.target.value.replace(/\D+/g, ""),
                          },
                        }))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      onFocus={(event) => event.currentTarget.select()}
                      onMouseUp={(event) => {
                        event.preventDefault();
                        event.currentTarget.select();
                      }}
                      placeholder="价格（分）"
                      className="w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    />
                    <select
                      value={getListingEdit(listing).visibility}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            visibility: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="public">public</option>
                      <option value="private">private</option>
                    </select>
                    <select
                      value={getListingEdit(listing).status}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            status: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="paused">paused</option>
                    </select>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          const draft = getListingEdit(listing);
                          const response = await fetch("/api/platform/admin/marketplace", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "update_listing",
                              id: listing.id,
                              status: draft.status,
                              visibility: draft.visibility,
                              priceCents: Number(draft.priceCents || listing.priceCents),
                            }),
                          });
                          return readJson(response);
                        }, { successMessage: "Listing 已更新", refreshScope: "marketplace" })
                      }
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      保存 Listing 设置
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ObjectsTable>
    </PanelShell>
  );
}
