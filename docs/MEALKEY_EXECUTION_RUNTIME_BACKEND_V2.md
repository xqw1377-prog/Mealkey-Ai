# MealKey Execution Runtime（M-EXEC）后端设计 V2（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-17  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上游：** `docs/MEALKEY_DECISION_RUNTIME_BACKEND_V1.md`（决定什么）  
> **代码路径摘要：** `docs/M_EXEC_EXECUTION_RUNTIME_V2_DEEPCODE.md`  
> **冲突裁决：** M-EXEC **不是**第五 Expert；无判断权

---

## 一、核心定位

> **Decision Runtime 解决「决定什么」；Execution Runtime 解决「怎么把决定变成结果」。**

相对角色：

| 角色 | 职责 |
|------|------|
| 四席 Expert | 判断权 |
| 七常委 | 裁决 / 合法化 |
| **Decision Runtime** | 登记与追踪 MKDecision |
| **M-EXEC（本层）** | **战略执行操作系统**（流程权） |
| 工具 Agent | 执行权（产出物） |

**不是：** 任务 Todo App · 专业顾问席 · ERP/POS。

**传统断裂：** 决策有了 → 执行靠人记 → 不知有效还是忙碌 → 无法复盘。

**MealKey 闭环：**

```
MKDecision (APPROVED)
    ↓
Execution Runtime（拆行动 · 验证 · 监控偏差）
    ↓
Result
    ↓
Decision → LEARNED · Memory · Growth
```

---

## 二、核心对象模型

M-EXEC 不管理聊天，管理 **执行实体**。

### 2.1 `DecisionExecution`（读模型）

```typescript
interface DecisionExecution {
  id: string;
  decisionId: string; // ≡ Prisma Decision.id
  projectId: string;
  objective: string; // 来自 MKDecision.conclusion / hypothesis
  status: "planned" | "running" | "at_risk" | "done" | "validated";
  actionPlanId?: string;
  validationTaskIds: string[];
  progress: { done: number; total: number };
  lastDeviation?: DeviationReport | null;
  suggestedNextMeeting?: { topic: string; reason: string } | null;
  summary: string;
}
```

### 2.2 `ActionPlan`

```typescript
interface ActionPlan {
  planId: string;
  decisionId: string; // 铁律：Prisma id，禁止 packId
  goals: string[];
  actions: Array<{
    actionId: string;
    title: string;
    owner?: string;
    status: "planned" | "doing" | "blocked" | "done";
    dueInDays?: number;
  }>;
  validationTaskId?: string;
  summary: string;
  createdAt: string;
}
```

### 2.3 `ValidationTask`

复用 Validation OS 契约（`contracts/validation.ts`）。  
必填：`decisionId`、`hypothesis`、指标、lifecycle。

### 2.4 `DeviationReport`

```typescript
interface DeviationReport {
  reportId: string;
  projectId: string;
  decisionId: string;
  validationTaskId?: string;
  kind: "metric_miss" | "strategy_mismatch" | "time_slip" | "evidence_invalidated";
  severity: "low" | "medium" | "high";
  summary: string;
  suggestedCouncilTopic: string; // 建议复会，不得自行改战略
  suggestCommittee?: "brand" | "market" | "business" | "capital" | "council";
  createdAt: string;
}
```

示例输入决策：「打造年轻化湘菜品牌」→ Plan：定位验证 · 产品测试 · 价格测试；指标：30 天复购率、毛利率。

---

## 三、执行生命周期（与 Decision 咬合）

```
Decision.APPROVED
       ↓
  createExecutionFromDecision
       ↓
Decision.EXECUTING  ←→  Action: planned/doing/blocked/done
       ↓
Decision.VALIDATING ←→  Validation: RUNNING…
       ↓
ValidationCompleted
       ↓
Decision.LEARNED (+ Memory)
```

| Decision 状态 | Execution 允许 |
|---------------|----------------|
| DRAFT / ANALYSIS / COUNCIL_REVIEW | **拒绝**建 Plan / 调 L3 |
| APPROVED | 可 `createExecution` → EXECUTING |
| EXECUTING | 勾选 Action、开 Validation |
| VALIDATING | 打卡、偏航检测 |
| LEARNED / ARCHIVED | 只读；rebuild 需新决策或明确授权 |

---

## 四、三大核心引擎

### 4.1 Action Engine — 行动管理

```
Created/planned → Running/doing → Blocked → Completed/done
```

- 把 conclusion/hypothesis 拆成 **可执行** 标题（Brief 恰好 3 条，去战略空话）  
- 持久化：`profile.lastActionPlan`  
- 勾选：`dashboard.toggleTodayAction` + `action-lifecycle.ts`

