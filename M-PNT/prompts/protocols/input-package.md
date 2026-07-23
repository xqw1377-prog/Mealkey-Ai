# Theory Agent 统一输入协议（Input Package）

三理论 Agent **必须共享**同一输入，禁止各自改写项目事实。

```yaml
project_context:
  city: ""
  trade_area: ""
  category: ""
  avg_ticket: ""
  budget: ""
  resources: ""

problem_summary:
  core_problem: ""
  positioning_dilemma: ""

six_dimension_diagnosis:
  market_opportunity: ""
  competition: ""
  target_customer: ""
  scene_opportunity: ""
  resource_fit: ""
  defensibility: ""
  overall_positioning_feasibility: high | medium | low | not_recommended

candidate_directions: []   # 来自 Position 生成 Prompt，3–5 个

mental_signals:
  competitor_mental_keywords: []
  scene_triggers: []
  first_associations: []
```

## 知识挂载（差异检索，同一底座）

| Agent | 优先知识 |
|---|---|
| Ries | Theory Rules(ries) + Positioning Patterns(leadership/category) |
| Trout | Theory Rules(trout) + Market/Competition + Mental Assets |
| Ye | Theory Rules(ye_maozhong) + Mental Assets + Case Assets(china/local) |

完整矩阵规则见 `docs/M-PNT-三理论Agent矩阵设计-V1.md`。
