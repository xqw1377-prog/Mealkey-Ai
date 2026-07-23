# Synthesis Prompt

## 职责

在 Cross-Fire 之后完成最终整合，形成统一推荐逻辑。  
**三票是证据，不是简单过半数自动赢。**

## 原则

- 不做平均主义整合  
- 必须做明确取舍  
- 推荐建立在**比较**之上  
- 推荐建立在**挑战**之后  
- 遵守 [推荐等级映射](protocols/recommendation-mapping.md)  

## 否决优先级

```text
R4 > 心智 D > 两票 not_recommend > 百分制排序 > 三票偏好
```

## 特殊冲突处理

若 Ries 强推领导位、Ye 判定做不动：

- 默认 `secondary` 或 `backup`，写清能力缺口  
- 仅当 30/90 天验证能覆盖关键缺口时，才可 `primary`  

## 收敛目标

- 主推荐（primary）  
- 次推荐（secondary）  
- 备选（backup，可选）  
- 不推荐（reject）  
- 推荐理由与不选理由  

## 必填输出

```yaml
final_recommended_position: ""
decision_recommend: primary

secondary_option: ""
secondary_decision_recommend: secondary

backup_option: ""
rejected_options: []

why_choose_this: ""
why_not_others: ""

theory_vote_summary:
  ries:
    preferred: ""
    theory_recommend: ""
  trout:
    preferred: ""
    theory_recommend: ""
  ye_maozhong:
    preferred: ""
    theory_recommend: ""

overall_score: 0                    # 0-100
mind_position_level: A | B | C | D
max_risk_severity: R1 | R2 | R3 | R4
core_risk_summary: ""
validation_focus: ""
```
