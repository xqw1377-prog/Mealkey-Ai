# 推荐等级双轨映射

## 两套枚举（禁止混用字段名）

| 层 | 字段名 | 枚举 | 使用者 |
|---|---|---|---|
| 理论视角层 | `theory_recommend` | `strong_recommend` \| `recommend` \| `neutral` \| `not_recommend` | Ries / Trout / Ye |
| 最终决策层 | `decision_recommend` | `primary` \| `secondary` \| `backup` \| `reject` | Synthesis / Final |

Theory View 历史字段 `recommendation_level` **仅表示** `theory_recommend`。  
最终方案历史字段 `recommendation_level` **仅表示** `decision_recommend`。

## 理论票 → 决策倾向

| 条件 | decision_recommend 倾向 |
|---|---|
| ≥2 Agent `strong_recommend`，无 R4 | primary 候选 |
| ≥2 Agent ≥ `recommend`，分歧可控 | secondary 或与评分争 primary |
| 仅 1 Agent 强推，另两方 neutral | backup 或 Cross-Fire 加严 |
| ≥2 Agent `not_recommend` | reject |
| 任一方 R4 且 Cross-Fire 确认 | reject（不可 primary） |
| 三方 preferred 完全不同 | 禁止平均；必须 Cross-Fire |

## 否决优先级

```text
R4 淘汰 > 心智 D > 两票 not_recommend > 百分制排序 > 三票偏好
```

## 心智等级对照

| mind_position_level | decision 倾向（无 R4） |
|---|---|
| A | primary 优先 |
| B | secondary；资源允许可 primary |
| C | backup |
| D | reject |
