/**
 * Scenario Engine — 七常委假设情景分析引擎
 *
 * 顶级顾问的核心能力：能跑假设情景（What-If Analysis）。
 * 每个常委根据自身角色，对决策方案进行情景推演：
 * - CSO: 竞争格局变化情景
 * - CMO: 需求变化情景
 * - CBO: 品牌稀释情景
 * - BMO: 关键变量敏感度情景
 * - CFO: 现金极端情景
 * - COO: 执行走样情景
 * - CRO: 最坏情景推演
 */

import type { CouncilRoleId, ScenarioAssumption, ScenarioResult } from "./types";
import { getPersonaV2 } from "./persona-v2";
import { getRoleContract } from "./catalog";

// ScenarioAssumption and ScenarioResult are defined in types.ts
// They are re-exported from index.ts via types.ts

/** 每位常委擅长推演的情景类型 */
const SCENARIO_TEMPLATES: Record<CouncilRoleId, Array<{
  id: string;
  title: string;
  description: string;
  generateAssumptions: (topic: string) => ScenarioAssumption[];
  generateResult: (assumptions: ScenarioAssumption[], topic: string) => ScenarioResult;
}>> = {
  CSO: [
    {
      id: "competition_escalation",
      title: "竞争格局恶化情景",
      description: "如果行业竞争在 12 个月内加剧 2 倍，当前战略是否仍然成立？",
      generateAssumptions: (topic) => [
        { variable: "直接竞品数量", baseValue: "当前水平", stressValue: "2x", probability: "medium" },
        { variable: "价格战强度", baseValue: "正常竞争", stressValue: "价格下降 20%", probability: "medium" },
        { variable: "头部玩家投入", baseValue: "当前水平", stressValue: "3x 资源投入", probability: "low" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "CSO-S1",
        title: `竞争加剧情景下「${topic}」的战略韧性`,
        assumptions,
        bestCase: "竞争加剧但差异化足够，市场份额反而提升",
        baseCase: "竞争加剧导致增长放缓但仍为正，ROI 下降 30%",
        worstCase: "价格战+资源战双重打击，战略收益为负",
        killSignal: "核心竞品获得 2x 以上融资且直接对标",
        decisionImpact: "still_support",
      }),
    },
  ],
  CMO: [
    {
      id: "demand_decline",
      title: "需求萎缩情景",
      description: "如果市场需求在 6 个月内下降 30%，当前进入决策还成立吗？",
      generateAssumptions: (topic) => [
        { variable: "用户需求强度", baseValue: "当前水平", stressValue: "下降 30%", probability: "medium" },
        { variable: "客单价变化", baseValue: "目标客单价", stressValue: "下降 15%", probability: "medium" },
        { variable: "复购率", baseValue: "预估复购率", stressValue: "下降 40%", probability: "low" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "CMO-S1",
        title: `需求萎缩情景下「${topic}」的需求韧性`,
        assumptions,
        bestCase: "核心用户需求刚性，影响 < 10%",
        baseCase: "需求下降 20%，仍可维持盈亏平衡线以上",
        worstCase: "需求崩塌，获客成本飙升导致单位经济为负",
        killSignal: "连续 3 个月新客增速为负",
        decisionImpact: "shift_to_conditional",
      }),
    },
  ],
  CBO: [
    {
      id: "brand_dilution",
      title: "品牌稀释情景",
      description: "如果扩张导致品牌认知模糊化，差异化消失，长期影响如何？",
      generateAssumptions: (topic) => [
        { variable: "品牌认知清晰度", baseValue: "当前水平", stressValue: "下降 50%", probability: "medium" },
        { variable: "差异化感知", baseValue: "一句话能说清", stressValue: "无法区分竞品", probability: "medium" },
        { variable: "品牌溢价能力", baseValue: "当前溢价", stressValue: "溢价消失", probability: "low" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "CBO-S1",
        title: `品牌稀释情景下「${topic}」的品牌资产影响`,
        assumptions,
        bestCase: "品牌认知保持，用户仍能一句话说清差异",
        baseCase: "品牌清晰度下降但核心差异仍在，溢价能力减弱",
        worstCase: "品牌沦为品类通称，零溢价，需重新定位",
        killSignal: "NPS 调研中用户无法说出与竞品的差异",
        decisionImpact: "shift_to_conditional",
      }),
    },
  ],
  BMO: [
    {
      id: "unit_econ_stress",
      title: "单位经济压力测试",
      description: "关键变量上浮 20% 时商业模式是否仍然成立？",
      generateAssumptions: (topic) => [
        { variable: "食材成本", baseValue: "占收入 33%", stressValue: "上浮至 40%", probability: "high" },
        { variable: "租金成本", baseValue: "占收入 12%", stressValue: "上浮至 18%", probability: "medium" },
        { variable: "人工成本", baseValue: "占收入 22%", stressValue: "上浮至 28%", probability: "medium" },
        { variable: "客流量", baseValue: "预估客流", stressValue: "下降 20%", probability: "medium" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "BMO-S1",
        title: `单位经济压力测试 — 「${topic}」的利润韧性`,
        assumptions,
        bestCase: "仅 1 个变量恶化，利润下降但仍为正",
        baseCase: "2 个变量同时恶化，利润接近盈亏平衡线",
        worstCase: "3 个以上变量同时恶化，单位经济为负",
        killSignal: "单店模型在正常经营假设下连续 6 个月亏损",
        decisionImpact: "shift_to_conditional",
      }),
    },
  ],
  CFO: [
    {
      id: "cash_extreme",
      title: "现金极端情景",
      description: "如果融资失败且收入低于预期 40%，现金能否撑过验证期？",
      generateAssumptions: (topic) => [
        { variable: "融资进度", baseValue: "按计划融资", stressValue: "融资全部失败", probability: "medium" },
        { variable: "收入达成率", baseValue: "100%", stressValue: "60%", probability: "medium" },
        { variable: "回本周期", baseValue: "12-18 个月", stressValue: "延长至 30 个月", probability: "low" },
        { variable: "固定成本", baseValue: "可控", stressValue: "无法压缩（刚性）", probability: "medium" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "CFO-S1",
        title: `现金极端情景 — 「${topic}」的生存边界`,
        assumptions,
        bestCase: "融资部分成功 + 收入 80% 达成，跑道安全",
        baseCase: "无融资 + 收入 70%，跑道剩余 4-5 个月",
        worstCase: "无融资 + 收入 < 60%，跑道不足 3 个月",
        killSignal: "可用现金低于 3 个月运营成本",
        decisionImpact: "shift_to_oppose",
      }),
    },
  ],
  COO: [
    {
      id: "execution_degradation",
      title: "执行走样情景",
      description: "如果扩张到第 10 家店时运营一致性下降 40%，影响多大？",
      generateAssumptions: (topic) => [
        { variable: "运营一致性", baseValue: "第 1-3 店标准", stressValue: "下降 40%", probability: "high" },
        { variable: "培训转化率", baseValue: "80%", stressValue: "50%", probability: "medium" },
        { variable: "人才供给", baseValue: "自给自足", stressValue: "关键岗位缺口 30%", probability: "medium" },
        { variable: "供应链稳定性", baseValue: "稳定", stressValue: "跨城后断裂", probability: "medium" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "COO-S1",
        title: `执行走样情景 — 「${topic}」的组织韧性`,
        assumptions,
        bestCase: "SOP 体系完善，走样 < 15%，可快速修正",
        baseCase: "走样 30%，需额外 2 个月爬坡期",
        worstCase: "走样 50% 以上，用户体验大幅下降，品牌受损",
        killSignal: "神秘顾客评分连续 3 个月下降",
        decisionImpact: "shift_to_conditional",
      }),
    },
  ],
  CRO: [
    {
      id: "worst_case_full",
      title: "最坏情景全面推演",
      description: "假设所有可能同时出错：市场变化、执行走样、资金断裂，最坏结果是什么？",
      generateAssumptions: (topic) => [
        { variable: "合规风险", baseValue: "正常运营", stressValue: "食安/法律事故", probability: "low" },
        { variable: "声誉风险", baseValue: "正面", stressValue: "负面舆情爆发", probability: "low" },
        { variable: "运营风险", baseValue: "稳定", stressValue: "关键人才流失+供应链中断", probability: "medium" },
        { variable: "财务风险", baseValue: "健康", stressValue: "现金流断裂", probability: "medium" },
        { variable: "战略风险", baseValue: "方向正确", stressValue: "市场根本性变化", probability: "low" },
      ],
      generateResult: (assumptions, topic) => ({
        scenarioId: "CRO-S1",
        title: `最坏情景全面推演 — 「${topic}」的生存边界`,
        assumptions,
        bestCase: "1-2 个低概率风险发生，可控范围内",
        baseCase: "1 个高概率 + 1 个低概率风险同时发生，品牌受损但可恢复",
        worstCase: "3 个以上风险同时触发，企业生存受威胁",
        killSignal: "同时出现现金流告急 + 声誉危机 + 核心人才流失",
        decisionImpact: "shift_to_oppose",
      }),
    },
  ],
};

