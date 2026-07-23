/**
 * Mobile Phase 1 种子验证事件（profile.mobileAgent.seedMetrics 侧车）
 * 判据：意愿 / 理解 / 价值 / 目标 / 训练 — docs/MEALKEY_MOBILE_AGENT_V1.md §六
 */
import type {
  CompileOutputV1,
  MobileAgentSeedEventV1,
  MobileAgentSeedMetricsV1,
  MobileAgentStateV1,
} from "../contracts/goal-compiler";
import type { KnownCompileContext } from "./known-context";

const MAX_EVENTS = 80;

export function emptySeedMetrics(): MobileAgentSeedMetricsV1 {
  return {
    events: [],
    compileCount: 0,
    assetCount: 0,
    returnCount: 0,
    lastCompileAt: undefined,
  };
}

export function readSeedMetrics(
  state: MobileAgentStateV1,
): MobileAgentSeedMetricsV1 {
  const raw = state.seedMetrics;
  if (!raw || typeof raw !== "object") return emptySeedMetrics();
  return {
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_EVENTS) : [],
    compileCount: Number(raw.compileCount || 0),
    assetCount: Number(raw.assetCount || 0),
    returnCount: Number(raw.returnCount || 0),
    lastCompileAt:
      typeof raw.lastCompileAt === "string" ? raw.lastCompileAt : undefined,
  };
}

function pushEvent(
  metrics: MobileAgentSeedMetricsV1,
  event: MobileAgentSeedEventV1,
): MobileAgentSeedMetricsV1 {
  return {
    ...metrics,
    events: [...metrics.events, event].slice(-MAX_EVENTS),
  };
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return ms / (24 * 60 * 60 * 1000);
}

/**
 * 根据本轮 compile 结果追加种子事件（纯函数）
 */
export function appendSeedMetricsFromCompile(input: {
  prev: MobileAgentStateV1;
  next: MobileAgentStateV1;
  output: CompileOutputV1;
  known?: KnownCompileContext;
  trigger: string;
}): MobileAgentStateV1 {
  const now = new Date().toISOString();
  const prevMetrics = readSeedMetrics(input.prev);
  const prevAt = prevMetrics.lastCompileAt;
  let metrics: MobileAgentSeedMetricsV1 = {
    ...prevMetrics,
    compileCount: prevMetrics.compileCount + 1,
    lastCompileAt: now,
    assetCount: Math.max(prevMetrics.assetCount, input.next.assets.length),
  };

  // 意愿：7 天内第 2+ 次表达/上传
  if (
    (input.trigger === "utterance" || input.trigger === "file") &&
    prevMetrics.compileCount >= 1
  ) {
    if (!prevAt || daysBetween(prevAt, now) <= 7) {
      metrics = {
        ...pushEvent(metrics, {
          name: "mobile.will_return",
          at: now,
          payload: { compileCount: metrics.compileCount },
        }),
        returnCount: metrics.returnCount + 1,
      };
    }
  }

  // 理解：已知槽位 ≥2 且本轮不问
  const knownSlots = Object.keys(input.known?.rememberedSlots || {}).length;
  if (knownSlots >= 2 && input.output.questions.length === 0) {
    metrics = pushEvent(metrics, {
      name: "mobile.context_reused",
      at: now,
      payload: { knownSlots },
    });
  }

  // 价值：新产出资产
  const prevIds = new Set(input.prev.assets.map((a) => a.assetId));
  const newAssets = input.output.artifacts.filter((a) => !prevIds.has(a.assetId));
  if (newAssets.length > 0) {
    metrics = pushEvent(metrics, {
      name: "mobile.asset_produced",
      at: now,
      payload: {
        titles: newAssets.map((a) => a.title).slice(0, 3),
      },
    });
  }

  // 目标：可追踪 active goal
  if (
    input.next.activeGoal &&
    (input.next.activeGoal.status === "active" ||
      input.next.activeGoal.status === "blocked") &&
    (input.next.activeGoal.progress > 0 || input.next.activeGoal.currentStage)
  ) {
    metrics = pushEvent(metrics, {
      name: "mobile.goal_active",
      at: now,
      payload: {
        title: input.next.activeGoal.title,
        progress: input.next.activeGoal.progress,
        stage: input.next.activeGoal.currentStage,
      },
    });
  }

  return { ...input.next, seedMetrics: metrics };
}

export function seedMetricsBrief(metrics: MobileAgentSeedMetricsV1): {
  compileCount: number;
  assetCount: number;
  returnCount: number;
  hits: {
    will: boolean;
    understand: boolean;
    value: boolean;
    goal: boolean;
  };
} {
  const names = new Set(metrics.events.map((e) => e.name));
  return {
    compileCount: metrics.compileCount,
    assetCount: metrics.assetCount,
    returnCount: metrics.returnCount,
    hits: {
      will: names.has("mobile.will_return") || metrics.returnCount > 0,
      understand: names.has("mobile.context_reused"),
      value: names.has("mobile.asset_produced") || metrics.assetCount > 0,
      goal: names.has("mobile.goal_active"),
    },
  };
}
