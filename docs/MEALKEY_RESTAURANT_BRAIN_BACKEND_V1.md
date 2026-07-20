# MealKey Restaurant Brain — 后端开发设计 V1（冻结）

> **状态：正式冻结（Freeze）— 可开发契约**  
> **日期：** 2026-07-18  
> **产品真源：** `docs/MEALKEY_RESTAURANT_BRAIN_V1.md`  
> **代码包：** `packages/restaurant-brain`（`@mealkey/restaurant-brain`）  
> **落库：** `apps/web/prisma`（`RestaurantBrain` / `RestaurantDnaEvent` / `DecisionMemory` / `ActionMemory` / `LearningMemory`）  
> **技术真源（DeepCode）：** `docs/MEALKEY_RESTAURANT_BRAIN_TECHNICAL_V1.md`  
> **原则：** Brain 不是 Agent、不是第七 Runtime；**SSOT**；所有 Agent **先读 Brain 再建议**。

---

## 1. 目标

把「成为最了解这家餐厅的人」落成可读写系统：

| 交付物 | 说明 |
|--------|------|
| Entity Contract | Brand/Business/Market/Organization/Founder DNA + Completeness |
| Prisma Schema | Brain 快照表 + DNA 事件表 + Decision Memory 表 |
| Memory Event | 对话/咨询/会议 → proposeDnaPatch |
| Decision Event | 重大决策 → DecisionMemory → 验证后 Learning |
| Agent Injection | `loadRestaurantBrain` → `RestaurantBrainContext` 注入 MKContext |
| Evolution Engine | 完整度重算 + Learning → DNA/Founder 校准（闸门后写） |

---

## 2. 包结构（冻结）

```text
packages/restaurant-brain/
├── src/
│   ├── domain/
│   │   ├── types.ts           # RestaurantProfile / DNA / DecisionRecord
│   │   ├── completeness.ts    # 完整度计算
│   │   └── empty.ts           # 空脑 / 薄启动
│   ├── events/
│   │   ├── memory-event.ts    # DnaPatchPropose
│   │   └── decision-event.ts  # DecisionMemoryUpsert / Validated
│   ├── injection/
│   │   └── context.ts         # RestaurantBrainContext + priorBlock
│   ├── evolution/
│   │   └── engine.ts          # mergePatch / applyLearning（纯函数 V1）
│   └── index.ts
├── package.json
└── tsconfig.json
```

Web 侧服务（下一步加深，不在本包内做 Prisma）：

```text
apps/web/src/server/restaurant-brain/
├── repository.ts      # Prisma 读写
├── projector.ts       # 从 profile/Memory/Intelligence 投影冷启动
├── service.ts         # load / propose / merge / dailyCognition
└── inject.ts          # 挂到 buildMKContext
```

---

## 3. Prisma Schema（V1）

### 3.1 RestaurantBrain

一项目一脑（多品牌用 `activeBrandId` + DNA 内品牌键区分）。

```prisma
model RestaurantBrain {
  id                    String   @id @default(cuid())
  projectId             String   @unique
  project               Project  @relation(...)
  ownerId               String
  displayName           String
  stage                 String   @default("unknown")
  activeBrandId         String?
  dnaJson               String   // RestaurantDNA JSON
  completenessOverall   Int      @default(0) // 0-100
  completenessJson      String   @default("{}")
  version               String   @default("v1")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  events                RestaurantDnaEvent[]
  decisionMemories      DecisionMemory[]

  @@index([ownerId])
}
```

### 3.2 RestaurantDnaEvent

所有 DNA 变更可审计（propose / merge / invalidate）。

```prisma
model RestaurantDnaEvent {
  id           String   @id @default(cuid())
  brainId      String
  brain        RestaurantBrain @relation(...)
  layer        String   // brand|business|market|organization|founder
  key          String
  op           String   // propose|merge|invalidate
  beforeJson   String?
  afterJson    String?
  confidence   Float    @default(0.4)
  source       String   // onboarding|consulting|meeting|decision|validation|conversation|import
  evidenceIds  String?  // JSON string[]
  accepted     Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([brainId, createdAt])
  @@index([layer, key])
}
```

### 3.3 DecisionMemory

灵魂层：不只记决策正文，记预期 / 选择 / 常委意见 / 结果 / 教训。

```prisma
model DecisionMemory {
  id                 String   @id @default(cuid())
  brainId            String
  brain              RestaurantBrain @relation(...)
  decisionId         String?  @unique  // 可挂现有 Decision
  question           String
  contextJson        String?  // 当时 Brain 摘要 + 上下文
  optionsJson        String?  // string[]
  chosenOption       String?
  councilOpinionJson String?
  expectedResult     String?
  actualResult       String?
  learning           String?
  status             String   @default("open") // open|executing|validated|archived
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([brainId, createdAt])
  @@index([status])
}
```

**与现有 `Decision` 关系：** Decision 仍是 MKDecision 主表；DecisionMemory 是 Brain 侧扩展。验证闭环写 `actualResult` + `learning`，并 emit Learning → Evolution。

---

## 4. Entity Contract（摘要）

完整 TypeScript 以 `@mealkey/restaurant-brain` 为准。字段对齐产品文档：

