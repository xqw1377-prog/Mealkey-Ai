/**
 * Launch Agent - 开店分析工作流
 * 
 * 高手不是回答问题，高手有流程。
 * 
 * 流程:
 * Step 1: 理解创业者 → Step 2: 判断资源匹配 → Step 3: 判断城市机会
 * → Step 4: 定位模型 → Step 5: 投资风险 → Step 6: 给决策
 */

import type { Workflow } from "@mealkey/agent-sdk";

export const launchWorkflow: Workflow = {
  name: "开店战略分析流程",
  description: "系统化的餐饮开店决策流程，从理解创业者到最终决策",

  steps: [
    {
      id: "owner_analysis",
      name: "理解创业者",
      type: "analysis",
      capabilities: ["business_diagnosis"],
      prompt: `你正在分析一位餐饮创业者的情况。
请根据以下信息，理解创业者的背景、资源和目标：

{{project.profile}}

分析维度：
1. 创业动机和目标
2. 可用资源（资金、经验、人脉）
3. 风险承受能力
4. 时间投入预期

请给出你对创业者画像的初步判断。`,
      next: "market_analysis",
    },
    {
      id: "market_analysis",
      name: "市场机会分析",
      type: "analysis",
      capabilities: ["market_analysis"],
      knowledge: ["market_data", "industry_benchmarks"],
      prompt: `基于创业者画像，分析目标城市的餐饮市场机会：

项目信息：
- 城市: {{project.city}}
- 区域: {{project.district}}
- 品类: {{project.category}}

分析维度：
1. 该品类在目标城市的市场容量
2. 竞争格局（饱和度、差异化空间）
3. 消费者需求趋势
4. 进入时机判断

请给出市场机会评估。`,
      next: "positioning",
    },
    {
      id: "positioning",
      name: "定位策略",
      type: "analysis",
      capabilities: ["positioning"],
      knowledge: ["positioning_cases"],
      prompt: `基于市场分析结果，制定开店定位策略：

创业者画像和市场分析结果：
{{previousResults}}

定位维度：
1. 目标客群定义
2. 价格带定位
3. 差异化策略
4. 品牌调性建议
5. 选址要求

请给出清晰的定位建议。`,
      next: "finance_analysis",
    },
    {
      id: "finance_analysis",
      name: "投资风险评估",
      type: "analysis",
      capabilities: ["finance_analysis"],
      knowledge: ["finance_benchmarks"],
      prompt: `基于定位策略，进行投资风险评估：

项目信息和定位策略：
{{previousResults}}

评估维度：
1. 预估投资额（装修、设备、首批原料、房租押金、流动资金）
2. 盈亏平衡点分析
3. 投资回收期预估
4. 主要风险点识别
5. 风险缓解建议

请给出详细的投资风险评估。`,
      next: "final_decision",
    },
    {
      id: "final_decision",
      name: "最终决策",
      type: "decision",
      prompt: `基于以上所有分析，给出最终的开店决策建议：

分析结果汇总：
{{previousResults}}

请给出：
1. 核心决策结论（是否建议开店）
2. 置信度（0-100）
3. 关键成功因素
4. 最大风险点
5. 下一步行动计划（3-5个具体可执行的步骤）

请以结构化 JSON 格式输出：
{
  "type": "diagnosis",
  "focus": "overall",
  "summary": "一句话结论",
  "confidence": 85,
  "findings": [...],
  "nextAction": "最优先的下一步"
}`,
      output: "final",
    },
  ],
};
