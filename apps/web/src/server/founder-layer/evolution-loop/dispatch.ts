/**
 * Goal Compiler 薄调度 — 何时走哪条车道
 * 权威：MEALKEY_LEARNING_EVOLUTION_LOOP_V1 §四
 * UI 不暴露车道菜单；权限终局仍服从权限模型 V2。
 */

import type { DispatchLaneV1, RolePerspectiveV1 } from "./types";

export type DispatchInputV1 = {
  utterance: string;
  /** 已在陪练中或显式陪练意图时由调用方置 true */
  skillIntent?: boolean;
  hasActiveDrill?: boolean;
};

export type DispatchDecisionV1 = {
  lane: DispatchLaneV1;
  rolePerspective: RolePerspectiveV1;
  scenarioKey: string;
  reason: string;
};

function detectRole(utterance: string): RolePerspectiveV1 {
  const t = utterance.trim();
  if (/服务员|前厅推荐|点单话术/.test(t)) return "server";
  if (/厨师|后厨|出品|厨房/.test(t)) return "chef";
  if (/店长|门店经理|排班|人效|巡店/.test(t)) return "manager";
  if (/老板|创始人|开店|投资|股权|扩张|加盟/.test(t)) return "owner";
  return "unknown";
}

function detectScenario(utterance: string): string {
  const t = utterance.trim();
  // 菜单/定价优先于泛化「客单」（客单常与菜单动作同现）
  if (/菜单|SKU|品项|定价|调菜/.test(t)) return "menu_optimize";
  if (/营业额|流水|生意不好|客流|复购|客单/.test(t)) return "revenue_pressure";
  if (/人效|排班|人工|太累/.test(t)) return "labor_efficiency";
  if (/开店|选址|第二家|扩张/.test(t)) return "expansion";
  if (/练习|陪练|训练场/.test(t)) return "skill_drill";
  if (/复盘|结果|验证|有没有用/.test(t)) return "reflect";
  return "general_operating";
}

/**
 * 解析调度车道（纯函数，可单测）
 */
export function resolveDispatchLane(input: DispatchInputV1): DispatchDecisionV1 {
  const utterance = input.utterance.trim();
  const rolePerspective = detectRole(utterance);
  const scenarioKey = detectScenario(utterance);

  if (input.skillIntent || input.hasActiveDrill || /练习|陪练|训练场|练一练/.test(utterance)) {
    return {
      lane: "skill",
      rolePerspective: rolePerspective === "unknown" ? "owner" : rolePerspective,
      scenarioKey: scenarioKey === "general_operating" ? "skill_drill" : scenarioKey,
      reason: "陪练/能力训练意图",
    };
  }

  // 战略召回语义 → council（不批准，只调度）
  if (
    /改定位|换品类|股权|融资|投几百万|关掉店|战略转型|全面加盟|是否扩张|要不要开第二/.test(
      utterance,
    )
  ) {
    return {
      lane: "council",
      rolePerspective: rolePerspective === "unknown" ? "owner" : rolePerspective,
      scenarioKey:
        scenarioKey === "general_operating" ? "strategic_decision" : scenarioKey,
      reason: "重大资源/战略变轨语义",
    };
  }

  if (/去做体检|餐厅体检|巡店清单|生成任务|执行清单|叫工具/.test(utterance)) {
    return {
      lane: "tool_agent",
      rolePerspective,
      scenarioKey: "tool_execution",
      reason: "执行/工具话术",
    };
  }

  if (/复盘|实际结果|有没有好转|验证一下|上次建议/.test(utterance)) {
    return {
      lane: "reflect",
      rolePerspective,
      scenarioKey: "reflect",
      reason: "复盘/结果反馈",
    };
  }

  return {
    lane: "business_capability",
    rolePerspective,
    scenarioKey,
    reason: "默认经营能力编译",
  };
}
