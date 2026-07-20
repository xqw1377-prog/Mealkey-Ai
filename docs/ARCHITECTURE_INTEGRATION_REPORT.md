# Restaurant Brain V1 — Architecture Integration Report

> 状态：只读架构适配分析（Cursor 本地执行前置）  
> 日期：2026-07-18  
> 范围：`MealKey Agent` monorepo · **未改任何业务代码**  
> 目的：确定 Restaurant Brain 如何嵌入现有系统，而非另起架构

---

## 0. 结论（先读）

| 问题 | 结论 |
|------|------|
| Brain 放哪？ | **保持 `packages/restaurant-brain`（方案 B 已落地）**；**不要**迁入 `mealkey-core/src/brain/`，**不要**放进 `agents/` |
| Prisma 放哪？ | **继续 `apps/web/prisma/`**；packages 不持有 schema |
| 实现放哪？ | **`apps/web/src/server/restaurant-brain/`** 做 repository/service；包内只放契约与纯函数 |
| V1 缺口是什么？ | **接线与闭环**，不是再选家：`buildMKContext` 未注入 Brain；决策路径未稳定写回 `DecisionRecord`；无专用 tRPC |
| 与现有 Memory / Decision 关系 | **正交叠加**：Brain = 餐厅事实 SSOT；`Memory` 表 / Founder Memory = 对话与会议记忆；Prisma `Decision` = 产品决策对象；`DecisionRecord` = Brain 侧决策记忆（可挂 `mkDecisionId`） |

冻结文与代码现状一致：**独立契约包 + web Prisma 规范化表**。后续 Cursor 指令应围绕「嵌入主路径」，禁止重建平行档案系统。

---

## 1. 当前 monorepo 目录结构

**Workspaces：** `apps/*` · `packages/*`（npm + Turbo）

```
MealKey Agent/
├── apps/
│   └── web/                 # 唯一应用：Next.js + tRPC + Prisma + Founder Layer
├── packages/
│   ├── agent-sdk/           # @mealkey/agent-sdk — 冻结协议
│   ├── agent-runtime/       # @mealkey/agent-runtime — Agent OS 内核
│   ├── mealkey-core/        # @mealkey/core — ChiefAgent / Cognition / Project OS
│   ├── agents/              # @mealkey/agents — Launch / M-PNT / consulting-os / founder-os
│   ├── memory-engine/       # @mealkey/memory-engine — 存储无关记忆引擎
│   ├── knowledge-engine/    # @mealkey/knowledge-engine
│   └── restaurant-brain/    # @mealkey/restaurant-brain — 餐厅认知契约（已存在）
├── agents/                  # Python 垂直引擎（m-mkt / m-biz / m-ed / m-pnt）
├── docs/                    # AUTHORITY + Brain / Council / Memory 冻结文
├── founder-os/              # YAML / 角色 / 场景资产（非 npm workspace）
├── tests/ · scripts/ · .github/
```

---

## 2. agent-sdk / agent-runtime / mealkey-core / agents 关系

### 2.1 职责

| 包 | 拥有 |
|----|------|
| **agent-sdk** | `MKContext` · `MKDecision` · Protocol3 `MemoryEngine` 接口 · `Mission` · `AgentRun`；零业务依赖 |
| **agent-runtime** | `AgentRuntime` · Workflow · MissionRouter · Registry · LLM adapter |
| **mealkey-core** | ChiefAgent · Cognition · Project OS · Knowledge 封装 · re-export MemoryEngine |
| **agents** | 产品 Agent / consulting-os / founder-os 纯函数（**不依赖 core/runtime**） |

### 2.2 依赖方向（以 package.json 为准）

```text
              @mealkey/agent-sdk
             /        |         \
    agent-runtime  mealkey-core   agents
         |              |            |
         |        memory-engine      |
         |        knowledge-engine   |
         +----------+---+------------+
                    |
                 apps/web  ──→  restaurant-brain
```

**事实：** `apps/web` 是编排中枢（拼装 Core + Agents + Prisma）。  
**注意：** `docs/ARCHITECTURE.md` 若画成 `agents → runtime/core`，与当前依赖图不符；集成以 `package.json` 为准。

### 2.3 对 Brain 的含义

- Brain **不是 Agent** → 禁止进 `packages/agents`
- Brain **不是判断引擎** → 不必并入 `mealkey-core`（core 已是 Chief + Cognition）
- Brain **是事实 SSOT 契约** → 与 `memory-engine` / `knowledge-engine` 同模式：包内纯逻辑，持久化在 web

---

## 3. Prisma schema 位置

| 文件 | 角色 |
|------|------|
| `apps/web/prisma/schema.prisma` | **活动 schema**（当前 sqlite） |
| `apps/web/prisma/schema.postgresql.prisma` | PG 变体 |
| `apps/web/prisma/schema.sqlite.prisma` | SQLite 对照 |
| `apps/web/src/generated/prisma/` | `prisma generate` 输出 |

客户端入口：`apps/web/src/lib/prisma.ts` → `@/generated/prisma`。  
**packages 无 Prisma schema。**

---

