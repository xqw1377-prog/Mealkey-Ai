"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import { greetingByHour } from "@/lib/time-greeting";
import type { DailyScanV1 } from "@/server/founder-layer/contracts/decision-center";
import type { RadarChangeItemV1 } from "@/server/founder-layer/contracts/business-radar";
import { decisionReadyPath } from "@/lib/decision-entry";
import { saveDecisionVoiceBrief } from "@/lib/decision-voice-brief";
import { trpc } from "@/lib/trpc";

function clipLine(text: string, max: number) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function signalTypeLabel(
  t?: "customer" | "business" | "market" | "brand" | "organization",
) {
  if (t === "customer") return "顾客";
  if (t === "business") return "生意";
  if (t === "market") return "竞争";
  if (t === "brand") return "品牌";
  if (t === "organization") return "组织";
  return "变化";
}

/** 动态模块：数据卡 + 一句解读（主页面，非二级页） */
function DynamicModule({
  eyebrow,
  children,
  emptyText,
}: {
  eyebrow: string;
  children?: ReactNode;
  emptyText?: string;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] tracking-[0.14em] text-[#66735E]">{eyebrow}</p>
      {children || (
        <div className="rounded-[14px] border border-dashed border-[rgba(24,24,23,0.12)] px-4 py-3.5">
          <p className="text-[13px] leading-5 text-[#8a8f96]">
            {emptyText || "今日暂无新变化"}
          </p>
        </div>
      )}
    </section>
  );
}

function ChangeCard({
  item,
  reading,
}: {
  item: RadarChangeItemV1;
  reading?: string;
}) {
  return (
    <article className="space-y-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] tracking-[0.08em] text-[#66735E]">
          {signalTypeLabel(item.signalType)}
        </p>
        {item.severity === "decide" ? (
          <span className="text-[11px] text-[#8A4F31]">需关注</span>
        ) : item.severity === "positive" ? (
          <span className="text-[11px] text-[#465240]">机会</span>
        ) : null}
      </div>
      <p className="text-[15px] font-medium leading-snug text-[#202124]">
        {clipLine(item.title, 40)}
      </p>
      {(reading || item.judgment || item.meaning || item.reason) && (
        <p className="text-[13px] leading-5 text-[#6f747b]">
          <span className="text-[#66735E]">解读 · </span>
          {clipLine(
            reading ||
              item.judgment ||
              item.meaning ||
              item.reason ||
              item.suggestion,
            72,
          )}
        </p>
      )}
    </article>
  );
}

/**
 * 今日主页面模块栏
 * 变化解读就在本页，不进二级页；拍板只在决策室
 */
