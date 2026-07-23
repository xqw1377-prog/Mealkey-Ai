import {
  newAssetId,
  newGoalId,
  newTurnId,
  type CompileOutputV1,
  type GoalObjectV1,
  type MobileAgentActiveDrillV1,
  type MobileAgentStateV1,
  type MobileAgentTurnV1,
} from "../contracts/goal-compiler";
import {
  formatDrillStartCoach,
  isDrillStartUtterance,
  isExitDrillUtterance,
  resolveDrillFromUtterance,
} from "./detect";
import { evaluateDrillAnswer } from "./evaluate";
import { getDrillById } from "./catalog";
import type { ActiveDrillV1, SkillEngineTurnResultV1 } from "./types";

function toStateDrill(d: ActiveDrillV1 | null): MobileAgentActiveDrillV1 | null {
  if (!d) return null;
  return {
    drillId: d.drillId,
    role: d.role,
    title: d.title,
    startedAt: d.startedAt,
    status: d.status === "completed" ? "completed" : "awaiting_answer",
    attemptCount: d.attemptCount,
    lastScore: d.lastEvaluation?.score,
    lastLevel: d.lastEvaluation?.level,
  };
}

function fromStateDrill(d: MobileAgentActiveDrillV1 | null | undefined): ActiveDrillV1 | null {
  if (!d) return null;
  return {
    drillId: d.drillId,
    role: d.role,
    title: d.title,
    startedAt: d.startedAt,
    status: d.status,
    attemptCount: d.attemptCount,
  };
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * 是否应由 Skill Engine 接管本回合（非文件/槽位确认）
 */
export function shouldHandleSkillTurn(args: {
  trigger: string;
  utterance: string;
  activeDrill: MobileAgentActiveDrillV1 | null | undefined;
}): boolean {
  if (args.trigger !== "utterance") return false;
  const t = args.utterance.trim();
  if (!t) return false;
  if (isExitDrillUtterance(t) && args.activeDrill) return true;
  if (args.activeDrill?.status === "awaiting_answer") return true;
  if (isDrillStartUtterance(t)) return true;
  if (
    args.activeDrill?.status === "completed" &&
    /再练|再来一次|继续练习|再练一轮/.test(t)
  ) {
    return true;
  }
  return false;
}

export function runSkillTurn(args: {
  utterance: string;
  activeDrill: MobileAgentActiveDrillV1 | null | undefined;
}): SkillEngineTurnResultV1 {
  const t = args.utterance.trim();
  const active = fromStateDrill(args.activeDrill);

  if (isExitDrillUtterance(t)) {
    return {
      kind: "exit",
      activeDrill: null,
      coachText: "已结束能力陪练。可以说经营问题继续编译，或再说「练习一下利润诊断」。",
    };
  }

  if (
    active?.status === "completed" &&
    /再练|再来一次|继续练习|再练一轮/.test(t)
  ) {
    const drill = getDrillById(active.drillId) ?? resolveDrillFromUtterance(t);
    const restarted: ActiveDrillV1 = {
      drillId: drill.id,
      role: drill.role,
      title: drill.title,
      startedAt: nowIso(),
      status: "awaiting_answer",
      attemptCount: active.attemptCount,
    };
    return {
      kind: "start",
      activeDrill: restarted,
      coachText: formatDrillStartCoach(drill),
    };
  }

  if (active?.status === "awaiting_answer") {
    const drill = getDrillById(active.drillId);
    if (!drill) {
      return {
        kind: "exit",
        activeDrill: null,
        coachText: "陪练剧本已失效，请重新说「练习一下营业额下降追问」。",
      };
    }
    const evaluation = evaluateDrillAnswer(drill, t);
    const next: ActiveDrillV1 = {
      ...active,
      status: "completed",
      lastEvaluation: evaluation,
      attemptCount: active.attemptCount + 1,
    };
    const coachText = [
      `本轮得分 ${evaluation.score}，能力等级 L${evaluation.level}（${evaluation.levelLabel}）。`,
      evaluation.strengths.length
        ? `做得好的地方：${evaluation.strengths.slice(0, 2).join("；")}。`
        : "",
      evaluation.improvements.length
        ? `下一刀改进：${evaluation.improvements[0]}。`
        : "要点较完整。",
      evaluation.outcomeReminder + "。",
      "",
      "说「再练一轮」继续；说「退出练习」结束；或直接说真实经营问题（会退出陪练进编译）。",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      kind: "evaluate",
      activeDrill: next,
      coachText,
      evaluation,
      artifactTitle: `陪练反馈 · ${drill.title}`,
      artifactBody: evaluation.feedbackMarkdown,
    };
  }

  // start
  const drill = resolveDrillFromUtterance(t);
  const started: ActiveDrillV1 = {
    drillId: drill.id,
    role: drill.role,
    title: drill.title,
    startedAt: nowIso(),
    status: "awaiting_answer",
    attemptCount: 0,
  };
  return {
    kind: "start",
    activeDrill: started,
    coachText: formatDrillStartCoach(drill),
  };
}

/** 合成 CompileOutput，复用 Agent UI 气泡/资产面 */
export function skillResultToCompileOutput(
  result: SkillEngineTurnResultV1,
  restaurantRef: string,
  prevGoal: GoalObjectV1 | null,
): CompileOutputV1 {
  const ts = nowIso();
  const goal: GoalObjectV1 =
    prevGoal ??
    ({
      goalId: newGoalId(),
      intentRaw: "能力陪练",
      goalType: "other_operating",
      title: result.activeDrill?.title
        ? `能力陪练 · ${result.activeDrill.title}`
        : "能力陪练",
      slots: {},
      status: "active",
      progress: result.kind === "evaluate" ? 40 : 15,
      currentStage: "能力陪练",
      restaurantRef,
      createdAt: ts,
      updatedAt: ts,
    } satisfies GoalObjectV1);

  const artifacts =
    result.artifactBody && result.artifactTitle
      ? [
          {
            assetId: newAssetId(),
            restaurantRef,
            goalId: goal.goalId,
            type: "report" as const,
            title: result.artifactTitle,
            version: "v1",
            body: result.artifactBody,
            status: "draft" as const,
            createdAt: ts,
          },
        ]
      : [];

  return {
    goal: {
      ...goal,
      currentStage: "能力陪练",
      updatedAt: ts,
      title: result.activeDrill?.title
        ? `能力陪练 · ${result.activeDrill.title}`
        : goal.title,
    },
    taskGraph: {
      goalId: goal.goalId,
      entryNodeId: "s1",
      nodes: [
        {
          id: "s1",
          title: "场景练习",
          purpose: "Role × Scenario × Behavior",
          dependsOn: [],
          status: result.kind === "evaluate" ? "done" : "active",
          capabilityHints: ["skill-engine"],
          decisionRequired: false,
          artifactTypes: ["report"],
        },
        {
          id: "s2",
          title: "反馈升级",
          purpose: "对照 Outcome 经营链",
          dependsOn: ["s1"],
          status: result.kind === "evaluate" ? "active" : "pending",
          capabilityHints: ["skill-engine"],
          decisionRequired: false,
          artifactTypes: ["report"],
        },
      ],
    },
    bossSummary: result.coachText,
    artifacts,
    pendingDecisions: [],
    questions: [],
    nextAction: {
      kind: result.kind === "evaluate" ? "review_artifact" : "continue_stage",
      label: result.kind === "evaluate" ? "查看陪练反馈" : "回复情境",
    },
    interactionHints: {
      behaviorState: result.kind === "evaluate" ? "reflect" : "explore",
      behaviorLabel: result.kind === "evaluate" ? "复盘沉淀中" : "能力陪练中",
      choicePrompts: [],
    },
    trace: {
      intentConfidence: 0.92,
      providersUsed: ["skill-engine.v1"],
      degraded: false,
      mode: "compile",
    },
  };
}

export function applySkillToState(
  prev: MobileAgentStateV1,
  result: SkillEngineTurnResultV1,
  output: CompileOutputV1,
  userText: string,
): MobileAgentStateV1 {
  const ts = nowIso();
  const userTurn: MobileAgentTurnV1 = {
    id: newTurnId(),
    role: "user",
    text: userText,
    createdAt: ts,
    categorySlug: "store-operations",
    categoryLabel: "门店运营",
  };
  const assistantTurn: MobileAgentTurnV1 = {
    id: newTurnId(),
    role: "assistant",
    text: result.coachText,
    createdAt: ts,
    artifactIds: output.artifacts.map((a) => a.assetId),
    categorySlug: "store-operations",
    categoryLabel: "门店运营",
  };

  const assetMap = new Map(prev.assets.map((a) => [a.assetId, a]));
  for (const a of output.artifacts) {
    assetMap.set(a.assetId, {
      ...a,
      categorySlug: "store-operations",
      categoryLabel: "门店运营",
    });
  }

  return {
    ...prev,
    activeGoal: output.goal,
    taskGraph: output.taskGraph,
    assets: [...assetMap.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
    turns: [...prev.turns, userTurn, assistantTurn].slice(-40),
    pendingQuestions: [],
    pendingDecisions: [],
    activeDrill: toStateDrill(result.activeDrill),
    interactionHints: output.interactionHints ?? null,
    memoryHints: {
      focus: [...new Set(["能力陪练", ...prev.memoryHints.focus])].slice(0, 8),
      lastIntent: prev.memoryHints.lastIntent,
    },
    updatedAt: ts,
  };
}
