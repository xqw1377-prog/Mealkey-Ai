# 质量评价与推荐等级（速查）

来源：专业模型 V1.0.1 + 三理论 Agent 矩阵 V1

## 100 分制评分

| 维度 | 分值 |
|---|---|
| 心智独特性 | 25 |
| 竞争优势强度 | 20 |
| 客群匹配度 | 15 |
| 可执行性 | 15 |
| 长期壁垒 | 15 |
| 风险可控性 | 10 |

## 双轨推荐等级

| 层 | 字段 | 枚举 |
|---|---|---|
| 理论视角 | `theory_recommend` | strong_recommend / recommend / neutral / not_recommend |
| 最终决策 | `decision_recommend` | primary / secondary / backup / reject |

映射规则见 `prompts/protocols/recommendation-mapping.md`。

## 心智占位等级

| 等级 | 含义 | decision 倾向 |
|---|---|---|
| A | 可强占位 | primary |
| B | 可争夺 | secondary |
| C | 可尝试 | backup |
| D | 不建议 | reject |

## 风险等级（统一 R1–R4）

| 等级 | 含义 |
|---|---|
| R1 | 低风险，可控 |
| R2 | 中风险，需配套策略 |
| R3 | 高风险，需谨慎进入 |
| R4 | 不可接受，淘汰主方案资格 |

## 否决优先级

```text
R4 > 心智 D > 两票 not_recommend > 百分制 > 三票偏好
```

## 淘汰规则（任一触发）

- 心智不可理解  
- 客群不清  
- 场景不成立  
- 资源明显不匹配  
- 强势品牌深度占位且无新切口  
- 风险达到 R4  

## 方案评价输出

```text
mind_position_level     # A | B | C | D
overall_score           # 0-100
decision_recommend      # primary | secondary | backup | reject
theory_vote_summary     # ries / trout / ye
max_risk_severity       # R1-R4
key_risk_summary
```