## 4. Memory 系统实现位置

### 4.1 包级

| 路径 | 内容 |
|------|------|
| `packages/memory-engine/src/engine.ts` | `MemoryEngine` class |
| `packages/mealkey-core/src/memory/index.ts` | re-export |
| `packages/agent-sdk/src/types/protocols.ts` | Protocol 3 接口 |

### 4.2 Web / Founder

| 路径 | 角色 |
|------|------|
| Prisma `Memory` | Kernel 层记忆表 |
| `apps/web/src/server/services/agent-os.service.ts` | `saveMemory` 等落库 |
| `apps/web/src/server/services/chief-agent.factory.ts` | Prisma MemoryStore → ChiefAgent |
| `apps/web/src/server/founder-layer/memory/` | Founder Memory Engine |
| `apps/web/src/server/routers/memory.ts` · `memory-runtime.ts` | tRPC |

### 4.3 与 Brain 的边界

| 系统 | 存什么 |
|------|--------|
| Memory / Founder Memory | 对话提取、会议 prior、OWNER/PROJECT/DECISION/LEARNING 层 |
| Restaurant Brain | 餐厅是谁、发生了什么、决定了什么、学到了什么（Fact≠Answer） |

**V1 不做统一存储合并**；只做 **读路径注入 + 决策回写链接**（`DecisionRecord.mkDecisionId` → Prisma `Decision`）。

同名警惕：`packages/agents/src/founder-os/decision-memory.ts`（会议纯函数）≠ Prisma `DecisionRecord`。

---

## 5. Decision / Mission / AgentRun 数据模型

### 5.1 Prisma（`apps/web/prisma/schema.prisma`）

| 模型 | 对齐 |
|------|------|
| `Decision` · `DecisionEvent` | 产品决策对象 / 事件流 |
| `Mission` | Protocol 6 |
| `AgentRun` | Protocol 7 |
| `CognitiveSession` / Trace / Evidence… | 认知附属 |
| **Brain：** `Restaurant` · Profiles · `DecisionRecord` · `ActionRecord` · `BrainLearning` · `BrainEvent` · `EvolutionState` | Fact≠Decision 规范化表族（已落地） |

> 注：学习表名为 `BrainLearning`，避免与既有 cognition `LearningRecord` 冲突。

### 5.2 TS 协议

| 类型 | 路径 | 备注 |
|------|------|------|
| `MKContext` / `MKDecision` / `Mission` / `AgentRun` | `packages/agent-sdk/src/types/protocols.ts` | Agent 统一 I/O |
| Founder Runtime `MKDecision` | `apps/web/src/server/founder-layer/contracts/mk-decision.ts` | **另一形状**（状态机/opinions） |
| FounderMission / MemorySnapshot | `.../contracts/mission.ts` | |

集成时必须写清映射：Brain `DecisionRecord` → Prisma `Decision` →（可选）Runtime MKDecision 投影。

---

## 6. tRPC / API 入口

| 项 | 路径 |
|----|------|
| HTTP tRPC | `apps/web/src/app/api/trpc/[trpc]/route.ts` |
| 根 router | `apps/web/src/server/index.ts` → `appRouter` |
| 子 router | `apps/web/src/server/routers/` |

**Agent 主路径（非全走 tRPC）：**

```text
POST /api/agent/stream
  → apps/web/src/app/api/agent/stream/route.ts
  → streamAgentResponse()  …/services/agent.service.ts
      → buildMKContext()     …/services/chief-agent.factory.ts
      → 意图路由：m-mkt / m-pnt / m-biz / m-ed / chief
```

**接线状态：** `restaurantBrain.*` tRPC 已挂载；`buildMKContext` 注入 `restaurantContext`；产品页 `/projects/[id]/restaurant`。

---

## 7. Restaurant Brain 已落地 vs 缺口

### 已有

- 包：`packages/restaurant-brain`（类型、completeness、context-builder、evolution、Service **接口**）
- Prisma 规范化表族（见 §5.1）
- Web 骨架：`apps/web/src/server/restaurant-brain/service.ts`（`ensureRestaurantBrain` · `loadRestaurantBrainContext` · DNA merge 等）
- 测试：`apps/web/tests/restaurant-brain.test.ts`
- 文档：`docs/MEALKEY_RESTAURANT_BRAIN_*.md` + `AUTHORITY.md` §13–17

### 已接线（2026-07-18 Cursor 实现）

1. `buildMKContext` 注入 `restaurantContext` + prior 记忆  
2. `createDecision` → `DecisionRecord` + `BrainEvent`（`mkDecisionId` 关联）  
3. `PrismaRestaurantBrainService`（web）：loadContext / recordDecision / recordEvent / recordLearning  
4. Chief / M-PNT prompt 与 agent stream 共享 priorBlock  
5. tRPC `restaurantBrain.*` + 页面 `/projects/[id]/restaurant`（我的餐厅 / 黄金场景种子）  
6. 定位/六步咨询 finalize → `syncBrandFactsToRestaurantBrain`（DNA patch，非聊天抽取）  
7. M-BIZ / M-MKT `confirmAgentStrategy` → `syncBusinessFacts` / `syncMarketFacts`  

