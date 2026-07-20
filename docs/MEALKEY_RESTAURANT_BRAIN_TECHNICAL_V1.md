# Restaurant Brain V1 — 后端开发技术文档（冻结）

> **状态：正式冻结（Freeze）— DeepCode / 工程实现真源**  
> **日期：** 2026-07-18  
> **产品：** `docs/MEALKEY_RESTAURANT_BRAIN_V1.md`  
> **后端设计：** `docs/MEALKEY_RESTAURANT_BRAIN_BACKEND_V1.md`  
> **代码契约：** `packages/restaurant-brain`（`@mealkey/restaurant-brain`）  
> **落库：** `apps/web/prisma`  

---

## 0. 冻结原则（SSOT）

> **Restaurant Brain 是 MealKey 的唯一业务事实来源（Single Source of Truth）。**

| 允许 | 禁止 |
|------|------|
| Agent **读取** Brain Context | Agent **私存**业务事实（营收、定位、能力分等） |
| Agent 产生 Decision / 建议 | Agent 绕过 Brain 直接写 Project.profile 当真相 |
| 经 Memory API **写回** Brain | 七常委 / M-EXEC 各维护一份平行档案 |

流程（冻结）：

```text
用户问题
    ↓
Restaurant Brain.loadContext
    ↓
生成 RestaurantBrainContext（priorBlock）
    ↓
Agent / Council
    ↓
Decision +（可选）Action
    ↓
Memory API 写回 Decision / Action / Learning
    ↓
Evolution Engine 更新理解度
```

---

## 1. 核心实体总览

```text
Restaurant Brain
├── Restaurant Profile      ← 身份
├── Business Context        ← 经营数字
├── Capability Profile      ← 经营者能力
├── Restaurant DNA（五层）  ← 定性认知
├── Decision Memory         ← 决策记忆（核心资产）
├── Action Memory           ← 执行记忆（M-EXEC）
├── Learning Memory         ← 学习记忆
└── Evolution State         ← 进化状态
```

TypeScript 真源：`packages/restaurant-brain/src/domain/types.ts`

---

## 2. Entity Contract（字段冻结）

### 2.1 RestaurantProfile

| 字段 | 类型 | 说明 |
|------|------|------|
| id / restaurantId / projectId | string | V1 三者对齐 projectId |
| ownerId | string | |
| name | string | 展示名 |
| brandName | string | 品牌 |
| category | string? | 品类 |
| stage | idea\|opening\|growth\|mature\|expansion\|unknown | |
| location | string? | 城市/区位 |
| storeCount | number? | 门店数 |
| createdAt / updatedAt | ISO | |

### 2.2 BusinessContext

| 字段 | 类型 |
|------|------|
| revenue / profit / grossMargin / laborCost / rentCost / foodCost | number? |
| avgTicket / dailyOrders / tableTurnover | number? |
| source | manual\|pos\|meituan\|eleme\|finance\|unknown |
| updatedAt | ISO |

V1：**允许人工输入**；未来接 POS / 美团 / 饿了么 / 财务。

### 2.3 CapabilityProfile

| 字段 | 范围 |
|------|------|
| strategic / market / product / financial / operation / organization Capability | 0–100 |
| overallScore | 0–100 |
| confidence | 0–1 |
| bottleneck | string? |

与 User Intelligence Evolution / Growth 八维：**投影兼容，不双写真相**。Brain Capability 为 Agent 注入主读；Growth 可作计算源。

### 2.4 Restaurant DNA（五层 · DnaFact 包装）

Brand / Business / Market / Organization / Founder — 见 `types.ts`。  
每个事实：`{ value, confidence, source, evidenceIds?, updatedAt }`。

### 2.5 DecisionMemory

| 字段 | 说明 |
|------|------|
| question | 是否开第二家店？ |
| options / chosen / reason | 选项与老板选择 |
| aiAssessment | AI 当时判断 |
| expectedOutcome / actualOutcome | 预期 vs 实际 |
| learning | 教训 |
| status | open\|executing\|validated\|archived |

### 2.6 ActionMemory

decisionId → action / owner / deadline / status / result

### 2.7 LearningMemory

sourceType / sourceId / pattern / insight / confidence / appliedCount

例：`pattern = high_action_bias`，`insight = 先行动后验证导致成功率下降`

### 2.8 EvolutionState

| 字段 | 说明 |
|------|------|
| restaurantUnderstandingScore | 理解度 0–100 |
| dataCompleteness | DNA 完整度 |
| decisionCount / learningCount / actionCount | 计数 |
| lastEvolutionTime | ISO |

---

## 3. Prisma Schema（已挂）

