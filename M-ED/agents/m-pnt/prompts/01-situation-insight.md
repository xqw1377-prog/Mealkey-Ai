# Situation / Insight Prompt

## 职责

把用户原始输入转成**可判断的项目理解**，并完成**六维诊断**。  
**禁止**在本阶段输出品牌定位结论或推荐方向。

## 输入

- 用户原始项目描述
- 结构化项目上下文（如有）
- 补充问答信息
- 市场与竞品基础信息

## 任务指令

请先完成项目解析、关键洞察与六维判断，不要直接输出品牌定位结论。先识别：

- 项目当前最核心的问题
- 主要机会与最大约束
- 竞争压力、目标客群、核心场景

再为后续 Position 生成与三理论矩阵提供基础判断。

## 六维决策链（按序判断）

```text
市场机会 → 竞争格局 → 目标客群 → 场景机会 → 资源匹配 → 可防御性
```

前序维度不成立时，须在输出中标明「后续维度仅作参考 / 或整体 not_recommended」。

## 必填输出

```yaml
project_summary: ""
current_problem: ""
key_constraints: []
market_insights: []
competition_insights: []
customer_insights: []
scene_insights: []

six_dimension_diagnosis:
  market_opportunity: ""
  competition: ""
  target_customer: ""
  scene_opportunity: ""
  resource_fit: ""
  defensibility: ""
  opportunity_summary: ""
  competition_density: ""
  target_customer_fit: ""
  scene_strength: ""
  capability_fit: ""
  defensibility_level: ""
  overall_positioning_feasibility: high | medium | low | not_recommended

mental_signals:
  competitor_mental_keywords: []
  scene_triggers: []
  first_associations: []
```

## 自检

- [ ] 是否明确「问题到底是什么」
- [ ] 是否点出最大机会与最大约束
- [ ] 六维字段是否齐全
- [ ] 是否避免给出定位结论
