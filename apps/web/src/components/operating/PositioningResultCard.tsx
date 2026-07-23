"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  ShieldAlert,
  Target,
  Users,
  Wallet,
  Sparkles,
} from "lucide-react";
import type { PositioningSnapshot } from "@/lib/positioning";
import { PRODUCT_BRAND_TITLE } from "@/lib/product-brand";
import { cn } from "@/lib/utils";

type PositioningResultCardProps = {
  snapshot: PositioningSnapshot;
  projectId?: string;
  compact?: boolean;
  className?: string;
  showActions?: boolean;
};

const RECOMMEND_LABEL: Record<string, string> = {
  primary: "主推荐",
  secondary: "次推荐",
  backup: "备选",
  reject: "不推荐",
};

export function PositioningResultCard({
  snapshot,
  projectId,
  compact = false,
  className,
  showActions = true,
}: PositioningResultCardProps) {
  const bp = snapshot.brandPositioning || {};
  const confPct = Math.round(snapshot.confidence * 100);
  const recommend = snapshot.decision_recommend
    ? RECOMMEND_LABEL[snapshot.decision_recommend] || snapshot.decision_recommend
    : null;
  const theoryEntries = formatTheoryEntries(snapshot.theoryVoteSummary);
  const validationGroups = formatValidationGroups(snapshot.validation);
  const reasoningBlocks = [
    { title: "经营现实", body: snapshot.observation },
    { title: "为什么是这个方向", body: snapshot.diagnosis },
    { title: "落地策略", body: snapshot.strategy },
  ].filter((item) => Boolean(item.body));

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white shadow-[0_14px_30px_rgba(24,24,23,0.04)]",
        className,
      )}
    >
      {/* Hero conclusion */}
      <div className="bg-[#171717] p-5 text-[#F6F3ED] md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#B7BEA8]">
          <Target className="h-3.5 w-3.5" />
          <span>品牌定位结论</span>
          <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 normal-case tracking-normal text-[11px]">
            {PRODUCT_BRAND_TITLE}
          </span>
          {recommend && (
            <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 normal-case tracking-normal text-[11px]">
              {recommend}
            </span>
          )}
          <span className="ml-auto rounded-full bg-[rgba(102,115,94,0.35)] px-2.5 py-0.5 normal-case tracking-normal text-[12px] text-[#E8EDDF]">
            信心 {confPct}%
          </span>
        </div>
        <p className="mt-4 text-[20px] leading-[1.35] tracking-[-0.02em] md:text-[22px]">
          {snapshot.oneLiner}
        </p>
        {!compact && snapshot.diagnosis && (
          <p className="mt-3 text-[13px] leading-6 text-[#B7BEA8]">
            {snapshot.diagnosis}
          </p>
        )}
        {snapshot.updatedAt && (
          <p className="mt-3 text-[11px] text-[#B7BEA8]">
            更新于 {formatTime(snapshot.updatedAt)}
            {snapshot.source ? ` · ${snapshot.source}` : ""}
          </p>
        )}
      </div>

      {/* Brand card grid */}
      <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5">
        <Field
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="品牌名"
          value={bp.brandName || "待补"}
        />
        <Field
          icon={<Target className="h-3.5 w-3.5" />}
          label="心智位置"
          value={bp.mentalPosition || snapshot.oneLiner}
        />
        <Field
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="品类"
          value={bp.category || "—"}
        />
        <Field
          icon={<Users className="h-3.5 w-3.5" />}
          label="目标客群"
          value={bp.targetCustomers || "—"}
        />
        <Field
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="价格带"
          value={bp.priceRange || "—"}
        />
        <Field
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="差异化"
          value={bp.differentiation || snapshot.strategy || "—"}
          className="sm:col-span-2"
        />
        {bp.brandTonality && (
          <Field
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="品牌调性"
            value={bp.brandTonality}
            className="sm:col-span-2"
          />
        )}
      </div>

      {!compact && (
        <div className="space-y-4 border-t border-[rgba(24,24,23,0.06)] px-4 py-4 md:px-5">
          {reasoningBlocks.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
                判断依据
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {reasoningBlocks.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] px-3 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#6f747b]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-[#202124]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {theoryEntries.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
                <GitCompareArrows className="h-3.5 w-3.5" />
                理论共识
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {theoryEntries.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-[#202124]">{item.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${item.tone}`}>
                        {item.recommend}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                      {item.preferred || "本轮没有形成清晰偏好"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshot.strategy && (
            <Block title="策略" body={snapshot.strategy} />
          )}
          {snapshot.action && <Block title="行动" body={snapshot.action} />}

          {(snapshot.risks?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
                <ShieldAlert className="h-3.5 w-3.5" />
                主要风险
              </p>
              <ul className="space-y-2">
                {snapshot.risks!.slice(0, 4).map((r, i) => (
                  <li
                    key={i}
                    className="rounded-[14px] bg-[#FBF9F5] px-3 py-2 text-[13px] leading-6 text-[#202124]"
                  >
                    <span className="mr-2 inline-flex rounded-full bg-[rgba(180,124,92,0.15)] px-2 py-0.5 text-[11px] text-[#B47C5C]">
                      {r.level || "medium"}
                    </span>
                    {r.risk}
                    {r.mitigation ? (
                      <span className="mt-1 block text-[12px] text-[#5f6368]">
                        缓解：{r.mitigation}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(snapshot.nextSteps?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
                下一步
              </p>
              <ol className="space-y-2">
                {snapshot.nextSteps!.slice(0, 5).map((n, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[13px] leading-6 text-[#202124]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#181817] text-[11px] text-white">
                      {i + 1}
                    </span>
                    <span>
                      {n.step}
                      {(n.timeline || n.priority) && (
                        <span className="ml-1 text-[12px] text-[#5f6368]">
                          {n.timeline ? `· ${n.timeline}` : ""}
                          {n.priority ? ` · ${n.priority}` : ""}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {validationGroups.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
                验证条件
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {validationGroups.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] px-3 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#6f747b]">
                      {group.label}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {group.items.map((item, index) => (
                        <li
                          key={`${group.label}-${index}`}
                          className="text-[13px] leading-6 text-[#202124]"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showActions && projectId && (
        <div className="flex flex-wrap gap-2 border-t border-[rgba(24,24,23,0.06)] px-4 py-4 md:px-5">
          <Link
            href={`/projects/${projectId}/positioning`}
            className="inline-flex items-center gap-2 rounded-full bg-[#181817] px-4 py-2 text-[13px] font-medium text-white no-underline"
          >
            打开定位工作台
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/projects/${projectId}/decisions`}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124] no-underline"
          >
            决策档案
          </Link>
          <Link
            href={`/projects/${projectId}/decision-room`}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] no-underline"
          >
            进决策室
          </Link>
        </div>
      )}
    </section>
  );
}

function Field({
  icon,
  label,
  value,
  className,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] p-3",
        className,
      )}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[#6f747b]">
        {icon}
        {label}
      </p>
      <p className="text-[13px] leading-6 text-[#202124]">{value || "—"}</p>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">
        {title}
      </p>
      <p className="text-[13px] leading-6 text-[#202124]">{body}</p>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

function formatTheoryEntries(
  theoryVoteSummary: PositioningSnapshot["theoryVoteSummary"],
) {
  const labels: Record<string, string> = {
    ries: "心智占位",
    trout: "竞争空位",
    ye_maozhong: "冲突记忆",
  };

  const recommendLabels: Record<string, string> = {
    strong_recommend: "强推荐",
    recommend: "推荐",
    weak_recommend: "弱推荐",
    not_recommend: "不推荐",
  };

  return Object.entries(theoryVoteSummary || {}).map(([key, value]) => {
    const recommend = recommendLabels[value?.theory_recommend || ""] || value?.theory_recommend || "已评估";
    const tone =
      value?.theory_recommend === "strong_recommend" || value?.theory_recommend === "recommend"
        ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
        : value?.theory_recommend === "not_recommend"
          ? "bg-[rgba(180,124,92,0.12)] text-[#B47C5C]"
          : "bg-[rgba(24,24,23,0.06)] text-[#5f6368]";

    return {
      key,
      label: labels[key] || key,
      preferred: value?.preferred || "",
      recommend,
      tone,
    };
  });
}

function formatValidationGroups(
  validation: PositioningSnapshot["validation"],
) {
  const groups = [
    { label: "30 天验证", items: validation?.day30 || [] },
    { label: "90 天验证", items: validation?.day90 || [] },
    { label: "止损条件", items: validation?.killCriteria || [] },
  ];

  return groups.filter((group) => group.items.length > 0);
}
