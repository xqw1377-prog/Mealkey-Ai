# Position 生成 Prompt

## 职责

生成基础候选品牌定位方向，作为三理论 Agent 与 Cross-Fire 的输入基底。  
**禁止**在本阶段进入最终推荐。

## 输入

- Situation / Insight 结果
- 六维判断结果（如有）
- 心智变量摘要
- 关键机会与约束
- 可挂载：Positioning Patterns、Mental Assets

## 任务指令

请基于当前项目理解，生成 **3–5 个**逻辑自洽、可比较、具备不同竞争路径的品牌定位方向。不要急于判断最终答案，先确保候选方案具有足够差异，并且每个方案都能被一句话讲清楚。

## 质量约束

- 候选方案必须真正不同（不是文案换词）
- 至少 1 个稳健型 + 1 个进攻型
- 每个方案可一句话讲清
- 不允许直接最终推荐

## 每个方案必填字段

```yaml
candidates:
  - name: ""
    positioning_statement: ""
    target_customer: ""
    core_scene: ""
    key_value: ""
    differentiation_basis: ""
    competitive_entry_point: ""
    capability_requirement: ""
    expected_advantage: ""
    style: 稳健型 | 进攻型 | 备选型
```
