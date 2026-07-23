/**
 * M-PNT report template — maps to M-Solution Framework + mother UI report.
 */
export const mPntReportTemplate = {
  id: "m-pnt-positioning-report",
  name: "餐饮品牌定位决策报告",
  version: "1.0.0",
  sections: [
    {
      id: "situation",
      title: "Situation 项目局势",
      fields: ["projectStatus", "coreProblem", "constraints"],
    },
    {
      id: "insight",
      title: "Insight 关键洞察",
      fields: ["marketInsight", "competitionInsight", "mentalInsight"],
    },
    {
      id: "position",
      title: "Position 定位选择",
      fields: [
        "candidates",
        "theoryVoteSummary",
        "finalRecommendation",
        "decision_recommend",
      ],
    },
    {
      id: "strategy",
      title: "Strategy 策略",
      fields: ["differentiation", "competitiveStance", "notPlaying"],
    },
    {
      id: "action",
      title: "Action 行动",
      fields: ["brandExpression", "productScene", "phaseOneFocus"],
    },
    {
      id: "validation",
      title: "Validation 验证",
      fields: ["day30", "day90", "killCriteria"],
    },
    {
      id: "decision",
      title: "Decision 决策记录",
      fields: ["conclusion", "why", "risks", "confidence"],
    },
  ],
  /** How report fields map from MKDecision */
  mkDecisionMapping: {
    situation: "observation",
    insight: "diagnosis",
    position: "judgement",
    strategy: "strategy",
    action: "action",
    confidence: "confidence",
    evidence: "evidence",
  },
} as const;

export type MPntReportTemplate = typeof mPntReportTemplate;
