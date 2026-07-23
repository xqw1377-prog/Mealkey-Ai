# 三理论 Agent 矩阵：里斯定位 · 特劳特定位 · 叶茂中冲突营销

## 1. 三个 Agent = 三套理论体系

| Agent | 理论体系 | 英文/来源锚点 | 核心命题 |
|---|---|---|---|
| **里斯定位 Agent** (`ries`) | **里斯定位理论** | Al Ries · Positioning | 在顾客心智中抢占**第一**；聚焦单一概念；建立领导资产 |
| **特劳特定位 Agent** (`trout`) | **特劳特定位理论** | Jack Trout · 竞争导向定位 | 在**竞争结构**中找空位；第一联想；可防御的差异 |
| **叶茂中冲突营销 Agent** (`ye_maozhong`) | **叶茂中冲突营销** | 冲突营销 | 制造/放大**冲突**；对立记忆；能传播、能成交、能验证 |

> 里斯与特劳特同属定位学派，但在本矩阵中**拆成两个 Agent**：  
> 里斯侧偏「心智第一与聚焦领导」，特劳特侧偏「竞争空位与区隔联想」，避免混成一套话术。  
> 叶茂中侧不是泛化的「场景落地」，而是明确的 **冲突营销** 体系。

---

## 2. 竞争 → 博弈 → 共识

```text
候选方向 A/B/C（同一 Input Package）
        │
   ┌────┼────┐
   ▼    ▼    ▼
 里斯  特劳特  冲突营销     ← 竞争：各推各的 Theory View
   │    │    │
   └────┼────┘
        ▼
   Cross-Fire
   1) 竞争：偏好是否分裂
   2) 博弈：相互攻击对方首选（challenges[]）
   3) 共识：硬共识 / 软共识 / 淘汰
        ▼
   Synthesis 最终取舍（非平均、非简单过半数）
```

---

## 3. 各体系怎么开火（博弈）

| 攻击方 | 典型开火点 |
|---|---|
| 里斯 → 另两方 | 不够聚焦、当不成心智第一、领导资产虚 |
| 特劳特 → 另两方 | 没有竞争空位、只是「更好」、联想易被跟 |
| 冲突营销 → 另两方 | 没有冲突点、记不住、做不动、带不动成交 |

---

## 4. 代码

```typescript
import { runTheoryMatrix } from "@mealkey/agents";

const r = await runTheoryMatrix(ctx);
// r.views.ries        里斯定位
// r.views.trout       特劳特定位
// r.views.ye_maozhong 叶茂中冲突营销
// r.crossFire.challenges / hard_consensus / game_summary
// r.synthesis.decision_recommend
```

路径：`packages/agents/src/m-pnt/matrix/`
