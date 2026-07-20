/** Expert Engine 目录 — 专业判断引擎，非第二专家投票层 */

import type { ExpertEngineId } from "./types";

export interface ExpertEngineContract {
  engine_id: ExpertEngineId;
  name: string;
  question: string;
  produces: string;
  does_not: string;
  report_section_ids: string[];
  feeds_council_roles: string[];
}

export const EXPERT_ENGINES: Record<ExpertEngineId, ExpertEngineContract> = {
  "M-PNT": {
    engine_id: "M-PNT",
    name: "Brand Strategy Engine",
    question: "我是谁？",
    produces: "Brand Strategy Report",
    does_not: "给老板拍板；不参与七常委投票；不替代 Decision Council",
    report_section_ids: ["category", "mindset", "positioning", "brand_strategy"],
    feeds_council_roles: ["CBO", "CSO", "CMO"],
  },
  "M-MKT": {
    engine_id: "M-MKT",
    name: "Market Intelligence Engine",
    question: "市场有没有机会？",
    produces: "Market Intelligence Report",
    does_not: "决定是否进入；不投票；不做企业级权衡",
    report_section_ids: [
      "market_size",
      "user_trends",
      "competition",
      "growth_window",
      "risks",
    ],
    feeds_council_roles: ["CMO", "CSO", "BMO"],
  },
  "M-BIZ": {
    engine_id: "M-BIZ",
    name: "Business Model Engine",
    question: "能不能赚钱？",
    produces: "Business Model Report",
    does_not: "决定扩张节奏；不投票；不覆盖现金/股权判断",
    report_section_ids: [
      "business_model",
      "unit_economics",
      "profit_structure",
      "replication",
      "sensitivity",
    ],
    feeds_council_roles: ["BMO", "CFO", "COO"],
  },
  "M-ED": {
    engine_id: "M-ED",
    name: "Capital & Ownership Engine",
    question: "企业如何长期组织资本？",
    produces: "Capital Structure Report",
    does_not: "替代创始人控制权决策；不投票；不做品牌/市场需求研究",
    report_section_ids: [
      "ownership",
      "fundraising",
      "control",
      "incentives",
      "risks",
    ],
    feeds_council_roles: ["CFO", "CRO", "CSO"],
  },
};

/** 常委消费专家报告时的镜头问题（禁止重研） */
export const EXPERT_TO_COUNCIL_LENS: Record<
  ExpertEngineId,
  Record<string, string>
> = {
  "M-MKT": {
    CMO: "用户是否存在？需求是否真实？",
    CSO: "窗口是否值得占位？",
    BMO: "需求能否转化为可赚钱模型？",
  },
  "M-PNT": {
    CBO: "是否破坏或稀释品牌？",
    CSO: "是否强化长期位置？",
    CMO: "心智是否支撑购买选择？",
  },
  "M-BIZ": {
    BMO: "是否盈利、可否复制？",
    CFO: "投入产出是否覆盖资本代价？",
    COO: "模型假设在组织上能否落地？",
  },
  "M-ED": {
    CFO: "资本结构是否可承受？",
    CRO: "控制权/合规/治理底线是否触碰？",
    CSO: "资本路径是否服务长期方向？",
  },
};

export function getExpertEngine(id: ExpertEngineId): ExpertEngineContract {
  return EXPERT_ENGINES[id];
}

export function listExpertEngines(): ExpertEngineContract[] {
  return Object.values(EXPERT_ENGINES);
}
