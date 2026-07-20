/**
 * 收费 Founder 会议开场前：检查所需外呼引擎是否可用。
 * 生产默认：缺引擎拒扣点；开发可用 FOUNDER_ALLOW_DEGRADED_MEETING=1 放行。
 */
import {
  getConsultingEngineHealth,
  type EngineHealthRow,
} from "@/server/services/engine-health.service";
import type { FounderAgentId } from "@/server/founder/contracts";

export type EngineMeetingGate = {
  ok: boolean;
  allowDegraded: boolean;
  requiredEngineIds: Array<EngineHealthRow["id"]>;
  down: EngineHealthRow[];
  engines: EngineHealthRow[];
  note: string | null;
};

function mapAgentsToEngines(
  agents?: Array<"M-PNT" | "M-MKT" | "M-BIZ" | "M-ED"> | FounderAgentId[],
): Array<EngineHealthRow["id"]> {
  const list =
    agents && agents.length > 0
      ? agents
      : (["M-MKT", "M-BIZ", "M-ED"] as const);
  const ids = new Set<EngineHealthRow["id"]>();
  for (const agent of list) {
    if (agent === "M-BIZ") ids.add("m-biz");
    if (agent === "M-MKT") ids.add("m-mkt");
    if (agent === "M-ED") ids.add("m-ed");
    // M-PNT / CHIEF：进程内，不挡外呼门禁
  }
  return [...ids];
}

export function isDegradedMeetingAllowed() {
  // 显式旁路：仅 FOUNDER_ALLOW_DEGRADED_MEETING=1
  // HEURISTIC_ONLY 只关 LLM，不再自动放行「假引擎开会」
  if (process.env.FOUNDER_ALLOW_DEGRADED_MEETING === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** 生产默认禁止占位报告开常委；开发可用 ALLOW_COUNCIL_STUB=1 或显式传参 */
export function isCouncilStubAllowedByEnv() {
  if (process.env.ALLOW_COUNCIL_STUB === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export async function evaluateEngineMeetingGate(input?: {
  agents?: Array<"M-PNT" | "M-MKT" | "M-BIZ" | "M-ED">;
}): Promise<EngineMeetingGate> {
  const health = await getConsultingEngineHealth();
  const requiredEngineIds = mapAgentsToEngines(input?.agents);
  const required = health.engines.filter((e) =>
    requiredEngineIds.includes(e.id),
  );
  const down = required.filter((e) => !e.ok);
  const allowDegraded = isDegradedMeetingAllowed();
  const ok = down.length === 0;

  let note: string | null = null;
  if (!ok) {
    const names = down.map((e) => e.label).join("、");
    note = allowDegraded
      ? `外呼未就绪（${names}）。开发/演示模式仍可开会，但结果会降级为启发式，不能当正式引擎交付。`
      : `外呼未就绪（${names}）。已阻止扣经营点开收费会议。请先启动引擎，或联系平台；临时演示可设 FOUNDER_ALLOW_DEGRADED_MEETING=1。`;
  }

  return {
    ok,
    allowDegraded,
    requiredEngineIds,
    down,
    engines: health.engines,
    note,
  };
}

export function countDegradedOpinions(
  opinions: Array<{ degraded?: boolean }>,
): number {
  return opinions.filter((o) => o.degraded).length;
}