### 产品主线切换（2026-07-18）

Brain 接线 V1 已够用。**下一工程主线 = Decision Center**（`docs/MEALKEY_DECISION_CENTER_V1.md`）：收口 `/dashboard` 为「今日经营决策」，不再扩 Brain Schema。

### 仍可后置（Brain）

1. M-ED 组织/股权事实薄写（若有结构化 intake）  
2. Council 签字专用写回细调（主路径已走 `createDecision`）  
3. 本机停 Next 后 `prisma generate`（DLL EPERM）

---

## 8. 模块落点裁决（方案 A / B / C）

| 方案 | 位置 | 裁决 |
|------|------|------|
| **A** | `packages/mealkey-core/src/brain/` | **否（现阶段）** — 会膨胀 core；agents 当前不依赖 core；与已冻结「独立包」冲突 |
| **B** | `packages/restaurant-brain` | **是 — 保持**；与 memory/knowledge 包模式一致；商业化边界清晰 |
| **C** | `packages/agents` | **否** — Brain 不是 Agent |

**倾向说明：** 产品叙事上 Brain 属于 Core Intelligence Layer；工程上「核心」= **协议 + web 编排注入**，不等于必须物理目录进 `mealkey-core`。若未来强合并，应单独立项迁移，**不作为 V1 闭环前置**。

---

## 9. V1 收敛：先跑通 5 实体闭环（执行约束）

设计文档含 Brand/Business/Founder 全量 Profile；**Cursor 执行 V1 先收敛**：

| # | 实体 | V1 用法 |
|---|------|---------|
| 1 | `Restaurant` | 餐厅主体（1:1 `projectId`） |
| 2 | RestaurantContext（快照） | `buildRestaurantContext` / `AgentRestaurantContext` 出口，可先由已有 Profile JSON 投影 |
| 3 | `DecisionRecord` | 决策记忆 |
| 4 | `BrainLearning` | 学习（代码表名；语义 = LearningRecord） |
| 5 | `BrainEvent` | 事件流 |

**暂缓加深：** Brand/Business/Founder Profile 复杂建模、Evolution 自动合并、行业池、新 Agent。

**第一可验证场景：**

```text
老板：「我要不要开第二家店？」
  → stream / consulting / council 任一主路径
  → 读 Restaurant Brain 上下文（注入 MKContext）
  → M-PNT/M-BIZ/七常委既有能力分析
  → 输出决策
  → 写 DecisionRecord（+ 可选 mkDecisionId）
  → 可复盘
```

---

## 10. 推荐嵌入点（给下一条 Cursor 指令用）

按优先级，**只接线、不造轮子**：

1. **读注入：** `chief-agent.factory.ts` → `buildMKContextFromOwner` 末尾调用 `loadRestaurantBrainContext`，写入 MKContext 约定字段或 priorBlock  
2. **写回：** Decision 归档 / `decisionRuntime` / Council 签字成功处 → `DecisionRecord` + `BrainEvent`  
3. **服务对齐：** 将 `service.ts` 函数式骨架收敛为 `RestaurantBrainService` 四方法实现（仍在 web）  
4. **验证：** 单测 + 一条手测脚本/场景：「第二家店」→ 能读到 Brain、能落 DecisionRecord  
5. **UI（可后置）：** 「我的餐厅」只读页挂薄 tRPC

禁止：

- 新建平行 `RestaurantBrain` JSON 大表替代规范化表  
- 在 agents 内私存餐厅档案  
- 把 Brain 做成第七 Runtime 或新顾问席  
- 一次性实现全部 Profile 演进

---

## 11. 同名多义清单（接线必读）

1. sdk `MKDecision` ≠ Founder Runtime `MKDecision`  
2. Prisma `Decision` ≠ Brain `DecisionRecord` ≠ founder-os `DecisionMemory`  
3. `@mealkey/memory-engine` ≠ Protocol3 接口 ≠ `founder-layer/memory/engine.ts`  
4. Brain `FounderProfile` 表 ≠ User Intelligence 侧画像

---

## 12. 下一步（Cursor 执行版指令草稿）

架构扫描已完成。下一条建议指令：

```text
基于 docs/ARCHITECTURE_INTEGRATION_REPORT.md：

1. 保持 packages/restaurant-brain + apps/web Prisma，不迁 mealkey-core。
2. 只做 V1 闭环接线：
   - buildMKContext 注入 AgentRestaurantContext
   - 决策成功路径写 DecisionRecord + BrainEvent
3. 场景验收：「要不要开第二家店？」可读 Brain、可落库、可复盘查询。
4. 不扩 Profile 建模，不加新 Agent，不改 AUTHORITY 产品语义。
5. 改完给出：改动文件列表 + 如何手测。
```

---

**一句话：** Restaurant Brain 的家已经选对（`@mealkey/restaurant-brain` + web Prisma）；MealKey 从「咨询工具」升级为「经营操作系统」的工程工作，是把 Brain **挂进 `buildMKContext` 与决策回写**，而不是再写一套架构。
