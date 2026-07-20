import type { ProjectInsightBundle } from "@/server/services/dashboard.service";
import type { ProjectResponse } from "@/server/services/project.service";

export function makeProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: "proj_1",
    name: "杭州湘菜馆",
    brandName: "杭州湘菜馆",
    status: "active",
    stage: "positioning",
    city: "杭州",
    district: "西湖区",
    category: "湘菜",
    target: "年轻白领",
    budget: 500000,
    profile: { positioning: "轻快湘菜" },
    healthScore: 68,
    confidence: 0.72,
    ownerName: "张三",
    reports: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

export function makeBundle(
  overrides: Partial<ProjectInsightBundle> = {},
): ProjectInsightBundle {
  return {
    project: makeProject(),
    currentGoal: "完成定位验证",
    owner: {
      id: "owner_1",
      name: "张三",
      experience: "餐饮3年",
      overallScore: 66,
      background: JSON.stringify({ 产品: 70, 运营: 60 }),
      strengths: JSON.stringify(["产品"]),
      weaknesses: JSON.stringify(["增长"]),
      capabilities: [
        { name: "产品能力", score: 78 },
        { name: "运营能力", score: 64 },
        { name: "战略能力", score: 60 },
        { name: "管理能力", score: 55 },
        { name: "增长能力", score: 48 },
      ],
    },
    decisions: [
      {
        id: "dec_1",
        type: "positioning",
        problem: "如何定差异化",
        observation: "周边同质化严重",
        diagnosis: "定位不够锐利",
        judgement: "应聚焦年轻白领午餐场景",
        strategy: "收缩菜单，强化招牌菜",
        action: "本周完成三道招牌菜测试",
        confidence: 0.74,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ],
    latestReport: {
      id: "rep_1",
      type: "diagnosis",
      title: "定位诊断",
      summary: "需要更清晰的差异化理由",
      content: JSON.stringify({
        conclusion: "先验证午餐场景",
        positioning: "轻快湘菜",
        risk: "客群不买单",
        counterArgument: "如果午市流量不足会失败",
        nextAction: "做一次午市试卖",
      }),
      status: "published",
      createdAt: new Date("2026-02-01T00:00:00Z"),
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    },
    reportContent: {
      conclusion: "先验证午餐场景",
      positioning: "轻快湘菜",
      risk: "客群不买单",
      counterArgument: "如果午市流量不足会失败",
      nextAction: "做一次午市试卖",
    },
    memories: [
      {
        key: "goal.short_term",
        content: "完成定位验证",
        source: "ai",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ],
    ...overrides,
  };
}