export function DecisionCenterMorning({
  scan,
  projectId,
}: {
  scan: DailyScanV1;
  projectId: string;
  onToggleAction?: (actionId: string) => void;
  pendingActionId?: string | null;
  actionStatus?: {
    tone: "loading" | "success" | "error";
    id: string;
    title: string;
    message: string;
    done?: boolean;
  } | null;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const d = scan.diagnosis;
  // 避免 SSR/客户端时区差导致水合失败；首屏固定文案，挂载后再按时段更新
  const [greeting, setGreeting] = useState("你好");
  useEffect(() => {
    setGreeting(greetingByHour());
  }, []);
  const radar = scan.radar;
  const primary = radar?.primary || radar?.changes?.[0] || null;
  const pool = [
    ...(primary ? [primary] : []),
    ...(radar?.others || radar?.changes?.slice(1) || []),
  ];
  const seen = new Set<string>();
  const unique = pool.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const opsCards = unique.filter(
    (c) =>
      c.signalType === "business" ||
      c.signalType === "organization" ||
      /经营|客单|客流|营业|翻台|出餐|周报/.test(
        `${c.title}${c.reason}${c.signalType || ""}`,
      ),
  );
  const sentimentCards = unique.filter(
    (c) =>
      c.signalType === "customer" ||
      c.signalType === "brand" ||
      c.signalType === "market" ||
      /评价|口碑|舆情|竞争|点评/.test(`${c.title}${c.reason}`),
  );
  // 未归入上两类的其它动态
  const otherCards = unique.filter(
    (c) =>
      c.id !== primary?.id &&
      !opsCards.some((x) => x.id === c.id) &&
      !sentimentCards.some((x) => x.id === c.id),
  );

  const advancing = (scan.inbox?.items || [])
    .filter((i) => i.bucket === "executing" || i.bucket === "reviewing")
    .slice(0, 3);

  const refreshWorld = trpc.restaurantIntelligence.refreshDaily.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getHome.invalidate();
      await utils.dashboard.getDailyScan.invalidate();
    },
  });

  function enterDecisionRoom(withPrimary?: boolean) {
    if (withPrimary && primary) {
      const evidenceSummary = (primary.evidenceChain || [])
        .map((e) => e.claim)
        .filter(Boolean)
        .slice(0, 4);
      saveDecisionVoiceBrief(projectId, {
        topic: primary.decisionTopic || primary.title,
        whyNow: clipLine(
          primary.judgment || primary.meaning || primary.reason || primary.title,
          120,
        ),
        decisionQuestion: primary.decisionTopic || primary.title,
        constraints: "不突破现金底线、合规底线与团队稳定",
        successLooksLike: primary.suggestion
          ? `先做到：${primary.suggestion}`
          : "有明确选择（做 / 不做 / 条件做）",
        evidenceSummary: evidenceSummary.length ? evidenceSummary : undefined,
      });
      router.push(
        decisionReadyPath(projectId, primary.decisionTopic || primary.title, {
          whyNow: primary.judgment || primary.reason,
        }),
      );
      return;
    }
    router.push(`/projects/${projectId}/decision-room`);
  }

  const primaryReading = clipLine(
    primary?.judgment ||
      primary?.meaning ||
      radar?.headlineJudgment ||
      primary?.impact ||
      "",
    64,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.16em] text-[#66735E]">
            今日经营
          </p>
          <button
            type="button"
            disabled={refreshWorld.isPending}
            onClick={() => refreshWorld.mutate({ projectId, force: true })}
            className="inline-flex min-h-10 items-center gap-1.5 text-[12px] font-medium text-[#66735E] touch-manipulation"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshWorld.isPending ? "animate-spin" : ""}`}
            />
            {refreshWorld.isPending ? "刷新中…" : "刷新"}
          </button>
        </div>
        <h1 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.04em] text-[#202124]">
          {greeting}，{d.greetingName}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          {clipLine(
            radar?.summaryLine ||
              scan.worldScanSummary ||
              "当天动态与变化解读都在这一页。",
            44,
          )}
        </p>
      </header>

      {/* 模块栏：门店经营 */}
      <DynamicModule
        eyebrow="门店经营"
        emptyText="接通餐厅数据或上传周报后，这里显示客流/客单等变化与解读。"
      >
        {(() => {
          const list = opsCards
            .filter((c) => c.id !== primary?.id)
            .slice(0, 3);
          if (list.length === 0) return null;
          return (
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <ChangeCard item={item} />
                </li>
              ))}
            </ul>
          );
        })()}
      </DynamicModule>

      {/* 模块栏：舆情 / 外部动态 */}
      <DynamicModule
        eyebrow="舆情与外部"
        emptyText="线上口碑与竞争线索有更新时，会出现在这里。"
      >
        {(() => {
          const list = sentimentCards
            .filter((c) => c.id !== primary?.id)
            .slice(0, 3);
          if (list.length === 0) return null;
          return (
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <ChangeCard item={item} />
                </li>
              ))}
            </ul>
          );
        })()}
      </DynamicModule>

      {otherCards.length > 0 ? (
        <DynamicModule eyebrow="其它动态">
          <ul className="space-y-2">
            {otherCards.slice(0, 2).map((item) => (
              <li key={item.id}>
                <ChangeCard item={item} />
              </li>
            ))}
          </ul>
        </DynamicModule>
      ) : null}

      {/* 模块栏：推进中（系统 / Agent 事项） */}
      <DynamicModule
        eyebrow="推进中"
        emptyText="决策执行或 Agent 任务启动后，进度会出现在这里。"
      >
        {advancing.length > 0 ? (
          <ul className="space-y-2">
            {advancing.map((item) => (
              <li key={item.id}>
                <div className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3.5">
                  <p className="text-[11px] tracking-[0.08em] text-[#66735E]">
                    {item.bucket === "reviewing" ? "复盘中" : "执行中"}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-[#202124]">
                    {clipLine(item.title, 36)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </DynamicModule>

      {/* 变化解读主位：就在本页，不跳二级 */}
      <section className="space-y-4 border-y border-[rgba(24,24,23,0.1)] py-6">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">
          变化解读 · 今天最值得关注
        </p>
        {primary ? (
          <>
            <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124]">
              {primary.title}
            </h2>
            {primaryReading ? (
              <p className="text-[15px] leading-6 text-[#3a3d41]">
                {primaryReading}
              </p>
            ) : null}
            {primary.impact ? (
              <p className="text-[13px] leading-5 text-[#6f747b]">
                影响 · {clipLine(primary.impact, 56)}
              </p>
            ) : null}
            {primary.suggestion ? (
              <p className="text-[13px] leading-5 text-[#6f747b]">
                建议 · {clipLine(primary.suggestion, 56)}
              </p>
            ) : null}
            {(primary.evidenceChain || []).length > 0 ? (
              <ul className="space-y-1.5 border-t border-[rgba(24,24,23,0.06)] pt-3">
                {(primary.evidenceChain || []).slice(0, 2).map((step) => (
                  <li
                    key={`${step.order}-${step.claim.slice(0, 16)}`}
                    className="text-[12px] leading-5 text-[#6f747b]"
                  >
                    · {clipLine(step.claim, 56)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-[14px] leading-6 text-[#6f747b]">
            {clipLine(
              radar?.emptyIntelNote ||
                "今天没有尖锐变化需要解读。可进入决策室发起议题。",
              72,
            )}
          </p>
        )}

        <button
          type="button"
          onClick={() => enterDecisionRoom(Boolean(primary))}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation"
        >
          进入决策室
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {refreshWorld.error ? (
        <p className="text-[12px] text-[#8A4F31]">{refreshWorld.error.message}</p>
      ) : null}
    </div>
  );
}
