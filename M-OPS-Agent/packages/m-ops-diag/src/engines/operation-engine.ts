import { claimMatchesTheme } from "../reasoning/helpers";
import type { EngineAnalysis, EngineContext } from "./types";

export function analyzeOperationIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait",
  );
  const service = evidence.filter(
    (item) =>
      claimMatchesTheme(item.claim, "wait", item.theme) ||
      item.theme === "service" ||
      item.theme === "wait",
  );
  const level =
    wait.length >= 3 ? "risk" : wait.length >= 2 ? "attention" : wait.length >= 1 ? "observe" : "healthy";
  const observed =
    wait.length >= 2
      ? `等待相关表述出现 ${wait.length} 次，并明显集中在高峰场景`
      : wait.length === 1
        ? "出现轻微等待与交付波动"
        : "暂未发现高峰承载异常的强信号";

  return {
    dimension: "operation",
    level,
    finding:
      level === "risk"
        ? "高峰承载能力不足正在演变为经营瓶颈"
        : level === "attention"
          ? "经营节奏开始承压，需关注高峰交付"
          : "经营效率暂时维持稳定",
    meaning:
      level === "risk"
        ? "问题更像峰值承载问题，而不是全天候能力不足"
        : level === "attention"
          ? "若不处理高峰节奏，差评会进一步扩散到复购层"
          : "运营侧仍需更多内部事实支撑更深诊断",
    observed,
    confidence: Math.min(0.86, 0.36 + wait.length * 0.16),
    evidenceIds: wait.map((item, index) => item.id || `operation-${index}`),
    watchHint: "优先核查周末晚餐高峰的排队、点单与出菜节点",
    hypotheses: [
      {
        statement: "高峰产能不足正在放大等待问题",
        probability: 0.65,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["对比工作日与周末晚餐的出菜节奏和排队长度"],
      },
      {
        statement: "前厅排队管理不足导致顾客体感恶化",
        probability: 0.25,
        supportingEvidence: service.map((item) => item.id || item.claim).slice(0, 3),
        validationPlan: ["复核等位阶段是否缺少主动告知与分流动作"],
      },
    ],
    rawEvidence: wait.slice(0, 6),
  };
}

export function analyzeServiceIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait",
  );
  const level =
    wait.length >= 3 ? "risk" : wait.length >= 2 ? "attention" : wait.length >= 1 ? "observe" : "healthy";
  return {
    dimension: "service",
    level,
    finding:
      wait.length >= 2
        ? "顾客体验的主要断裂点集中在等待与响应"
        : wait.length === 1
          ? "服务侧出现轻微波动，值得继续观察"
          : "当前未见明显服务体验断裂",
    meaning:
      wait.length >= 2
        ? "服务体验正在成为负面评价的主要来源"
        : "服务侧暂未形成强风险，但需保持监测",
    observed:
      wait.length > 0 ? `等待/服务相关表述出现 ${wait.length} 次` : "未见明显服务类负向聚集",
    confidence: Math.min(0.9, 0.4 + wait.length * 0.15),
    evidenceIds: wait.map((item, index) => item.id || `service-${index}`),
    watchHint: "建议优先排查晚高峰等位与上菜节奏",
    hypotheses: [
      {
        statement: "服务等待正在破坏用餐体验",
        probability: 0.71,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["复核等位、点单、上菜三个节点的实际等待时长"],
      },
    ],
    rawEvidence: wait.slice(0, 6),
  };
}
