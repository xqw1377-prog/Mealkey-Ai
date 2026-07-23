"use client";

/**
 * 口述拆解确认：展示「我听到了」字段，低置信度标红引导微追问
 */

import type { ParseUtteranceResult } from "@/lib/intake-dialogue-turns";

const LABELS: Record<string, string> = {
  brandName: "店名",
  companyName: "公司",
  category: "品类",
  city: "城市",
  region: "区域",
  intent: "判断",
  constraint: "约束",
  targetCustomer: "客群",
  ticketBand: "客单",
  rivals: "对手",
  budget: "预算",
  timeline: "时限",
  stage: "阶段",
  storeCount: "门店",
  storeScale: "门店",
  avgTicket: "客单",
  unitEconomics: "单位经济",
  pain: "疼点",
  priority: "优先",
  resource: "资源",
  repeatSignal: "复购",
  copyBlocker: "复制",
  topic: "议题",
  team: "团队",
  founderCount: "创始人",
  capTableNow: "持股",
  control: "控制权",
  raisePlan: "融资",
  vesting: "成熟",
  redLine: "红线",
  currentPositioning: "定位",
  competitors: "对手",
  advantages: "优势",
  slogan: "广告语",
  annualRevenue: "营收",
  businessGoal: "目标",
  mainPain: "痛点",
};

export function IntakeHeardConfirm({
  parsed,
  onDismiss,
}: {
  parsed: ParseUtteranceResult;
  onDismiss?: () => void;
}) {
  if (!parsed.fields.length) return null;
  const needMore = parsed.unresolved.length > 0;

  return (
    <div className="space-y-2 rounded-[16px] border border-[rgba(95,107,78,0.28)] bg-white px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[#4a5344]">
          {needMore ? "已抓住一部分，还差这些" : "我听到了"}
        </p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-[#8a8680]"
          >
            收起
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {parsed.fields.map((f) => {
          const missing = parsed.unresolved.includes(f.key);
          return (
            <span
              key={f.key}
              className={`rounded-full px-2.5 py-1 text-[12px] ${
                missing
                  ? "bg-[rgba(165,107,77,0.12)] text-[#8A4F31]"
                  : f.confidence === "high"
                    ? "bg-[rgba(95,107,78,0.14)] text-[#3d4638]"
                    : "bg-[rgba(20,20,19,0.06)] text-[#5c6168]"
              }`}
            >
              {LABELS[f.key] || f.key}
              {missing ? " · 待补" : f.value ? ` · ${clip(f.value, 16)}` : ""}
            </span>
          );
        })}
      </div>
      {needMore ? (
        <p className="text-[12px] leading-5 text-[#8A4F31]">
          下一问会针对缺口追问，说具体事实即可。
        </p>
      ) : null}
    </div>
  );
}

function clip(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
