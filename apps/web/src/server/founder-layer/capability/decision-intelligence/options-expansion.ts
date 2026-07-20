import type {
  DecisionCaseV1,
  DecisionContextV1,
  DecisionOptionV1,
  DecisionSimulationV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

/** 扩店默认三方案 + 路径模拟骨架 */
export function buildExpansionOptions(input: {
  decisionCase: DecisionCaseV1;
  context: DecisionContextV1;
}): { options: DecisionOptionV1[]; simulations: DecisionSimulationV1[] } {
  const decisionId = input.decisionCase.id;
  const org =
    input.context.restaurantState.dimensions.organization ?? 50;
  const preferOptimize = org < 65 || input.context.unknowns.length >= 2;

  const options: DecisionOptionV1[] = [
    {
      id: `${decisionId}_opt_a`,
      decisionId,
      name: "立即扩张",
      description: "在 90 天内启动第二店选址与筹备",
      expectedBenefit: "更快占领区域、验证多店模型",
      requiredResources: ["现金缓冲", "可独立店长", "选址与装修带宽"],
      riskLevel: "high",
      successProbabilityBand: preferOptimize ? "low" : "medium",
      successProbabilityRationale: preferOptimize
        ? "组织/未知项偏多，立即扩张把握偏低"
        : "有一定组织基础，仍取决于现金与选址",
      executionDifficulty: "high",
      isRecommended: false,
    },
    {
      id: `${decisionId}_opt_b`,
      decisionId,
      name: "半年准备后扩张",
      description: "先用 6 个月建立店长体系与单店标准，再开第二家",
      expectedBenefit: "提高复制成功率，降低现金与组织双杀风险",
      requiredResources: ["90 天店长培养计划", "SOP 沉淀", "利润观察窗口"],
      riskLevel: "medium",
      successProbabilityBand: "medium",
      successProbabilityRationale: "用时间换组织能力，历史扩张失败多与此相关",
      executionDifficulty: "medium",
      isRecommended: preferOptimize,
    },
    {
      id: `${decisionId}_opt_c`,
      decisionId,
      name: "继续优化单店",
      description: "暂缓第二店，先把单店利润与人效做扎实",
      expectedBenefit: "夯实模型，避免未验证扩张",
      requiredResources: ["菜单/人效专项", "周经营复盘"],
      riskLevel: "low",
      successProbabilityBand: "high",
      successProbabilityRationale: "不做扩张则扩张失败路径关闭；机会成本是时间",
      executionDifficulty: "low",
      isRecommended: !preferOptimize && org < 50,
    },
  ];

  if (!options.some((o) => o.isRecommended)) {
    options[1]!.isRecommended = true;
  }

  const simulations: DecisionSimulationV1[] = options.map((o) => {
    const simId = `${o.id}_sim`;
    o.simulationId = simId;
    if (o.id.endsWith("_a")) {
      return {
        id: simId,
        optionId: o.id,
        decisionId,
        timeRange: "180天",
        scenarios: [
          { stage: "30天", outcome: "筹备启动，情绪高涨", risk: "现金开始占用" },
          { stage: "90天", outcome: "第二店开业或接近开业", risk: "管理带宽被撕裂" },
          { stage: "180天", outcome: "双店并行", risk: "利润与人效可能双降" },
        ],
        probabilityBand: o.successProbabilityBand,
        rationale: o.successProbabilityRationale,
      };
    }
    if (o.id.endsWith("_b")) {
      return {
        id: simId,
        optionId: o.id,
        decisionId,
        timeRange: "180天",
        scenarios: [
          { stage: "30天", outcome: "店长培养与 SOP 启动", risk: "见效慢、焦虑" },
          { stage: "90天", outcome: "单店标准可复制雏形", risk: "执行打折" },
          { stage: "180天", outcome: "具备开第二店条件窗口", risk: "窗口被错过的机会成本" },
        ],
        probabilityBand: o.successProbabilityBand,
        rationale: o.successProbabilityRationale,
      };
    }
    return {
      id: simId,
      optionId: o.id,
      decisionId,
      timeRange: "90天",
      scenarios: [
        { stage: "30天", outcome: "聚焦人效/套餐/复购", risk: "增长焦虑" },
        { stage: "60天", outcome: "单店指标改善或暴露真问题", risk: "问题被延迟面对" },
        { stage: "90天", outcome: "模型更清晰", risk: "区域机会可能被竞品占据" },
      ],
      probabilityBand: o.successProbabilityBand,
      rationale: o.successProbabilityRationale,
    };
  });

  return { options, simulations };
}
