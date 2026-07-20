"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export type EightDimPoint = {
  dim: string;
  label: string;
  score: number;
  note?: string;
};

type CapabilityEightRadarProps = {
  dimensions: EightDimPoint[];
  decisionQualityTotal?: number | null;
  weakestLabel?: string | null;
  /** os=能力页；atelier=流程卷宗 */
  variant?: "os" | "atelier";
};

/**
 * 八维雷达 — OS / atelier 两套 token，禁止同屏混用
 */
export function CapabilityEightRadar({
  dimensions,
  decisionQualityTotal,
  weakestLabel,
  variant = "os",
}: CapabilityEightRadarProps) {
  const atelier = variant === "atelier";
  const olive = atelier ? "#5f6b4e" : "#66735E";
  const copper = atelier ? "#a56b4d" : "#B47C5C";
  const ink = atelier ? "#141413" : "#202124";
  const line = atelier ? "rgba(20,20,19,0.08)" : "rgba(24,24,23,0.08)";

  const SHORT: Record<string, string> = {
    strategy: "战略",
    positioning: "定位",
    marketing: "市场",
    product: "产品",
    finance: "财务",
    organization: "组织",
    execution: "执行",
    learning: "复盘",
  };
  const data = dimensions.map((d) => ({
    label: SHORT[d.dim] || d.label.slice(0, 2),
    fullLabel: d.label,
    value: Math.max(0, Math.min(100, Math.round(d.score))),
  }));

  if (!data.length) return null;

  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];

  return (
    <section className={`border-y py-6`} style={{ borderColor: line }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p
            className={`text-[12px] tracking-[0.08em] ${
              atelier
                ? "text-[11px] font-medium tracking-[0.14em] text-[#5f6b4e]"
                : "text-[#66735E]"
            }`}
          >
            成长 · 八维能力
          </p>
          <p className="mt-1 text-[15px] leading-6 text-[#6f747b]">
            由验证与复盘投影，不是课程评分
          </p>
        </div>
        {typeof decisionQualityTotal === "number" ? (
          <p className="text-[13px] text-[#6f747b]">
            决策质量{" "}
            <span
              className={`${
                atelier ? "font-serif-cn text-[20px]" : "font-display text-[18px]"
              } font-semibold`}
              style={{ color: ink }}
            >
              {decisionQualityTotal}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(24,24,23,0.10)" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: "#5f6368", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="能力"
                dataKey="value"
                stroke={olive}
                fill={olive}
                fillOpacity={0.28}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <ul
          className="space-y-2 text-[13px] leading-6"
          style={{ color: ink }}
        >
          {sorted.map((d) => (
            <li
              key={d.dim}
              className="flex items-baseline justify-between gap-3 border-b pb-1.5 last:border-0"
              style={{ borderColor: line }}
            >
              <span
                className={
                  d.dim === low?.dim || d.label === weakestLabel
                    ? "font-medium"
                    : ""
                }
                style={
                  d.dim === low?.dim || d.label === weakestLabel
                    ? { color: copper }
                    : undefined
                }
              >
                {d.label}
                {d.dim === low?.dim ? (
                  <span className="ml-1.5 text-[11px]" style={{ color: copper }}>
                    短板
                  </span>
                ) : null}
                {d.dim === top?.dim ? (
                  <span className="ml-1.5 text-[11px]" style={{ color: olive }}>
                    优势
                  </span>
                ) : null}
              </span>
              <span
                className={`${
                  atelier ? "font-serif-cn" : "font-display"
                } text-[16px] font-semibold tracking-[-0.03em]`}
              >
                {Math.round(d.score)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
