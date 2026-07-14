# M-PNT Knowledge Assets

## 资产清单

| 目录 | Schema | 示例数 | 说明 |
|---|---|---|---|
| `theory-rules/` | `schemas/theory-rule.schema.yaml` | 3 | 三理论的蒸馏判断规则 |
| `challenge-rules/` | `schemas/challenge-rule.schema.yaml` | 5 | 风险挑战与红队规则 |
| `mental-assets/` | `schemas/mental-asset.schema.yaml` | 3 | 心智语言、场景与联想 |
| `case-assets/` | `schemas/case-asset.schema.yaml` | 3 | 真实品牌定位案例 |
| `market-assets/` | `schemas/competitor-profile.schema.yaml` + `category-map.schema.yaml` | 2 | 市场品类心智地图 |
| `positioning-patterns/` | `schemas/positioning-pattern.schema.yaml` | 4 | 高频定位模式 |
| `output-schemas/` | `schemas/final-solution.schema.yaml` | 2 | 标准输出结构 |

## 调用关系

| Agent | 优先资产 |
|---|---|
| Ries | theory-rules(ries) + positioning-patterns(leadership/category) |
| Trout | theory-rules(trout) + market-assets + mental-assets |
| Ye | theory-rules(ye_maozhong) + mental-assets + case-assets(china/local) |
| Cross-Fire | challenge-rules |
| Synthesis / Final | output-schemas |

## 新增内容

### 评分与心智等级（V1.0.2+）

Synthesis 输出新增以下字段，对齐《专业模型》六维评分框架：

- `overall_score`: 百分制综合评分（0-100）
- `mind_position_level`: 心智占位等级（A/B/C/D）
- `max_risk_severity`: 汇总最大风险等级（R1-R4）
- `core_risk_summary`: 核心风险摘要
- `validation_focus`: 验证重点建议

详见 `packages/agents/src/m-pnt/matrix/agents/synthesis.ts` 中的 `computeOverallScore()`、`computeMindLevel()` 等函数。