| 表 | 用途 |
|----|------|
| `RestaurantBrain` | 身份壳 + dnaJson + businessContextJson + capabilityJson + evolutionJson |
| `RestaurantDnaEvent` | DNA 变更审计 |
| `DecisionMemory` | 决策记忆 |
| `ActionMemory` | 执行记忆 |
| `LearningMemory` | 学习记忆 |

实现注意：

- JSON 列存结构化契约；**对外 API 只暴露 TS 类型，不暴露裸 JSON**  
- `projectId` 唯一；删除 Project 级联删 Brain  

---

## 4. API 契约（接口冻结）

### 4.1 Memory API

`packages/restaurant-brain/src/api/memory-api.ts` → `RestaurantBrainMemoryApi`

必须实现：

- `ensureBrain` / `getSnapshot`  
- `updateProfile`  
- `upsertBusinessContext` / `upsertCapabilityProfile`  
- `proposeDnaPatch`  
- `upsertDecisionMemory` / `validateDecisionMemory`  
- `createActionMemory` / `completeActionMemory`  
- `createLearningMemory`  

### 4.2 Context API

`packages/restaurant-brain/src/api/context-api.ts` → `RestaurantBrainContextApi`

- `loadContext` → `RestaurantBrainContext`（含 `priorBlock` + `unknowns`）  
- `loadPriorBlock`  

**所有 Agent 入口必须先调 `loadContext`。**

### 4.3 Evolution Engine

`packages/restaurant-brain/src/evolution/interface.ts` → `EvolutionEngine`

已有纯函数：

- `mergeDnaPatch`  
- `applyLearning`  
- `recomputeEvolution`  

---

## 5. Context Injection 示例

老板问：「我要不要开第四家店？」

`priorBlock` 必须能覆盖类似信息（有则写、无则进 unknowns）：

```text
品牌：湘菜 · 3 店 · 上海
利润：8%
组织能力：55
决策记忆：过去扩张失败 1 次
老板风险偏好：激进
未知：现金流细节…
```

然后七常委基于此判断——**不是通用知识空谈**。

---

## 6. Web 实现落点（给 DeepCode）

```text
apps/web/src/server/restaurant-brain/
├── service.ts          # 已有：ensure / loadContext / proposeMerge
├── repository.ts       # 建议：Prisma 封装 MemoryApi
├── memory-api.impl.ts  # 实现 RestaurantBrainMemoryApi
├── context-api.impl.ts # 实现 RestaurantBrainContextApi
└── inject.ts           # buildMKContext 末尾 attachRestaurantBrain
```

挂载：

```typescript
// chief-agent.factory.ts buildMKContext 末尾
const brain = await loadRestaurantBrainContext(prisma, { projectId, ownerId: userId });
// 将 brain.priorBlock 并入 knowledge / system 摘要
```

---

## 7. 实现切片（DeepCode 顺序）

| ID | 任务 | 验收 |
|----|------|------|
| T1 | `prisma generate` + `db push`（停 Next 后） | 五表可用 |
| T2 | `RestaurantBrainMemoryApi` 完整实现 | 单测覆盖 upsert/validate |
| T3 | `RestaurantBrainContextApi` + inject MKContext | Agent prior 含 Brain |
| T4 | Decision 归档时写 DecisionMemory | 字段齐全 |
| T5 | M-EXEC 完成时写 ActionMemory + 可选 Learning | 闭环 |
| T6 | Daily /「我的餐厅」读 EvolutionState | 理解度 + 今日认知 |

---

## 8. 非目标

- 不在本阶段新建 Agent  
- 不强制接 POS  
- 不把 Brain 做成聊天 Bot  
- 不新增 M-BRAIN 席位  

---

## 9. 验收句（契约级）

1. **SSOT：** 代码检索不得在 Agent 包内新增「营收/定位」私有持久化。  
2. **空脑：** `unknowns.length > 0` 且 prior 含「禁止装懂」。  
3. **决策记忆：** 验证失败后 `learning` 非空，再次同类问题 prior 召回。  
4. **注入：** 无 `loadContext` 的 Agent 路径视为不合格。  

---

## 10. 包导出清单

```text
@mealkey/restaurant-brain
  domain types / empty / completeness
  events: DnaPatchPropose, DecisionMemoryUpsert, DecisionMemoryValidated
  api: RestaurantBrainMemoryApi, RestaurantBrainContextApi
  injection: toBrainContext, buildPriorBlock
  evolution: mergeDnaPatch, applyLearning, recomputeEvolution, EvolutionEngine
```

**本文件 + `packages/restaurant-brain` = DeepCode 实现输入。改字段先改本契约，再改库与实现。**
