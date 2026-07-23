import {
  emptyMobileAgentState,
  newTurnId,
  PROFILE_MOBILE_AGENT_KEY,
  type CompileOutputV1,
  type MobileAgentStateV1,
  type MobileAgentTurnV1,
} from "../contracts/goal-compiler";
import { classifyBusinessAsset, classifyKnowledgeContent } from "./classify-knowledge";
import { focusHintsFromGoal } from "./engine";

const MAX_TURNS = 40;
const MAX_ASSETS = 20;

export function readMobileAgentState(
  profile: Record<string, unknown>,
): MobileAgentStateV1 {
  const raw = profile[PROFILE_MOBILE_AGENT_KEY];
  if (!raw || typeof raw !== "object") return emptyMobileAgentState();
  const s = raw as Partial<MobileAgentStateV1>;
  return {
    version: "v1",
    activeGoal: s.activeGoal ?? null,
    taskGraph: s.taskGraph ?? null,
    assets: Array.isArray(s.assets) ? s.assets : [],
    turns: Array.isArray(s.turns) ? s.turns : [],
    pendingQuestions: Array.isArray(s.pendingQuestions) ? s.pendingQuestions : [],
    pendingDecisions: Array.isArray(s.pendingDecisions) ? s.pendingDecisions : [],
    memoryHints: {
      focus: Array.isArray(s.memoryHints?.focus) ? s.memoryHints!.focus : [],
      lastIntent: s.memoryHints?.lastIntent,
    },
    seedMetrics:
      s.seedMetrics && typeof s.seedMetrics === "object"
        ? {
            events: Array.isArray(s.seedMetrics.events) ? s.seedMetrics.events : [],
            compileCount: Number(s.seedMetrics.compileCount || 0),
            assetCount: Number(s.seedMetrics.assetCount || 0),
            returnCount: Number(s.seedMetrics.returnCount || 0),
            lastCompileAt:
              typeof s.seedMetrics.lastCompileAt === "string"
                ? s.seedMetrics.lastCompileAt
                : undefined,
          }
        : undefined,
    activeDrill:
      s.activeDrill && typeof s.activeDrill === "object"
        ? {
            drillId: String(s.activeDrill.drillId || ""),
            role: (["owner", "manager", "server", "chef"].includes(
              String(s.activeDrill.role),
            )
              ? s.activeDrill.role
              : "owner") as "owner" | "manager" | "server" | "chef",
            title: String(s.activeDrill.title || "能力陪练"),
            startedAt:
              typeof s.activeDrill.startedAt === "string"
                ? s.activeDrill.startedAt
                : new Date().toISOString(),
            status:
              s.activeDrill.status === "completed" ? "completed" : "awaiting_answer",
            attemptCount: Number(s.activeDrill.attemptCount || 0),
            lastScore:
              typeof s.activeDrill.lastScore === "number"
                ? s.activeDrill.lastScore
                : undefined,
            lastLevel:
              typeof s.activeDrill.lastLevel === "number"
                ? s.activeDrill.lastLevel
                : undefined,
          }
        : s.activeDrill === null
          ? null
          : undefined,
    interactionHints:
      s.interactionHints && typeof s.interactionHints === "object"
        ? {
            behaviorState: (["explore", "diagnose", "plan", "execute", "reflect"].includes(
              String(s.interactionHints.behaviorState),
            )
              ? s.interactionHints.behaviorState
              : "explore") as
              | "explore"
              | "diagnose"
              | "plan"
              | "execute"
              | "reflect",
            behaviorLabel: String(
              s.interactionHints.behaviorLabel || "探索理解中",
            ),
            choicePrompts: Array.isArray(s.interactionHints.choicePrompts)
              ? s.interactionHints.choicePrompts
              : [],
            followUps: Array.isArray(s.interactionHints.followUps)
              ? s.interactionHints.followUps
              : undefined,
          }
        : s.interactionHints === null
          ? null
          : undefined,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
  };
}

export function applyCompileToState(
  prev: MobileAgentStateV1,
  output: CompileOutputV1,
  userText: string,
): MobileAgentStateV1 {
  const ts = new Date().toISOString();
  const intent = output.goal.goalType;
  const turnClass = classifyKnowledgeContent({
    text: [userText, output.bossSummary].filter(Boolean).join("\n"),
    title: output.goal.title,
    intentFamily: intent,
  });
  const userTurn: MobileAgentTurnV1 = {
    id: newTurnId(),
    role: "user",
    text: userText || "（上传了文件）",
    createdAt: ts,
    categorySlug: turnClass.categorySlug,
    categoryLabel: turnClass.categoryLabel,
  };
  const assistantTurn: MobileAgentTurnV1 = {
    id: newTurnId(),
    role: "assistant",
    text: output.bossSummary,
    createdAt: ts,
    artifactIds: output.artifacts.map((a) => a.assetId),
    categorySlug: turnClass.categorySlug,
    categoryLabel: turnClass.categoryLabel,
  };

  const classifiedArtifacts = output.artifacts.map((a) =>
    classifyBusinessAsset(a, intent),
  );

  const assetMap = new Map(prev.assets.map((a) => [a.assetId, a]));
  for (const a of classifiedArtifacts) {
    assetMap.set(a.assetId, a);
  }
  const assets = [...assetMap.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ASSETS);

  const focus = [
    ...focusHintsFromGoal(output.goal),
    ...prev.memoryHints.focus,
  ];

  return {
    version: "v1",
    activeGoal: output.goal,
    taskGraph: output.taskGraph,
    assets,
    turns: [...prev.turns, userTurn, assistantTurn].slice(-MAX_TURNS),
    pendingQuestions: output.questions,
    pendingDecisions: output.pendingDecisions ?? [],
    memoryHints: {
      focus: [...new Set(focus)].slice(0, 8),
      lastIntent: output.goal.goalType,
    },
    // 进入经营编译时结束已完成的陪练；进行中陪练不会走到此路径
    activeDrill: null,
    interactionHints: output.interactionHints ?? null,
    seedMetrics: prev.seedMetrics,
    updatedAt: ts,
  };
}

export function writeMobileAgentIntoProfile(
  profile: Record<string, unknown>,
  state: MobileAgentStateV1,
): Record<string, unknown> {
  return {
    ...profile,
    [PROFILE_MOBILE_AGENT_KEY]: state,
  };
}
