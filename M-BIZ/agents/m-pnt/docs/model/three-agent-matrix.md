# 三理论 Agent 矩阵（速查）

完整版：`docs/M-PNT-三理论Agent矩阵设计-V1.md`

## 三角色

| Agent | 立场 | 一句话 |
|---|---|---|
| Ries | 第一 / 品类 / 聚焦 / 领导 | 值不值得长期当第一去占？ |
| Trout | 竞争 / 区隔 / 联想 | 能不能钉住竞品地图空位？ |
| Ye | 场景 / 传播 / 落地 | 能不能懂、记、传、买？ |

## 数据流

```text
同一 Input Package → 三 Theory View → Cross-Fire → Synthesis
```

## 双轨等级

- 理论层：`theory_recommend`
- 决策层：`decision_recommend`

## 硬规则

- 共享输入，禁止改写事实  
- 禁止平均主义  
- R4 不得 primary  
- 最终推荐权在 Synthesis  
