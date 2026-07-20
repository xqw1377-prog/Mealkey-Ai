/**
 * M-ED 股权治理决策规则库
 *
 * 蒸馏自：公司法, VC Term Sheet标准, 股权激励方法论,
 * 控制权架构设计, 餐饮行业股权纠纷30年经验
 */

import type { DecisionRule } from "../types";

export const EQUITY_GOVERNANCE_RULES: DecisionRule[] = [
  {
    id: "ED-RULE-001", scenario: "控制权",
    description: "创始人持股低于51%后须有一票否决权保护",
    conditions: [{ field: "founder_shareholding", operator: "<", value: 51 }, { field: "founder_veto_protection", operator: "=", value: false }],
    judgement: "持股低于51% + 无否决权 = 控制权可能丧失",
    risk: "high", recommendation: "通过章程/一致行动人/AB股保留关键事项否决权",
    weight: 0.95, source: "公司法 + VC控制权实践",
  },
  {
    id: "ED-RULE-002", scenario: "控制权",
    description: "创始人至少控制董事会半数席位",
    conditions: [{ field: "founder_board_seats_ratio", operator: "<", value: 50 }],
    judgement: "董事会席位不足半数 = 重大决策可能被否决",
    risk: "high", recommendation: "创始人+一致行动人占董事会半数以上",
    weight: 0.9, source: "董事会控制权设计",
  },
  {
    id: "ED-RULE-003", scenario: "控制权",
    description: "需长期控制权的创始人应考虑AB股",
    conditions: [{ field: "founder_long_term_control_needed", operator: "=", value: true }, { field: "has_ab_shares", operator: "=", value: false }],
    judgement: "需长期控制但无AB股 = 多轮融资后必然稀释",
    risk: "medium", recommendation: "首轮机构融资前完成AB股设置",
    weight: 0.85, source: "AB股制度 + 上市规则",
  },
  {
    id: "ED-RULE-004", scenario: "股权结构",
    description: "联合创始人须有明确vesting计划",
    conditions: [{ field: "has_cofounder", operator: "=", value: true }, { field: "has_vesting_plan", operator: "=", value: false }],
    judgement: "有联合创始人但无vesting = 退出时股权纠纷高概率",
    risk: "high", recommendation: "标准：4年分期 + 1年cliff",
    weight: 0.95, source: "VC标准条款 + 股权纠纷案例",
  },
  {
    id: "ED-RULE-005", scenario: "股权结构",
    description: "融资前应预留10-20%期权池",
    conditions: [{ field: "option_pool_size", operator: "<", value: 10 }, { field: "has_fundraising_plan", operator: "=", value: true }],
    judgement: "有融资计划但期权池不足10% = 稀释核心团队激励",
    risk: "medium", recommendation: "融资前预留10-20%期权池",
    weight: 0.85, source: "VC期权池标准",
  },
  {
    id: "ED-RULE-006", scenario: "融资条款",
    description: "投资人优先清算倍数超过2x对创始人不利",
    conditions: [{ field: "liquidation_preference_multiple", operator: ">", value: 2 }],
    judgement: "优先清算倍数超过2x = 公司出售时创始人可能拿不到钱",
    risk: "high", recommendation: "优先清算权控制在1x（非参与型）最佳",
    weight: 0.9, source: "VC Term Sheet标准条款",
  },
  {
    id: "ED-RULE-007", scenario: "融资条款",
    description: "加权平均比完全棘轮对创始人更友好",
    conditions: [{ field: "anti_dilution_type", operator: "=", value: "full_ratchet" }],
    judgement: "完全棘轮反稀释 = 下轮估值下跌时创始人被严重稀释",
    risk: "high", recommendation: "接受加权平均，避免完全棘轮",
    weight: 0.85, source: "VC反稀释条款实践",
  },
  {
    id: "ED-RULE-008", scenario: "融资条款",
    description: "投资人占董事会多数席位要警惕",
    conditions: [{ field: "investor_board_majority", operator: "=", value: true }],
    judgement: "投资人控制董事会多数 = 创始人在重大决策上失去控制",
    risk: "high", recommendation: "创始人方席位 > 投资人方席位",
    weight: 0.95, source: "公司治理 + VC控制权实践",
  },
  {
    id: "ED-RULE-009", scenario: "融资条款",
    description: "拖售权触发门槛保护创始人",
    conditions: [{ field: "drag_along_threshold", operator: "<", value: 50 }],
    judgement: "拖售权门槛低于50% = 投资人可能强行出售公司",
    risk: "high", recommendation: "拖售权门槛不低于51%，最好包括创始人同意",
    weight: 0.85, source: "VC拖售权条款 + 创始人保护",
  },
  {
    id: "ED-RULE-010", scenario: "团队激励",
    description: "期权vesting 4年+1年cliff是行业标准",
    conditions: [{ field: "option_vesting_period", operator: "!=", value: 48 }],
    judgement: "非标准vesting期限 = 可能不符合投资人预期",
    risk: "medium", recommendation: "标准：4年vesting + 1年cliff",
    weight: 0.85, source: "股权激励行业标准",
  },
  {
    id: "ED-RULE-011", scenario: "合规治理",
    description: "公司章程须包含关键保护条款",
    conditions: [{ field: "articles_has_protection_clauses", operator: "=", value: false }],
    judgement: "章程缺少创始人保护条款 = 纠纷时无法律依据",
    risk: "high", recommendation: "包含：优先购买权/共同出售权/创始人否决权",
    weight: 0.9, source: "公司法 + 公司章程实践",
  },
  {
    id: "ED-RULE-012", scenario: "合规治理",
    description: "公司须持有核心IP",
    conditions: [{ field: "ip_ownership_clear", operator: "=", value: false }],
    judgement: "核心知识产权权属不清 = 融资时重大风险",
    risk: "high", recommendation: "核心技术/品牌/专利须在公司名下",
    weight: 0.95, source: "知识产权法 + VC尽调标准",
  },
];
