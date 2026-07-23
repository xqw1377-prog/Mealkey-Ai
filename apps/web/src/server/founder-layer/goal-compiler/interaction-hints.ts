/**
 * 交互宪法 / Behavior Engine → Compile 投影
 */
import type {
  BehaviorStateV1,
  ChoicePromptV1,
  CompileOutputV1,
  FollowUpActionV1,
  IntentFamily,
  InteractionHintsV1,
} from "../contracts/goal-compiler";
import { isRevenueDeclineUtterance } from "../restaurant-intelligence";

const BEHAVIOR_LABEL: Record<BehaviorStateV1, string> = {
  explore: "探索理解中",
  diagnose: "经营诊断中",
  plan: "规划路径中",
  execute: "跟踪执行中",
  reflect: "复盘沉淀中",
};

export function resolveBehaviorState(args: {
  mode: CompileOutputV1["trace"]["mode"];
  goalType: IntentFamily;
  utterance: string;
  hasQuestions: boolean;
  hasArtifacts: boolean;
  goalStatus: string;
}): BehaviorStateV1 {
  if (args.mode === "explore" || args.mode === "clarify") return "explore";
  if (args.goalType === "menu_optimize") {
    return args.hasArtifacts && !args.hasQuestions ? "plan" : "diagnose";
  }
  if (
    args.goalType === "diagnose_performance" ||
    isRevenueDeclineUtterance(args.utterance)
  ) {
    return args.hasArtifacts && !args.hasQuestions ? "plan" : "diagnose";
  }
  if (args.goalType === "launch_store" || args.goalType === "expand_store") {
    if (args.hasArtifacts && !args.hasQuestions) return "plan";
    return args.hasQuestions ? "explore" : "plan";
  }
  if (args.goalStatus === "active" && args.hasArtifacts) return "execute";
  if (args.hasQuestions) return "explore";
  return "diagnose";
}

export function buildChoicePrompts(
  questions: Array<{ slot: string; prompt: string }>,
): ChoicePromptV1[] {
  const out: ChoicePromptV1[] = [];
  for (const q of questions) {
    if (q.slot === "which_variable") {
      out.push({
        slot: q.slot,
        prompt: q.prompt,
        options: [
          { label: "A 客流不足", value: "客流变少" },
          { label: "B 客单不足", value: "客单下降" },
          { label: "C 复购不足", value: "复购变少" },
          { label: "D 转化不足", value: "转化变差" },
        ],
      });
    } else if (q.slot === "problem_domain") {
      out.push({
        slot: q.slot,
        prompt: q.prompt,
        options: [
          { label: "收入问题", value: "收入" },
          { label: "利润问题", value: "利润" },
          { label: "客户问题", value: "客户" },
          { label: "运营效率", value: "运营效率" },
        ],
      });
    } else if (q.slot === "main_pain") {
      out.push({
        slot: q.slot,
        prompt: q.prompt,
        options: [
          { label: "收入不够", value: "收入" },
          { label: "成本太高", value: "成本" },
          { label: "人效偏低", value: "人效" },
        ],
      });
    } else if (q.slot === "ambition") {
      out.push({
        slot: q.slot,
        prompt: q.prompt,
        options: [
          { label: "单店盈利优先", value: "单店盈利" },
          { label: "为连锁打样", value: "品牌扩张" },
        ],
      });
    } else if (q.slot === "menu_focus") {
      out.push({
        slot: q.slot,
        prompt: q.prompt,
        options: [
          { label: "提高毛利", value: "提高毛利" },
          { label: "减少SKU", value: "减少SKU" },
          { label: "做出爆品", value: "做出爆品" },
          { label: "对齐客群", value: "对齐客群" },
        ],
      });
    }
  }
  return out;
}

function buildFollowUps(output: Omit<CompileOutputV1, "interactionHints">): FollowUpActionV1[] {
  if (output.artifacts.length === 0) return [];
  const follows: FollowUpActionV1[] = [];
  if (
    output.goal.goalType === "diagnose_performance" ||
    output.goal.goalType === "improve_profit"
  ) {
    follows.push({
      label: "练习：诊断追问能力",
      utterance: "练习一下营业额下降追问",
    });
  }
  if (output.goal.goalType === "menu_optimize") {
    follows.push({
      label: "继续：经营诊断",
      utterance: "最近生意不好，帮我诊断一下",
    });
  }
  if (
    output.goal.goalType === "launch_store" ||
    output.goal.goalType === "expand_store"
  ) {
    follows.push({
      label: "下一阶段：菜单模型",
      utterance: "帮我看看菜单怎么设计",
    });
  }
  return follows.slice(0, 2);
}

export function buildInteractionHints(
  output: Omit<CompileOutputV1, "interactionHints">,
  utterance: string,
): InteractionHintsV1 {
  const behaviorState = resolveBehaviorState({
    mode: output.trace.mode,
    goalType: output.goal.goalType,
    utterance: utterance || output.goal.intentRaw,
    hasQuestions: output.questions.length > 0,
    hasArtifacts: output.artifacts.length > 0,
    goalStatus: output.goal.status,
  });
  return {
    behaviorState,
    behaviorLabel: BEHAVIOR_LABEL[behaviorState],
    choicePrompts: buildChoicePrompts(output.questions),
    followUps: buildFollowUps(output),
  };
}
