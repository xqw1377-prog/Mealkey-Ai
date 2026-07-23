# Theory View 统一输出协议

三理论 Agent 必须按此结构输出，便于 Cross-Fire 比较。

```yaml
agent_id: ries | trout | ye_maozhong

preferred_direction: ""
why_this_direction: ""
rejected_directions:
  - name: ""
    reason: ""

core_strategic_logic: ""
key_mental_position: ""     # 一句话心智位置

main_risks:
  - risk: ""
    severity: R1 | R2 | R3 | R4

direction_scores:
  - name: ""
    theory_score: 0          # 0-100，本视角贡献分
    theory_recommend: strong_recommend | recommend | neutral | not_recommend

# 对 preferred_direction 的总视角立场（= theory_recommend）
recommendation_level: strong_recommend | recommend | neutral | not_recommend
theory_recommend: strong_recommend | recommend | neutral | not_recommend
```

## theory_recommend 含义

| 值 | 含义 |
|---|---|
| strong_recommend | 本视角强烈主张作为主方向 |
| recommend | 本视角可接受并倾向支持 |
| neutral | 可保留，不强推 |
| not_recommend | 本视角主张淘汰或不要主推 |

## 禁止

- 自由散文替代结构字段  
- 不比较候选集直接宣布「唯一答案」  
- 使用 R5 或其它未定义风险级  
- 输出 `primary/secondary`（那是 Synthesis 的 `decision_recommend`）  

映射见 [recommendation-mapping.md](recommendation-mapping.md)。
