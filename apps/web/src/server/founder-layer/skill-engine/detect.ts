import {
  DRILL_MANAGER_LABOR,
  DRILL_MANAGER_REVENUE,
  DRILL_OWNER_REVENUE_DIAGNOSIS,
  DRILL_SERVER_FAMILY_UPSELL,
  getDrillById,
} from "./catalog";
import type { ScenarioDrillV1 } from "./types";

export function isExitDrillUtterance(utterance: string): boolean {
  return /退出练习|结束陪练|结束练习|不练了|取消陪练/.test(utterance.trim());
}

export function isDrillStartUtterance(utterance: string): boolean {
  const t = utterance.trim();
  return /练习|陪练|训练场|练一练|陪我练|能力训练/.test(t);
}

/** 从话术解析要开哪套 drill；默认老板营业额诊断 */
export function resolveDrillFromUtterance(utterance: string): ScenarioDrillV1 {
  const t = utterance.trim();
  if (/服务员|推荐|家庭聚餐|点单/.test(t)) return DRILL_SERVER_FAMILY_UPSELL;
  if (/人效|排班|太累/.test(t)) return DRILL_MANAGER_LABOR;
  // 店长 + 营业/利润 → 店长经营诊断竖切（优先于老板剧本）
  if (
    /店长/.test(t) &&
    (/营业|流水|利润|客流|客单|复购|诊断|抓回来/.test(t) || /练习|陪练/.test(t))
  ) {
    return DRILL_MANAGER_REVENUE;
  }
  if (/店长/.test(t)) return DRILL_MANAGER_REVENUE;
  if (/利润|营业额|诊断|客流|怎么办/.test(t) || /练习|陪练/.test(t)) {
    return DRILL_OWNER_REVENUE_DIAGNOSIS;
  }
  return DRILL_OWNER_REVENUE_DIAGNOSIS;
}

export function formatDrillStartCoach(drill: ScenarioDrillV1): string {
  const lines = [
    `【能力陪练 · ${drill.title}】`,
    "",
    drill.scenarioPrompt,
    drill.customerLine ? `\n模拟情境：\n「${drill.customerLine}」` : "",
    "",
    "请用你平时会说的话回复（2–6 句即可）。我会按：",
    ...drill.behaviorSteps.map((b, i) => `${i + 1}. ${b}`),
    "",
    `经营结果链：${drill.outcomeChain.join(" → ")}`,
    "",
    "说「退出练习」可随时结束。",
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

export { getDrillById };
