/**
 * Growth Agent — 持续进化
 * 插件：Reflection / Capability Assessment / Learning
 * 产物：GrowthDelta（复盘 + 能力分 + 学习路径 + MemoryWrite）
 */

import type {
  CapabilityAgent,
  CapabilityMode,
  CapabilityPluginId,
  CapabilityRequest,
  CapabilityRunResult,
  GrowthDelta,
  OsKernelContext,
} from "../../contracts/capability";
import { assessFounderCapabilities } from "./scoring";

const GROWTH_MODES: CapabilityMode[] = [
  "strategy_meeting",
  "growth_review",
];

const DEFAULT_GROWTH_PLUGINS: CapabilityPluginId[] = [
  "reflection",
  "capability_assessment",
  "learning",
];

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max = 120) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export class GrowthAgent implements CapabilityAgent {
  id = "growth" as const;

  supports(mode: CapabilityMode) {
    return GROWTH_MODES.includes(mode);
  }

  async run(
    request: CapabilityRequest,
    kernel: OsKernelContext,
  ): Promise<CapabilityRunResult> {
    const enabled = new Set(request.plugins ?? DEFAULT_GROWTH_PLUGINS);
    const memory = kernel.memory ?? request.memory ?? null;
    const insightPack = kernel.insightPack ?? request.priorInsightPack;
    const decisionPack = kernel.decisionPack ?? request.priorDecisionPack;
    const actionPlan = kernel.actionPlan ?? request.priorActionPlan;

    const scores = enabled.has("capability_assessment")
      ? assessFounderCapabilities({
          memory,
          insightPack,
          decisionPack,
          actionPlan,
          priorScores: request.priorCapabilityScores,
          // 会议当轮不计入「结果」——无验证回写不得涨分
          decisionsWithOutcome: 0,
          validatedOutcomeCount: 0,
        })
      : [];

    const reflections: string[] = [];
    if (enabled.has("reflection")) {
      const chosen = decisionPack?.chosen || "本轮未形成明确选择";
      const strategy = decisionPack?.strategyDecision;
      reflections.push(
        clip(
          strategy
            ? `本轮收口：${chosen} — ${strategy}`
            : `本轮尚未完成决策收口；先沉淀认知，再开委员会。`,
          140,
        ),
      );

      const fail = memory?.patterns?.find((p) => p.kind === "failure");
      const success = memory?.patterns?.find((p) => p.kind === "success");
      if (fail) {
        reflections.push(clip(`需警惕的失败模式：${fail.summary}`, 120));
      }
      if (success) {
        reflections.push(clip(`可复用的成功模式：${success.summary}`, 120));
      }
      if (decisionPack?.evidenceStatus === "insufficient") {
        reflections.push(
          "证据仍不足：本轮应按「假设决策」推进，优先补关键证据再放大。",
        );
      }
      if (actionPlan?.validationHypothesis) {
        reflections.push(
          clip(`下一验证假设：${actionPlan.validationHypothesis}`, 120),
        );
      }
      if (reflections.length === 1 && !strategy) {
        reflections.push(
          "成长飞轮尚未转起来：完成一次委员会审议 + 验证回写，画像才会变准。",
        );
      }
    }

    const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
    const strongest = [...scores].sort((a, b) => b.score - a.score)[0];

    const capabilityNotes: string[] = [];
    if (enabled.has("capability_assessment") && scores.length) {
      for (const s of scores) {
        capabilityNotes.push(`${s.label} ${s.score}：${s.note}`);
      }
      if (weakest && strongest && weakest.id !== strongest.id) {
        capabilityNotes.push(
          clip(
            `当前短板在「${weakest.label}」，相对优势在「${strongest.label}」。`,
            100,
          ),
        );
      }
    }

    const learningNext: string[] = [];
    if (enabled.has("learning")) {
      if (weakest?.id === "cognition") {
        learningNext.push("补一场市场或品牌专项认知，把企业事实写进记忆。");
      } else if (weakest?.id === "decision") {
        learningNext.push("带着争议议题进决策室：要求证据门禁通过后再确认方案。");
      } else if (weakest?.id === "execution") {
        learningNext.push("把最近一条决策拆成 3 个动作，并启动验证任务回写。");
      } else {
        learningNext.push("完成一次验证结果回写，把成败模式写入经营者记忆。");
      }
      if (actionPlan?.actions?.[0]) {
        learningNext.push(
          clip(`本周先做：${actionPlan.actions[0].title}`, 80),
        );
      }
      learningNext.push("每周至少一次：委员会判断 → 行动验证 → 成长回写。");
    }

    const summary = clip(
      weakest
        ? `成长增量：短板「${weakest.label} ${weakest.score}」· 下一步 ${learningNext[0] || "继续闭环"}`
        : "成长增量：等待更多决策与验证样本。",
      120,
    );

    const growthDelta: GrowthDelta = {
      deltaId: buildId("gd"),
      missionId: request.mission.missionId,
      agentId: "growth",
      reflections,
      capabilityNotes,
      learningNext,
      scores,
      summary,
      memoryWrites: [],
      createdAt: new Date().toISOString(),
    };

    const memoryWrites = [
      {
        writeId: buildId("mw"),
        projectId: request.projectId,
        missionId: request.mission.missionId,
        type: "learning" as const,
        summary,
        payload: {
          growthDeltaId: growthDelta.deltaId,
          scores: scores.map((s) => ({
            id: s.id,
            score: s.score,
            trend: s.trend,
          })),
          reflections: reflections.slice(0, 4),
          learningNext: learningNext.slice(0, 3),
        },
        domain: "mixed" as const,
        source: "growth_engine" as const,
        createdAt: new Date().toISOString(),
      },
    ];
    growthDelta.memoryWrites = memoryWrites;

    return {
      agentId: "growth",
      growthDelta,
      memoryWrites,
    };
  }
}

export const growthAgent = new GrowthAgent();
