/**
 * 专业引擎外呼健康检查（管理台 / 运维）
 */
import { checkMBizHealth } from "@/server/services/m-biz-client";
import { checkMMktHealth } from "@/server/services/m-mkt-client";
import { checkMEdHealth } from "@/server/services/m-ed-client";

export type EngineHealthRow = {
  id: "m-biz" | "m-mkt" | "m-ed";
  label: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
};

async function probe(
  id: EngineHealthRow["id"],
  label: string,
  fn: () => Promise<boolean>,
): Promise<EngineHealthRow> {
  const started = Date.now();
  try {
    const ok = await fn();
    return {
      id,
      label,
      ok,
      latencyMs: Date.now() - started,
      detail: ok ? "健康" : "探活失败（将走启发式降级）",
    };
  } catch (error) {
    return {
      id,
      label,
      ok: false,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "探活异常",
    };
  }
}

export async function getConsultingEngineHealth(): Promise<{
  checkedAt: string;
  engines: EngineHealthRow[];
  allOk: boolean;
}> {
  const engines = await Promise.all([
    probe("m-biz", "M-BIZ 商业模式", checkMBizHealth),
    probe("m-mkt", "M-MKT 市场进入", checkMMktHealth),
    probe("m-ed", "M-ED 股权治理", checkMEdHealth),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    engines,
    allOk: engines.every((e) => e.ok),
  };
}
