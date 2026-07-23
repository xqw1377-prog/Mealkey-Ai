/**
 * Risk Analyzer - 风险分析器
 * 
 * 识别、评估和缓解餐饮项目风险
 */

import type {
  Risk,
  RiskLevel,
  Mitigation,
  RiskAnalyzer,
  ProjectInfo,
  OwnerInfo,
} from "./types";

// ─── 风险规则 ───

interface RiskRule {
  type: Risk["type"];
  condition: (project: ProjectInfo, owner: OwnerInfo) => boolean;
  description: string;
  level: RiskLevel;
  probability: number;
  impact: number;
  mitigation: Mitigation;
}

const RISK_RULES: RiskRule[] = [
  // 市场风险
  {
    type: "market",
    condition: (p, o) => !p.category || p.category === "",
    description: "未明确品类定位",
    level: "high",
    probability: 0.7,
    impact: 0.8,
    mitigation: {
      strategy: "先做市场调研，明确品类定位",
      actions: ["调研当地餐饮市场", "分析竞品", "确定差异化定位"],
      cost: "低",
      effectiveness: 0.8,
    },
  },
  {
    type: "market",
    condition: (p) => (p.investment ?? 0) > 300 && !p.category,
    description: "高投入但未验证市场需求",
    level: "critical",
    probability: 0.8,
    impact: 0.9,
    mitigation: {
      strategy: "先小规模验证，再扩大投入",
      actions: ["开小店测试", "收集客户反馈", "验证模型后再扩大"],
      cost: "中",
      effectiveness: 0.7,
    },
  },
  // 财务风险
  {
    type: "financial",
    condition: (p) => (p.investment ?? 0) > 500,
    description: "投资规模过大",
    level: "high",
    probability: 0.6,
    impact: 0.9,
    mitigation: {
      strategy: "控制投资规模，分阶段投入",
      actions: ["降低装修成本", "租赁设备而非购买", "分阶段扩张"],
      cost: "低",
      effectiveness: 0.6,
    },
  },
  {
    type: "financial",
    condition: (p) => (p.area ?? 0) > 300 && (p.investment ?? 0) < 200,
    description: "面积大但投资不足",
    level: "high",
    probability: 0.7,
    impact: 0.7,
    mitigation: {
      strategy: "缩小面积或增加预算",
      actions: ["重新评估面积需求", "寻找更经济的选址", "增加融资"],
      cost: "中",
      effectiveness: 0.7,
    },
  },
  // 运营风险
  {
    type: "operational",
    condition: (o) => o.experience_level === "beginner",
    description: "缺乏餐饮运营经验",
    level: "medium",
    probability: 0.6,
    impact: 0.7,
    mitigation: {
      strategy: "先学习或找有经验的合伙人",
      actions: ["参加餐饮培训", "找有经验的合伙人", "从简单品类开始"],
      cost: "中",
      effectiveness: 0.6,
    },
  },
  {
    type: "operational",
    condition: (p) => (p.area ?? 0) > 200 && (p.seats ?? 0) > 100,
    description: "大规模运营复杂度高",
    level: "medium",
    probability: 0.5,
    impact: 0.6,
    mitigation: {
      strategy: "建立标准化流程，配备管理团队",
      actions: ["制定SOP", "培训管理团队", "引入管理系统"],
      cost: "高",
      effectiveness: 0.7,
    },
  },
  // 品牌风险
  {
    type: "brand",
    condition: (o) => {
      const strengths = (o.strengths as string[]) ?? [];
      return !strengths.includes("brand") && strengths.length > 0;
    },
    description: "品牌建设能力不足",
    level: "medium",
    probability: 0.5,
    impact: 0.6,
    mitigation: {
      strategy: "先聚焦产品，逐步建立品牌",
      actions: ["做好产品口碑", "利用社交媒体", "寻求品牌合作"],
      cost: "中",
      effectiveness: 0.6,
    },
  },
  // 团队风险
  {
    type: "team",
    condition: (o) => {
      const strengths = (o.strengths as string[]) ?? [];
      return o.experience_level === "beginner" && !strengths.includes("management");
    },
    description: "缺乏团队管理经验",
    level: "medium",
    probability: 0.5,
    impact: 0.5,
    mitigation: {
      strategy: "先小团队运营，逐步扩大",
      actions: ["从家庭店开始", "学习团队管理", "招聘有经验的店长"],
      cost: "中",
      effectiveness: 0.6,
    },
  },
];

// ─── Risk Analyzer 实现 ───

export class DefaultRiskAnalyzer implements RiskAnalyzer {
  /**
   * 识别风险
   */
  identifyRisks(project: ProjectInfo, owner: OwnerInfo): Risk[] {
    const risks: Risk[] = [];

    for (const rule of RISK_RULES) {
      if (rule.condition(project, owner)) {
        risks.push({
          type: rule.type,
          description: rule.description,
          level: rule.level,
          probability: rule.probability,
          impact: rule.impact,
          mitigation: rule.mitigation,
        });
      }
    }

    // 按风险等级排序
    return risks.sort((a, b) => {
      const levelOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });
  }

  /**
   * 评估风险等级
   */
  assessRiskLevel(risk: Risk): RiskLevel {
    const riskScore = risk.probability * risk.impact;

    if (riskScore >= 0.7) return "critical";
    if (riskScore >= 0.5) return "high";
    if (riskScore >= 0.3) return "medium";
    return "low";
  }

  /**
   * 生成缓解方案
   */
  generateMitigation(risk: Risk): Mitigation {
    // 如果已有缓解方案，直接返回
    if (risk.mitigation) {
      return risk.mitigation;
    }

    // 根据风险类型生成默认缓解方案
    switch (risk.type) {
      case "market":
        return {
          strategy: "做市场调研，验证需求",
          actions: ["调研目标客群", "分析竞品", "测试市场反应"],
          cost: "低",
          effectiveness: 0.6,
        };
      case "financial":
        return {
          strategy: "控制成本，分阶段投入",
          actions: ["降低初始投资", "寻找融资", "分阶段扩张"],
          cost: "中",
          effectiveness: 0.5,
        };
      case "operational":
        return {
          strategy: "建立标准化流程",
          actions: ["制定SOP", "培训团队", "引入管理系统"],
          cost: "中",
          effectiveness: 0.6,
        };
      case "brand":
        return {
          strategy: "聚焦产品，逐步建立品牌",
          actions: ["做好产品", "积累口碑", "逐步推广"],
          cost: "低",
          effectiveness: 0.5,
        };
      case "team":
        return {
          strategy: "先小团队，逐步扩大",
          actions: ["从家庭店开始", "学习管理", "招聘经验人才"],
          cost: "中",
          effectiveness: 0.5,
        };
      default:
        return {
          strategy: "进一步分析风险",
          actions: ["收集更多信息", "咨询专家"],
          cost: "低",
          effectiveness: 0.3,
        };
    }
  }
}
