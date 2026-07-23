"use client";

import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer } from "recharts";
import { MKCard } from "./MKCard";
import type { OwnerPortrait } from "@/types/operating";

type MKRadarProps = {
  portrait: OwnerPortrait;
};

export function MKRadar({ portrait }: MKRadarProps) {
  return (
    <MKCard eyebrow="我的经营画像" title="经营能力雷达">
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[24px] bg-[#181310] p-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={portrait.dimensions}>
                <PolarGrid stroke="rgba(232,222,205,0.18)" radialLines={false} />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "#e9dcc6", fontSize: 12 }}
                />
                <Radar
                  dataKey="value"
                  stroke="#c9ab6e"
                  fill="#c9ab6e"
                  fillOpacity={0.45}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-[rgba(40,33,24,0.08)] bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">你的优势</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {portrait.strengths.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#efe0bf] px-3 py-1.5 text-sm text-[#7a5628]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-[rgba(40,33,24,0.08)] bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">提升方向</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {portrait.opportunities.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-7 text-stone-600">{portrait.judgement}</p>
        </div>
      </div>
    </MKCard>
  );
}
