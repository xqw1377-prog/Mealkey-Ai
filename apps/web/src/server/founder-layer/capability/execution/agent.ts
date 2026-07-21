/**
 * Execution Agent — 把决策变成结果
 * 插件：Goal / Action / Alignment / Communication /（Validation 作为执行记忆入口）
 */

import type {
  ActionPlan,
  CapabilityAgent,
  CapabilityMode,
  CapabilityPluginId,
  CapabilityRequest,
  CapabilityRunResult,
  OsKernelContext,
} from "../../contracts/capability";
import type { ValidationTask } from "../../contracts/validation";
import { createValidationPlanFromDecision } from "../../validation";
import { tryPrismaDecisionId } from "../decision/registry";
import { pickBriefActions } from "./action-lifecycle";

const EXECUTION_MODES: CapabilityMode[] = [
  "strategy_meeting",
  "execution_track",
];

const DEFAULT_EXEC_PLUGINS: CapabilityPluginId[] = [
  "goal",
  "action",
  "alignment",
  "communication",
];

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max = 100) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export class ExecutionAgent implements CapabilityAgent {
  id = "execution" as const;

  supports(mode: CapabilityMode) {
    return EXECUTION_MODES.includes(mode);
  }

  async run(
    request: CapabilityRequest,
    kernel: OsKernelContext,
  ): Promise<CapabilityRunResult> {
    const enabled = new Set(request.plugins ?? DEFAULT_EXEC_PLUGINS);
    const decisionPack = kernel.decisionPack;
    const contract = kernel.decisionContract ?? decisionPack?.decisionContract;

    if (!decisionPack && !contract) {
      return {
        agentId: "execution",
        memoryWrites: [],
        nextSuggestedAgent: "decision",
      };
    }

    const strategy =
      decisionPack?.strategyDecision ||
      contract?.memo?.decision ||
      contract?.intent ||
      "带条件推进";
    const chosen = decisionPack?.chosen || "带条件推进";
    // 铁律：持久化外键只用 Prisma Decision.id；Capability 草稿可用合约临时 id
    const persistedDecisionId =
      tryPrismaDecisionId(contract?.decisionId) ||
      tryPrismaDecisionId(
        (request as { persistedDecisionId?: string }).persistedDecisionId,
      ) ||
      null;
    const decisionId = persistedDecisionId;

    // Goal Engine
    const goals: ActionPlan["goals"] = [];
    if (enabled.has("goal")) {
      const strategicGoalId = buildId("goal");
      goals.push({
        goalId: strategicGoalId,
        title: clip(`战略目标：${chosen} — ${strategy}`, 100),
        horizonDays: 90,
      });
      const qGoalId = buildId("goal");
      goals.push({
        goalId: qGoalId,
        title: clip(
          contract?.validationPlan?.goal ||
            contract?.memo?.validation ||
            "90天内完成关键假设验证，未过则停止放大",
          100,
        ),
        horizonDays: 90,
        parentGoalId: strategicGoalId,
      });
      goals.push({
        goalId: buildId("goal"),
        title: "本月：完成首轮验证设计与指标基线采集",
        horizonDays: 30,
        parentGoalId: qGoalId,
      });
    }

    // Action Engine — 可执行动作（禁止用 judgement/chosen 摘要顶三条）
    const actions: ActionPlan["actions"] = [];
    if (enabled.has("action")) {
      const contractActions = contract?.actions ?? [];
      for (const a of contractActions.slice(0, 5)) {
        const title = clip(a.statement, 80);
        if (!title || title === clip(chosen, 80) || title === clip(strategy, 80)) {
          continue;
        }
        actions.push({
          actionId: a.actionId || buildId("act"),
          title,
          owner: a.owner || "老板",
          dueInDays: a.dueInDays ?? 14,
          status: "planned",
          goalId: goals[1]?.goalId || goals[0]?.goalId,
        });
      }
      const conditions = contract?.memo?.conditions ?? [];
      for (const c of conditions.slice(0, 3)) {
        if (actions.some((x) => x.title.includes(c.slice(0, 12)))) continue;
        actions.push({
          actionId: buildId("act"),
          title: clip(`条件落地：${c}`, 80),
          owner: "老板",
          dueInDays: 21,
          status: "planned",
          goalId: goals[1]?.goalId || goals[0]?.goalId,
        });
      }
      // 保底：三条可执行动作（Brief 同源质量）
      const ensure = [
        `本周落地「${clip(chosen, 24)}」的第一步并指定负责人`,
        "设截止日并店内抽检一次执行偏差",
        contract?.validationPlan?.goal ||
          contract?.memo?.validation ||
          "本周五对照验证指标复盘",
      ];
      for (const title of ensure) {
        const t = clip(title, 80);
        if (!t || actions.some((x) => x.title === t)) continue;
        actions.push({
          actionId: buildId("act"),
          title: t,
          owner: actions.length === 0 ? "老板" : "店长",
          dueInDays: actions.length >= 2 ? 5 : 3,
          status: "planned",
          goalId: goals[1]?.goalId || goals[0]?.goalId,
        });
        if (actions.length >= 5) break;
      }
    }

    // Alignment Engine — 绑定品牌与决策条件
    const alignmentNotes: string[] = [];
    if (enabled.has("alignment")) {
      const brandName =
        request.companyContext.brand?.name ||
        request.companyContext.basicInfo.name ||
        "本品牌";
      const positioning = request.companyContext.brand?.positioning;
      alignmentNotes.push(
        `老板：确认「${clip(chosen, 24)}」是「${brandName}」本季唯一主决策，避免并行开新战场。`,
      );
      if (positioning) {
        alignmentNotes.push(
          clip(`品牌边界：任何动作不得稀释「${positioning}」心智；稀释即停止放大。`, 100),
        );
      }
      alignmentNotes.push(
        "合伙人：对齐资源与否决边界（尤其股权/稀释/开店节奏），书面确认停止线。",
      );
      alignmentNotes.push(
        "团队：本周只盯验证指标与前置动作，不把「扩张叙事」当执行 KPI。",
      );
      const opposeCount = (decisionPack?.risks || []).filter(
        (r) => r.source === "debate" || r.source === "capital",
      ).length;
      if (opposeCount > 0) {
        alignmentNotes.push(
          "存在委员会冲突：先开 30 分钟对齐会，把「保留什么 / 暂缓什么」说清再动手。",
        );
      }
    }

    // Communication Engine — 带品牌主张的对内/外话术
    const communicationDrafts: string[] = [];
    if (enabled.has("communication")) {
      const brandName =
        request.companyContext.brand?.name ||
        request.companyContext.basicInfo.name ||
        "我们";
      communicationDrafts.push(
        clip(
          `对内一句话：${brandName}决定${chosen}——${strategy}；未完成验证前不放大动作。`,
          120,
        ),
      );
      communicationDrafts.push(
        clip(
          `对外合伙人：请先确认停止线与验证指标；同意后再动资源，避免半路改目标。`,
          120,
        ),
      );
      if (request.companyContext.brand?.positioning) {
        communicationDrafts.push(
          clip(
            `对客主张不变：${request.companyContext.brand.positioning}；增长动作服务主张，不改赛道叙事。`,
            120,
          ),
        );
      }
      if (decisionPack?.capitalBrief) {
        communicationDrafts.push(
          clip(`对资本/治理：${decisionPack.capitalBrief}`, 120),
        );
      }
    }

    // Validation OS — Capability 环路始终产出 taskId；持久化外键仅挂 Prisma id
    let validationTask: ValidationTask | undefined;
    let validationHypothesis: string | undefined;
    const parentEvidenceIds = (kernel.evidencePack?.nodes || [])
      .map((n) => n.id)
      .filter(Boolean)
      .slice(0, 12);

    const runtimeDecisionId =
      persistedDecisionId ||
      (typeof contract?.decisionId === "string" && contract.decisionId.trim()
        ? contract.decisionId.trim()
        : buildId("VDEC"));

    if (decisionPack || contract) {
      const planBundle = createValidationPlanFromDecision({
        projectId: request.projectId,
        decisionId: runtimeDecisionId,
        allowRuntimeDecisionId: !persistedDecisionId,
        problem: request.mission.question,
        judgement: strategy,
        validationPlan:
          contract?.validationPlan?.goal ||
          contract?.memo?.validation ||
          actions[0]?.title,
        hypothesisStatement:
          contract?.validationPlan?.hypothesis ||
          contract?.memo?.conditions?.[0] ||
          `按「${chosen}」推进可在验证周期内被证伪或证实`,
        action: actions[0]?.title,
        parentEvidenceIds,
        owner: "老板",
        horizonDays: 90,
        confidence: 0.7,
        metricNames: contract?.validationPlan?.metrics,
      });
      validationTask = planBundle.task;
      validationHypothesis = planBundle.hypothesis.statement;
      actions.unshift({
        actionId: buildId("act"),
        title: clip(`启动验证：${planBundle.hypothesis.statement}`, 80),
        owner: "老板",
        dueInDays: 3,
        status: "doing",
        goalId: goals[1]?.goalId || goals[0]?.goalId,
      });
    }

    // Brief 质量：去掉与判断重复的空壳动作，保留可执行条目（最多 5，今日取前 3）
    const briefActions = pickBriefActions(actions, {
      judgement: `${chosen} ${strategy}`,
    });
    const finalActions =
      briefActions.length >= 3 ? briefActions.slice(0, 5) : actions.slice(0, 5);

    const actionPlan: ActionPlan = {
      planId: buildId("ap"),
      missionId: request.mission.missionId,
      agentId: "execution",
      decisionId: decisionId || undefined,
      goals,
      actions: finalActions,
      alignmentNotes,
      communicationDrafts,
      validationTaskId: validationTask?.taskId,
      validationHypothesis,
      summary: clip(
        decisionId
          ? `推动计划：${goals[0]?.title || chosen} · ${finalActions.length} 项行动 · 验证任务已生成`
          : `推动计划：${goals[0]?.title || chosen} · ${finalActions.length} 项行动（验证草稿已生成，待绑定已批准 Decision）`,
        120,
      ),
      createdAt: new Date().toISOString(),
    };

    const memoryWrites = [
      {
        writeId: buildId("mw"),
        projectId: request.projectId,
        missionId: request.mission.missionId,
        type: "decision" as const,
        summary: actionPlan.summary,
        payload: {
          actionPlanId: actionPlan.planId,
          validationTaskId: validationTask?.taskId,
          decisionId,
          goals: goals.map((g) => g.title),
          actions: actions.slice(0, 5).map((a) => a.title),
        },
        domain: "mixed" as const,
        source: "decision_engine" as const,
        createdAt: new Date().toISOString(),
      },
    ];

    return {
      agentId: "execution",
      actionPlan,
      validationTask,
      memoryWrites,
      nextSuggestedAgent: "growth",
    };
  }
}

export const executionAgent = new ExecutionAgent();