/** 为指定常委生成情景分析 */
export function runScenarioAnalysis(
  roleId: CouncilRoleId,
  topic: string,
  options?: {
    scenarioId?: string;
  },
): ScenarioResult[] {
  const templates = SCENARIO_TEMPLATES[roleId];
  if (!templates) return [];

  const selected = options?.scenarioId
    ? templates.filter((t) => t.id === options.scenarioId)
    : templates.slice(0, 1);

  return selected.map((t) => {
    const assumptions = t.generateAssumptions(topic);
    return t.generateResult(assumptions, topic);
  });
}

/** 为指定花名册所有常委生成情景分析 */
export function runCouncilScenarioAnalysis(
  roster: CouncilRoleId[],
  topic: string,
): Record<CouncilRoleId, ScenarioResult[]> {
  const results: Record<CouncilRoleId, ScenarioResult[]> = {} as Record<CouncilRoleId, ScenarioResult[]>;
  for (const role of roster) {
    results[role] = runScenarioAnalysis(role, topic);
  }
  return results;
}

/** 渲染情景分析文本（注入 prompt 用） */
export function renderScenarioBlock(
  roleId: CouncilRoleId,
  results: ScenarioResult[],
): string {
  const persona = getPersonaV2(roleId);
  const role = getRoleContract(roleId);

  if (!results?.length) return "";

  const blocks: string[] = [
    `# Scenario Analysis — ${roleId}`,
    `基于「${persona.natural_bias}」视角的假设情景推演`,
    "",
  ];

  for (const r of results) {
    blocks.push(`## ${r.title}`);
    blocks.push("### 压力变量");
    for (const a of r.assumptions) {
      const prob = a.probability === "high" ? "高" : a.probability === "medium" ? "中" : "低";
      blocks.push(`- ${a.variable}: 基准=${a.baseValue} → 压力=${a.stressValue}（概率: ${prob}）`);
    }
    blocks.push("", "### 三情景结果");
    blocks.push(`- **最佳**: ${r.bestCase}`);
    blocks.push(`- **基准**: ${r.baseCase}`);
    blocks.push(`- **最坏**: ${r.worstCase}`);
    blocks.push("", "### 停损信号");
    blocks.push(`- ${r.killSignal}`);
    blocks.push(
      `\n推演结论: ${r.decisionImpact === "still_support" ? "✅ 情景不影响支持判断" : r.decisionImpact === "shift_to_conditional" ? "⚠️ 情景下须改为条件支持" : "🚫 情景下须改为反对"}`,
    );
    blocks.push("");
  }

  return blocks.join("\n");
}

export { SCENARIO_TEMPLATES };
