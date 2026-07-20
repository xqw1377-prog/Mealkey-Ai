/**
 * M-BIZ 商业模式决策规则库
 *
 * 蒸馏自：Osterwalder BMC, Porter价值链, BCG经验曲线,
 * Slywotzky利润模式, 单位经济模型, 餐饮30年实操
 */

import type { DecisionRule } from "../types";

const R1: DecisionRule = { id: "BIZ-RULE-001", scenario: "单位经济", description: "毛利红线：稳态毛利率低于55%视为不健康", conditions: [{ field: "gross_margin", operator: "<", value: 55 }], judgement: "毛利率低于55% = 利润空间不足", risk: "high", recommendation: "优化食材成本或提升客单价，目标毛利率60%+", weight: 0.9, source: "餐饮利润基准" };
const R2: DecisionRule = { id: "BIZ-RULE-002", scenario: "单位经济", description: "食材成本率超过38%侵蚀利润", conditions: [{ field: "food_cost_ratio", operator: ">", value: 38 }], judgement: "食材成本率超过38% = 利润空间被压缩", risk: "high", recommendation: "集中采购/中央厨房/替换高成本食材，目标30-35%", weight: 0.85, source: "餐饮成本结构基准" };
const R3: DecisionRule = { id: "BIZ-RULE-003", scenario: "单位经济", description: "人工成本率超过25%需警惕", conditions: [{ field: "labor_cost_ratio", operator: ">", value: 25 }], judgement: "人工成本率超过25% = 人效偏低", risk: "high", recommendation: "优化排班/自助点餐/简化流程，目标18-22%", weight: 0.85, source: "餐饮人效基准" };
const R4: DecisionRule = { id: "BIZ-RULE-004", scenario: "单位经济", description: "租金超过收入15%是危险信号", conditions: [{ field: "rent_ratio", operator: ">", value: 15 }], judgement: "租金占收入超过15% = 固定成本过高", risk: "high", recommendation: "租金占比不超过12%，超过15%不建议", weight: 0.9, source: "餐饮选址铁律" };
const R5: DecisionRule = { id: "BIZ-RULE-005", scenario: "单位经济", description: "单店回本超过18个月模型偏重", conditions: [{ field: "payback_period", operator: ">", value: 18 }], judgement: "回本周期超过18个月 = 资金占用成本高", risk: "high", recommendation: "回本周期控制在12-18个月，超过24个月重估", weight: 0.85, source: "餐饮投资回报基准" };
const R6: DecisionRule = { id: "BIZ-RULE-006", scenario: "单位经济", description: "正餐翻台低于1.5模型承压", conditions: [{ field: "table_turnover", operator: "<", value: 1.5 }, { field: "category_type", operator: "=", value: "formal_dining" }], judgement: "正餐翻台低于1.5 = 坪效偏低", risk: "medium", recommendation: "分时段经营/外卖补充，目标2.0以上", weight: 0.8, source: "餐饮运营效率基准" };
const R7: DecisionRule = { id: "BIZ-RULE-007", scenario: "利润结构", description: "净利润率低于8%属于薄利", conditions: [{ field: "net_profit_margin", operator: "<", value: 8 }], judgement: "净利率低于8% = 辛苦不赚钱", risk: "high", recommendation: "净利率目标10-15%，低于8%需结构优化", weight: 0.85, source: "餐饮盈利基准 + Slywotzky利润模式" };
const R8: DecisionRule = { id: "BIZ-RULE-008", scenario: "利润结构", description: "利润必须来自核心业务", conditions: [{ field: "profit_source_clarity", operator: "<", value: 3 }], judgement: "说不清利润来自哪 = 模型不清晰", risk: "high", recommendation: "明确利润中心，说不清就别扩张", weight: 0.85, source: "Slywotzky利润模式" };
const R9: DecisionRule = { id: "BIZ-RULE-009", scenario: "利润结构", description: "好模型至少有一个自我强化的循环", conditions: [{ field: "has_profit_flywheel", operator: "=", value: false }], judgement: "没有利润飞轮 = 每分增长靠投入推动", risk: "high", recommendation: "寻找利润自我强化机制（规模降本/品牌溢价/复购累积）", weight: 0.8, source: "飞轮效应 + Bain利润增长法则" };
const R10: DecisionRule = { id: "BIZ-RULE-010", scenario: "成本结构", description: "固定成本超过40%模型脆弱", conditions: [{ field: "fixed_cost_ratio", operator: ">", value: 40 }], judgement: "固定成本超过40% = 经营杠杆反向作用", risk: "high", recommendation: "降低固定成本占比，目标30%以下", weight: 0.85, source: "经营杠杆分析" };
const R11: DecisionRule = { id: "BIZ-RULE-011", scenario: "成本结构", description: "单一变量变化20%不应让利润归零", conditions: [{ field: "cost_sensitivity_score", operator: ">", value: 5 }], judgement: "任何一个变量波动20%就能让利润归零 = 模型极度脆弱", risk: "high", recommendation: "每个变量上浮20%必须仍有利润", weight: 0.9, source: "敏感性分析 + 风险缓冲模型" };
const R12: DecisionRule = { id: "BIZ-RULE-012", scenario: "收入模型", description: "单收入来源超过80%是风险", conditions: [{ field: "single_revenue_source_ratio", operator: ">", value: 80 }], judgement: "单一收入来源超过80% = 缺乏对冲", risk: "medium", recommendation: "发展第二收入来源，占比不低于20%", weight: 0.8, source: "收入多元化风险管理" };
const R13: DecisionRule = { id: "BIZ-RULE-013", scenario: "收入模型", description: "餐饮首月复购率低于20%需求验证不足", conditions: [{ field: "first_month_repurchase_rate", operator: "<", value: 20 }], judgement: "首月复购率低于20% = 产品吸引力不足", risk: "high", recommendation: "低于20%说明不是反复需要的产品，需重新评估", weight: 0.85, source: "餐饮复购率基准" };
const R14: DecisionRule = { id: "BIZ-RULE-014", scenario: "复制能力", description: "无SOP不能谈复制", conditions: [{ field: "sop_coverage", operator: "<", value: 3 }], judgement: "关键环节标准化覆盖率低于3 = 复制时品质必然走样", risk: "high", recommendation: "扩张前完成核心SOP，覆盖率80%以上", weight: 0.9, source: "连锁运营基础法则" };
const R15: DecisionRule = { id: "BIZ-RULE-015", scenario: "复制能力", description: "至少运营6个月且月月盈利", conditions: [{ field: "profitable_months", operator: "<", value: 6 }], judgement: "盈利月数不足6个月 = 季节因素未排除", risk: "high", recommendation: "首店运营6个月且连续盈利3个月以上再复制", weight: 0.9, source: "餐饮扩张铁律" };
const R16: DecisionRule = { id: "BIZ-RULE-016", scenario: "复制能力", description: "关键岗位不可依赖个人能力", conditions: [{ field: "key_position_reliance", operator: ">", value: 3 }], judgement: "关键岗位依赖个人能力 = 复制时无法保证一致性", risk: "high", recommendation: "SOP化+培训体系，普通人也能胜任", weight: 0.85, source: "连锁运营 + 人才复制理论" };
const R17: DecisionRule = { id: "BIZ-RULE-017", scenario: "复制能力", description: "复制超出供应链半径是扩张死因", conditions: [{ field: "supply_chain_radius_exceeded", operator: "=", value: true }], judgement: "扩张超出供应链半径 = 品质不稳定", risk: "high", recommendation: "在现有半径内扩张，或先建供应链节点", weight: 0.85, source: "供应链管理 + 连锁扩张模型" };

export const BUSINESS_MODEL_RULES: DecisionRule[] = [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17];

export function matchBizRules(facts: Record<string, unknown>): DecisionRule[] {
  return BUSINESS_MODEL_RULES.filter((rule) =>
    rule.conditions.every((cond) => {
      const val = facts[cond.field];
      if (val === undefined) return false;
      if (cond.operator === "<") return Number(val) < Number(cond.value);
      if (cond.operator === ">") return Number(val) > Number(cond.value);
      if (cond.operator === "=") return val === cond.value;
      if (cond.operator === "!=") return val !== cond.value;
      if (cond.operator === "in") return (cond.value as unknown[]).includes(val);
      return false;
    })
  );
}
