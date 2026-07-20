# Restaurant Brain V1 — Prisma Schema + Entity Contract（冻结）

> **状态：正式冻结（规范化实体）**  
> **日期：** 2026-07-18  
> **原则：** **事实（Fact）与判断（Decision）分离。**  
> **TS：** `packages/restaurant-brain/src/domain/types.ts`  
> **DB：** `apps/web/prisma/schema.prisma`  
> **Agent 出口：** `AgentRestaurantContext` / `buildRestaurantContext`

---

## 0. 存什么 / 不存什么

Brain **不保存「答案」**，保存：

| 存 | 不存 |
|----|------|
| 这家餐厅是什么（Profile / Brand / Business…） | Agent 一次性回复正文当真相 |
| 发生了什么（BrainEvent） | 聊天流水 |
| 做过什么决定（DecisionRecord） | 七常委私有平行档案 |
| 结果是什么（actualOutcome / ActionResult） | |
| 学到了什么（LearningRecord） | |

---

## 1. 实体关系

```text
Restaurant  (根，projectId 1:1 → Project)
├── RestaurantProfile     Fact
├── BrandProfile          Fact ← M-PNT
├── BusinessProfile       Fact ← M-BIZ
├── CapabilityProfile     Fact（经营者能力）
├── FounderProfile        Fact
├── DecisionRecord        Judgment
│     └── ActionRecord    Execution
├── LearningRecord        Learning
├── BrainEvent            Event stream
└── EvolutionState        Meta
```

---

## 2. Prisma 表（已落地）

| Model | 角色 |
|-------|------|
| `Restaurant` | 根；`projectId` 唯一，挂鉴权/计费仍走 Project |
| `RestaurantProfile` | 品类/阶段/城市/门店数/价格带 |
| `BrandProfile` | 定位/客群/场景/承诺/优势/风险 |
| `BusinessProfile` | 营收/毛利/净利/客单/人效比… |
| `CapabilityProfile` | 六维分 + overall + confidence |
| `FounderProfile` | 风格/风险偏好/强弱/盲区（JSON 数组用 String） |
| `DecisionRecord` | 决策记忆（context 为当时事实快照） |
| `ActionRecord` | 执行记忆 |
| `BrainLearning` | 模式学习（TS 仍称 `LearningRecord`；与认知内核 `LearningRecord` 表区分） |
| `BrainEvent` | 统一事件流 |
| `EvolutionState` | 理解度/完整度/计数 |

JSON 字段统一 `String` 存储（与全库一致），API 层解析。

**废弃：** 旧 `RestaurantBrain` JSON 大包、`DecisionMemory` 命名（已替换为上表）。

---

## 3. TypeScript 契约要点

- `RestaurantBrainSnapshot`：Repository 聚合读模型  
- `AgentRestaurantContext`：Agent **唯一**出口（identity/business/brand/capability/founder/history/learning/evolution + priorBlock/unknowns）  
- `RestaurantBrainService`：`getRestaurantContext` / `updateKnowledge` / `recordDecision` / `learn`  

---

## 4. Agent 读取规范

```text
禁止：Agent 直接查 Prisma 拼事实
必须：getRestaurantContext(restaurantId) → AgentRestaurantContext
```

映射：

| Agent | 主要读 |
|-------|--------|
| M-PNT | brand |
| M-BIZ | business |
| M-ED | capability.organization + founder |
| M-MKT | brand + business + identity |
| 七常委 | 全部 Context |
| M-EXEC | history.recentDecisions → ActionRecord |
| Evolution | LearningRecord + Decision 结果 |

---

## 5. 验收

1. 建店 → 自动 `Restaurant` + 五 Profile + EvolutionState  
2. Context.unknowns 在空脑非空  
3. DecisionRecord 可挂 context 快照与 actualOutcome，不覆盖 BrandProfile  
4. LearningRecord 由结果/规则产生，不手写进 Brand  

---

下一文档：`MEALKEY_RESTAURANT_BRAIN_SERVICE_LAYER_V1.md`
