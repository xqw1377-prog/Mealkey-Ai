/**
 * Chief of Staff Agent — 职责合约冻结（Phase 4 工程实现前的边界真源）
 * 不是第 5 个专业 Engine，是 Founder OS 操作中枢。
 */

export const CHIEF_OF_STAFF_CONTRACT = {
  id: "COS",
  name: "Chief of Staff Agent",
  chinese: "决策秘书长 / CEO 办公室",
  layer: "L3_enterprise_intelligence",
  is_expert_engine: false,
  is_council_member: false,
  mission: "Founder OS 的操作中枢：发现问题、路由议题、组织决策、跟踪验证、沉淀记忆。",
  duties: [
    {
      id: "problem_discovery",
      title: "问题发现",
      includes: ["经营异常", "战略机会", "风险信号"],
    },
    {
      id: "issue_routing",
      title: "议题管理",
      routes_to: ["M-PNT", "M-MKT", "M-BIZ", "M-ED", "Decision Council"],
    },
    {
      id: "decision_orchestration",
      title: "决策组织",
      includes: ["召集会议", "生成 Decision Brief / Agenda"],
    },
    {
      id: "validation_tracking",
      title: "执行跟踪",
      connects: ["Validation OS"],
    },
    {
      id: "enterprise_memory",
      title: "企业记忆",
      persists: ["决策", "依据", "结果", "偏差"],
    },
  ],
  phase: 4,
  status: "contract_frozen_implementation_pending",
} as const;

export type ChiefOfStaffDutyId =
  (typeof CHIEF_OF_STAFF_CONTRACT.duties)[number]["id"];
