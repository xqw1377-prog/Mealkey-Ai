/**
 * Launch Agent - 报告模板
 * 
 * 定义开店战略分析报告的结构和样式。
 */

import type { ReportTemplate } from "@mealkey/agent-sdk";

export const launchReportTemplate: ReportTemplate = {
  sections: [
    {
      id: "cover",
      title: "开店战略分析报告",
      type: "cover",
      template: `# {{project.name}} 开店战略分析报告

**分析时间**: {{generatedAt}}
**分析顾问**: MealKey 开店顾问 v{{version}}
**置信度**: {{confidence}}%`,
    },
    {
      id: "summary",
      title: "核心结论",
      type: "summary",
      template: `## 核心结论

{{decision.summary}}

### 关键发现
{{#each findings}}
- **{{issue}}** ({{severity}}): {{suggestion}}
{{/each}}`,
    },
    {
      id: "decision",
      title: "决策建议",
      type: "decision",
      template: `## 决策建议

### 是否建议开店
{{decision.conclusion}}

### 置信度分析
- **置信度**: {{decision.confidence}}%
- **主要支撑**: {{decision.reasoning}}

### 成功概率评估
- **乐观情景**: {{scenarios.optimistic}}
- **基准情景**: {{scenarios.baseline}}
- **悲观情景**: {{scenarios.pessimistic}}`,
    },
    {
      id: "reasoning",
      title: "分析推理",
      type: "reasoning",
      template: `## 分析推理过程

### 市场分析
{{marketAnalysis}}

### 定位策略
{{positioning}}

### 财务评估
{{financeAnalysis}}`,
    },
    {
      id: "risk",
      title: "风险评估",
      type: "risk",
      template: `## 风险评估

### 主要风险
{{#each risks}}
- **{{name}}** ({{level}}): {{description}}
{{/each}}

### 风险缓解措施
{{#each mitigations}}
- {{this}}
{{/each}}`,
    },
    {
      id: "action",
      title: "行动计划",
      type: "action",
      template: `## 下一步行动

{{#each actions}}
### {{@index}}. {{label}}
{{description}}
- **优先级**: {{priority}}
- **预计时间**: {{duration}}
- **验收标准**: {{criteria}}
{{/each}}`,
    },
  ],
};
