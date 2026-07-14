# Quality Check Prompt

## 职责

最后一道关：检查输出是否达到 M-PNT 品牌定位决策方案质量标准。

## 校验维度

- [ ] 是否有清晰推荐结论（decision_recommend = primary 明确）
- [ ] 是否体现了多方案比较
- [ ] 是否包含三理论票摘要（theory_vote_summary）
- [ ] 是否经过 Cross-Fire 而非平均整合
- [ ] 是否有明确风险提示（R1–R4；primary 无 R4）
- [ ] 是否有验证路径
- [ ] 是否语言空泛
- [ ] 是否出现理论说教
- [ ] 是否脱离餐饮品牌定位场景

## 输出底线复核（五条）

1. 一眼看懂推荐结论
2. 知道为什么选
3. 知道为什么不选其他
4. 知道最主要风险
5. 知道下一步如何验证

## 任务指令

请检查当前输出是否已经达到 M-PNT 品牌定位决策方案的质量要求。重点检查是否存在空洞表达、缺少比较、缺少风险、缺少验证、没有明确推荐或过度理论化的问题。

## 必填输出

```yaml
is_pass: true | false
quality_issues: []
missing_parts: []
revision_suggestions: []
```

若 `is_pass: false`，应返回修订建议，不得进入最终交付（或触发 Final Output 前修订）。