| 层 | 关键字段 |
|----|----------|
| BrandDNA | brandName, category, positioning, targetCustomer, consumptionScenario, priceRange, differentiation, competitiveSet, brandPromise, brandRisk |
| BusinessDNA | revenueModel, costStructure, grossMargin, laborModel, tableTurnover, customerValue, unitEconomics, expansionModel |
| MarketDNA | location, businessDistrict, competitors, customerTrend, trafficSource, marketOpportunity, threat |
| OrganizationDNA | teamSize, keyRoles, managementLevel, operationStandard, trainingSystem, executionAbility |
| FounderDNA | experience, decisionStyle, riskPreference, strength, weakness, blindSpot, growthHistory |
| DecisionRecord | decisionId, question, context, options, chosenOption, councilOpinion, expectedResult, actualResult, learning |

每个标量事实包一层：

```typescript
type DnaFact<T = unknown> = {
  value: T;
  confidence: number;
  source: DnaSource;
  evidenceIds?: string[];
  updatedAt: string;
};
```

---

## 5. Memory Event Contract

```typescript
type DnaPatchPropose = {
  kind: "dna_patch_propose";
  projectId: string;
  layer: DnaLayer;
  key: string;
  value: unknown;
  confidence: number;
  source: DnaSource;
  evidenceIds?: string[];
  at: string;
};
```

**闸门（冻结）：**

- `confidence < 0.45` → 只记 event，不 merge  
- `source === "conversation"` 且同 key 未重复 ≥2 次 → 不升完整度「深知」  
- `source === "validation" | "decision"` → 优先 merge  

---

## 6. Decision Event Contract

```typescript
type DecisionMemoryUpsert = {
  kind: "decision_memory_upsert";
  projectId: string;
  decisionId?: string;
  question: string;
  options?: string[];
  chosenOption?: string;
  councilOpinion?: unknown;
  expectedResult?: string;
  contextSummary?: string;
  at: string;
};

type DecisionMemoryValidated = {
  kind: "decision_memory_validated";
  decisionMemoryId: string;
  actualResult: string;
  learning: string;
  outcome: "confirmed" | "partial" | "invalidated";
  at: string;
};
```

---

## 7. Agent Context Injection（铁律）

```typescript
type RestaurantBrainContext = {
  version: "v1";
  restaurantId: string;
  displayName: string;
  completeness: DnaCompleteness;
  /** 短 prior，可直接进 prompt */
  priorBlock: string;
  /** 结构化 DNA（Agent 可读） */
  dna: RestaurantDNA;
  /** 最近决策记忆（≤5） */
  recentDecisions: DecisionRecord[];
  /** 未知层明示，禁止装懂 */
  unknowns: string[];
};
```

**铁律：**

```text
任何 Agent / Council / 决策室
  → loadRestaurantBrain(projectId)
  → 注入 RestaurantBrainContext
  → 再产生建议
```

禁止空 Brain 装深知；`unknowns` 必须进 prompt。

挂载点（工程）：`buildMKContext` 末尾调用 `attachRestaurantBrain(ctx)`；Founder 会议 `priorBlock` 优先用 Brain 版。

---

## 8. Evolution Engine（V1 纯函数）

```typescript
mergeDnaPatch(dna, patch, gate) → { dna, accepted, completeness }
applyLearning(dna, founderHints, validated) → { dna, founderPatches }
```

V1 **不做**静默改战略；只更新置信度、教训列表、完整度。Founder 风格校准与 User Intelligence Evolution 对齐，不双轨。

---

## 9. Daily Cognition（读模型）

```typescript
type DailyCognition = {
  date: string;
  completeness: DnaCompleteness;
  deltaToday: number;
  newInsight: string;      // 今日新增认知（1 条）
  todayAdvice?: string;    // 今日建议（可选 1 条）
  growthNote?: string;     // 如验证率 42%→67%
};
```

由 `RestaurantDnaEvent`（今日）+ DecisionMemory 验证统计投影；不是另写日报 Agent。

---

## 10. 实现顺序（工程切片）

| 序 | 切片 | 验收 |
|----|------|------|
| B0 | 包契约 + 空脑 + 完整度纯函数 | `npm --workspace @mealkey/restaurant-brain run typecheck` |
| B1 | Prisma 三表 + Project 关系 | `db push` / migrate |
| B2 | projector：从 profile 冷启动 Brain | 老项目打开即有薄 DNA |
| B3 | repository + propose/merge | 事件可审计 |
| B4 | inject → buildMKContext | Agent prior 含 Brain |
| B5 | DecisionMemory 挂钩验证 | 验证后 learning 回写 |
| B6 | Daily Cognition API + 「我的餐厅」UI | 完整度 + 今日新增 |

---

## 11. 非目标（V1）

- 不做自动爬取竞品全网  
- 不做强制财务 ERP 接入  
- 不把 Brain 做成聊天 Bot  
- 不新增 M-BRAIN 顾问席  

---

## 12. 验收句

1. 新项目：薄启动后 Brain 存在，`unknowns` 非空。  
2. 咨询签字：Brand DNA 字段置信度上升，完整度可解释增加。  
3. 决策验证失败：DecisionMemory.learning 非空，同类问题 prior 能召回。  
4. Agent 调用：无 `RestaurantBrainContext` 不得进入「深知口吻」。  