### 4.2 Validation Engine — 假设验证

问：**有效吗？** 不是「做完了吗？」

```
假设 → 指标/样本 → aligned | partial | off
                 → impact confirmed | partial | invalidated
```

真相源：`validationOs.*`。完成后必须通知 Decision Runtime → `LEARNED`。

### 4.3 Deviation Engine — 偏差检测

```
计划 vs 实际 → 延迟 | 偏离 | 假执行
```

例：计划 60 天开店 / 实际 90 天 → **执行偏差**（未必战略错误）→ 继续或建议复会。  
假设证伪且要改方向 → **停手** → 七常委 / 复会（权限模型），引擎不改定位。

代码：`monitor.ts` · `feedback.ts`。

---

## 五、Event System（与 Decision 总线）

| Event | 生产者 | 消费者 |
|-------|--------|--------|
| `DecisionApproved` | Decision | **本层**可建 Plan |
| `ExecutionStarted` | Action Engine | Decision→EXECUTING；Brief |
| `ActionStatusChanged` | Action Engine | Monitor |
| `ValidationStarted` | Validation | Decision→VALIDATING |
| `ValidationCompleted` | Validation OS | Decision LEARNED；Growth；Memory |
| `DeviationDetected` | Deviation | 复会 CTA；日后 Risk |
| `ToolInvocationAuthorized` | Execution | L3 |
| `ToolResultWritten` | L3 | Memory / 证据 |

---

## 六、持久化设计（V2）

| 逻辑对象 | V2 落点 |
|----------|---------|
| DecisionExecution | **投影**自 profile + Decision.outcome（不新建主表） |
| ActionPlan | `profile.lastActionPlan` |
| ValidationTask | `profile.validationTasks` |
| DeviationReport | `profile.lastDeviationReport` / 列表 |
| Events | 可写 `DecisionEvent`（同 decisionId）或执行侧日志 |

**冻结：** V2 **不新建** Prisma 执行主表；不建 Python `agents/m-exec`。

---

## 七、与现有系统连接

```
四席 / 常委 → Decision Runtime → MKDecision(APPROVED)
                                      ↓
                              Execution Runtime
                         ┌───────┼───────┐
                      Action  Validation  Deviation
                         └───────┼───────┘
                                      ↓
                         Tool Agents（授权后）
                                      ↓
                              Result → Memory / Growth
```

| API（现网） | 用途 |
|-------------|------|
| `executionRuntime.getDecisionExecution` | 读模型 |
| `executionRuntime.runDeviationCheck` | 偏航写回 |
| `executionRuntime.listDeviations` | 列表 |
| `validationOs.*` | 验证生命周期 |
| `dashboard.toggleTodayAction` | 动作勾选 |

---

## 八、第一版实现范围（V2）

### 必须

- ✅ 三引擎边界 + 与 Decision 状态咬合（设计）  
- ✅ 读模型 / 偏航 / 动作生命周期（代码已有骨架）  
- [ ] `createExecutionFromDecision(decisionId)` 硬门禁 APPROVED  
- [ ] decisionId = Prisma id（拒 packId）  
- [ ] ValidationCompleted → Decision.markLearned + Memory  
- [ ] Brief/决策页可感知 DeviationReport  

### 暂时不做

- ❌ 自动经营数据采集 / ERP / POS  
- ❌ 全自动判定开店成败  
- ❌ FounderAgentName = M-EXEC  
- ❌ 工具越权改品类  

---

## 九、工程切片（E1–E5）

| 序 | 切片 | 验收 |
|----|------|------|
| E1 | `createExecutionFromDecision` | 非 APPROVED 抛错；写 ExecutionStarted |
| E2 | 外键铁律单测 | packId 拒绝 |
| E3 | ValidationCompleted → markLearned | status LEARNED + Memory |
| E4 | Deviation 可展示 | UI 或 API 字段进 Brief |
| E5 | rebuildActionPlan | ✅ `rebuildActionPlan` + tRPC `executionRuntime.rebuildActionPlan` |

---

## 十、最终架构关系（冻结）

```
              Founder OS
                  │
          Decision Runtime
                  │
             MKDecision
                  │
         Execution Runtime (M-EXEC)
         Action · Validation · Deviation
                  │
            Tool Agent Layer
                  │
               Result
                  │
          Memory / Growth
```

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V2-code | 2026-07-17 | DEEPCODE 代码落地 |
| V2-backend-freeze | 2026-07-17 | 初冻三引擎与交接 |
| V2-backend-final | 2026-07-17 | 对齐 Decision 同级结构：对象/生命周期/Event/持久化/范围 |
