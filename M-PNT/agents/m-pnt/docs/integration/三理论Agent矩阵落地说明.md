# 三理论 Agent 矩阵落地说明

> 每一个理论 = 一个 Agent，挂在 M-PNT 产品 Agent 内部

## 架构

```text
MPntAgent (id: m-pnt)          ← 对外唯一产品 Agent
  │
  ├─ 商业分析 Capabilities（品类/客群/价格/竞争/调性）
  │
  └─ matrix/                   ← 三理论 Agent 矩阵
       ├─ riesAgent            第一/聚焦/领导
       ├─ troutAgent           区隔/第一联想
       ├─ yeMaozhongAgent      场景/落地/可验证
       ├─ crossFireAgent       碰撞（禁止平均）
       └─ synthesisAgent       取舍 decision_recommend
```

## 执行

```typescript
import { runTheoryMatrix, theoryAgents } from "@mealkey/agents";

// 三个理论 Agent 并行 → Cross-Fire → Synthesis
const result = await runTheoryMatrix(mkContext);

result.views.ries      // TheoryView
result.views.trout
result.views.ye_maozhong
result.crossFire
result.synthesis.decision_recommend  // primary | secondary | backup | reject
```

差异化 Capability（`differentiation`）在产品链路中自动调用 `runTheoryMatrix`。

## 为何不注册为顶层 allAgents

| 层 | 角色 |
|---|---|
| `MPntAgent` | 对用户/Chief 的产品入口、计费、Manifest |
| `ries/trout/ye` | M-PNT 内部正交视角，共享 Input Package，不单独售卖 |

若未来要独立调试，可用 `runSingleTheoryAgent("ries", context)`。

## 代码位置

- monorepo: `packages/agents/src/m-pnt/matrix/**`
- 设计仓镜像: `M-PNT/packages/agents/src/m-pnt/matrix/**`
- 测试: `tests/test-m-pnt-matrix.ts`
