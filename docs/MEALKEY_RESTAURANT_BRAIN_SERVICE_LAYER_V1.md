# Restaurant Brain V1 — Service Layer 设计（冻结）

> **状态：正式冻结 — DeepCode 实现规范**  
> **日期：** 2026-07-18  
> **依赖：** `MEALKEY_RESTAURANT_BRAIN_PRISMA_ENTITY_V1.md`  
> **接口真源：** `packages/restaurant-brain`

---

## 1. BrainService API

```typescript
interface RestaurantBrainService {
  getRestaurantContext(restaurantId: string): Promise<AgentRestaurantContext>;
  updateKnowledge(event: BrainEvent): Promise<void>;
  recordDecision(decision: DecisionRecord): Promise<void>;
  learn(learning: LearningRecord): Promise<void>;
}
```

实现位置：`apps/web/src/server/restaurant-brain/`（Prisma）  
导出给 tRPC / Agent：仅此四方法 + `ensureByProjectId` 辅助。

---

## 2. Context Builder

```text
RestaurantBrainSnapshot
        ↓
buildRestaurantContext()
        ↓
AgentRestaurantContext  (+ priorBlock)
```

规则：

- `activeRisks` / opportunities 由规则派生，写入 prior，不落答案表  
- `unknowns` 必须暴露  
- 禁止 Builder 调用 LLM  

---

## 3. Decision Flow

```text
议题产生
  → 组装 context 快照（当时 Fact）写入 DecisionRecord.contextJson
  → AI / 七常委意见 → aiAssessmentJson / councilResultJson
  → 老板 chosenOption
  → expectedOutcomeJson
  → BrainEvent DECISION_CREATED
        ↓
执行（可选 ActionRecord）
        ↓
验证 actualOutcomeJson
  → BrainEvent DECISION_COMPLETED
  → 可选 learn() → LearningRecord
  → EvolutionState 计数 + 理解度重算
```

**禁止：** 用 Decision 结果直接覆写 BrandProfile 而不经事件/闸门。

---

## 4. Memory 写入流程

| API | 写表 |
|-----|------|
| updateProfile / upsertBrand / upsertBusiness / upsertCapability | Fact 表 |
| recordDecision | DecisionRecord + Event |
| createAction / completeAction | ActionRecord + Event |
| learn | LearningRecord + Event |
| updateKnowledge(BrainEvent) | 先落 Event，再按 type 分发 |

---

## 5. Agent 调用规范

```text
任何 M-* / Council / Advisor 入口：
  1. resolve projectId → restaurantId（ensure）
  2. ctx = getRestaurantContext(restaurantId)
  3. system/prior 使用 ctx.priorBlock
  4. 输出 Decision 后 recordDecision / updateKnowledge
```

违规：Agent 包内 `prisma.brandProfile.update` 私写。

---

## 6. Event 驱动进化

`BrainEventType`：

- DECISION_CREATED / DECISION_COMPLETED  
- ACTION_COMPLETED  
- BUSINESS_CHANGED / CAPABILITY_CHANGED  
- USER_INSIGHT / AI_DISCOVERY / DNA_PATCH  
- （扩展）LEARNING_CREATED  

`updateKnowledge`：

1. insert BrainEvent  
2. switch type → 更新 Fact / 触发 pattern-detector  
3. recompute EvolutionState  

V1 Evolution = **规则**（`detectExpansionRiskPattern` 等），不上独立学习 Agent。

---

## 7. DeepCode 实现清单

| ID | 任务 |
|----|------|
| S1 | `RestaurantBrainService` Prisma 实现类 |
| S2 | tRPC `brain.getContext` / `brain.recordDecision` |
| S3 | `buildMKContext` 注入 `priorBlock` |
| S4 | 决策室归档 → `recordDecision` |
| S5 | 验证闭环 → actualOutcome + `learn` |
| S6 | 「我的餐厅」读 EvolutionState |

---

## 8. 验收句

进入系统建店 → Context 可读 → 问「要不要开新店」时 prior 含该店 Fact/历史 → 决策与结果写回 → 理解度变化。
