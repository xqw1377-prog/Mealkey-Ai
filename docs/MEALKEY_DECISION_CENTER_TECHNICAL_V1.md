# MealKey Decision Center Technical V1（技术架构 · 冻结）

> **状态：正式冻结（Freeze）— 入口产品的后端/契约层**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级产品：** `docs/MEALKEY_DECISION_CENTER_V1.md`  
> **配套 Runtime：** `docs/MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` · Execution V2 · Restaurant Brain Entity  
> **冲突裁决：** Decision Center **不是**第七 Runtime；**不**新建平行 Decision 大表；**复用** Prisma `Decision` + `outcome.mkStatus` + Brain `DecisionRecord` + `dashboard.getHome`。

---

## 〇、技术定位（一句话）

> Decision Center = **每日经营晨会的编排层**：把 Risk / Opportunity / Brain / Council / Execution 投影成老板可点的决策卡片与决策空间，底层实体仍是 MKDecision。

```text
产品感知：经营晨会 / 今日经营决策
编排层：  Daily Scan + Decision Card + Pipeline
实体层：  MKDecision（Prisma Decision）
深度层：  Restaurant Brain（证据 + 档案）
过程层：  七常委 Council
执行层：  M-EXEC / Execution Runtime
```

---

## 一、Decision Object（数据模型 · 冻结）

### 1.1 唯一持久决策实体

| 角色 | 真源 | 禁止 |
|------|------|------|
| **规范对象** | Founder `MKDecision` · `apps/web/src/server/founder-layer/contracts/mk-decision.ts` | 另造 `DecisionCenterDecision` 表 |
| **持久行** | Prisma `Decision` · `id ≡ MKDecision.id` | 用 packId / 临时 id 当主键 |
| **状态** | `Decision.outcome` JSON 内 **`mkStatus`** | 新建 `Decision.status` 列（V1） |
| **事件** | Prisma `DecisionEvent` | 平行 event 总线 |
| **餐厅档案侧** | Brain `DecisionRecord.mkDecisionId → Decision.id` | 把 Brain 当主决策表 |

### 1.2 MKDecision 核心字段（复用，不扩表）

```typescript
// 真源：founder-layer/contracts/mk-decision.ts
type MKDecision = {
  id: string;              // ≡ Prisma Decision.id
  projectId: string;
  ownerId: string;
  title: string;           // 老板语言问题，如「是否调整晚餐套餐？」
  description: string;
  hypothesis?: string;
  conclusion: string;      // 决策结论
  status: MKDecisionStatus;
  source: MKDecisionSource;
  opinions: DecisionOpinion[];
  council?: CouncilDecision;
  evidence: MKEvidence[];
  outcome: { /* 含 actionPlanId / validationTask / review 等 */ };
  // ...
};
```

Prisma 判断链字段（`problem` / `observation` / `diagnosis` / `judgement` / `strategy` / `action` / `confidence` / `evidence`）继续作为 Agent 协议投影源；入口产品优先展示 **title / conclusion / evidence / council / status**。

### 1.3 Decision Center 只增加**投影类型**（非新表）

见 §三 Decision Card Schema、§二 Lifecycle。投影可放：

- `apps/web/src/server/founder-layer/contracts/decision-center.ts`（新建契约文件，V1 允许）
- 或 `dashboard.service.ts` 内导出 DTO（实现切片 D1）

---

## 二、Decision Lifecycle（状态机 · 冻结）

### 2.1 主状态机（唯一真源）

复用 Decision Runtime：

```text
DRAFT
  → ANALYSIS
  → COUNCIL_REVIEW   （可跳过：单席低冲突且未命中召回）
  → APPROVED         （老板确认）
  → EXECUTING        （M-EXEC / createFromDecision）
  → VALIDATING
  → LEARNED
  → ARCHIVED
```

| 状态 | 老板语言 | Decision Center 呈现 |
|------|----------|----------------------|
| DRAFT | 刚发现的问题 | 决策提醒卡（未进入空间） |
| ANALYSIS | AI 在诊断 | 决策空间：事实 + 诊断 |
| COUNCIL_REVIEW | 委员会在议 | 决策空间：七常委观点 |
| APPROVED | 我已拍板 | 确认页 → 生成执行 |
| EXECUTING | 正在做 | 今日行动 / 行动页 |
| VALIDATING | 在验证对不对 | 行动页验证卡 |
| LEARNED | 已复盘 | 决策档案 + Brain Learning |
| ARCHIVED | 归档 | 档案列表 |

### 2.2 晨会视角的短生命周期（编排，非第二套状态机）

```text
SCANNED          → 出现在今日 Scan / Card
OPENED           → 进入决策空间（映射 ANALYSIS | COUNCIL_REVIEW）
AWAITING_FOUNDER → 等待「接受 / 调整 / 继续讨论」
ACCEPTED         → APPROVED + 触发 Execution
DEFERRED         → 卡保留，降紧急度（outcome 标记，不新状态）
```

映射规则（冻结）：

| 晨会相位 | mkStatus |
|----------|----------|
| SCANNED | DRAFT 或已有 openRisk/Opportunity 尚未建 Decision |
| OPENED | ANALYSIS 或 COUNCIL_REVIEW |
| AWAITING_FOUNDER | COUNCIL_REVIEW（board_ready） |
| ACCEPTED | APPROVED → EXECUTING |
| DEFERRED | 保持原 mkStatus；Card `deferredAt` |

**禁止**再发明 `PENDING_CHAT` / `AI_THINKING` 等产品状态列。

### 2.3 事件（复用 DecisionRuntimeEventType）

`DecisionCreated` · `DecisionAnalyzed` · `ExpertOpinionSubmitted` · `CouncilStarted` · `DecisionApproved` · `ExecutionStarted` · `ValidationCompleted` · `DecisionLearned`

Decision Center UI 只订阅/展示这些事件的投影，不另开 event 类型（V1）。

---

## 三、Decision Card Schema（冻结）

### 3.1 定位

首页**不是列表**，是 **Decision Card（1～N 张，V1 默认突出 1 张主卡）**。  
Card = Scan 的可点击决策提醒，**可以尚未有** Prisma Decision（先绑 risk/opportunity id，进入空间时再 `createDecision` / 挂草稿）。

### 3.2 契约

```typescript
/** Decision Center 卡片 — 投影契约，非 Prisma 表 */
type DecisionCardV1 = {
  cardId: string;                 // 稳定 id：优先 decisionId，否则 `risk:{id}` / `opp:{id}`
  kind: "risk" | "opportunity" | "action_bundle";
  tone: "red" | "yellow" | "green";

  /** 老板语言 */
  title: string;                  // 「是否调整晚餐套餐？」
  situationLine: string;          // 「晚餐订单下降 21%」
  impactStars: 1 | 2 | 3 | 4 | 5;
  urgencyStars: 1 | 2 | 3 | 4 | 5;

  /** 委员会预览（可空：尚未开会） */
  councilPreview?: {
    supportCount: number;
    observeCount: number;
    oneLineAdvice: string;        // 「建议：7天测试新套餐」
  };

  /** 依据可信度（经营体检） */
  confidence: number;             // 0–1
  evidenceHints: string[];        // ≤4 条「依据勾选文案」

  /** 跳转 */
  href: string;
  entryMode: "research" | "council" | "resume";

  /** 关联 */
  decisionId?: string;            // 已有 MKDecision
  riskAlertId?: string;
  opportunityId?: string;
  deferred?: boolean;
};
```

### 3.3 经营体检卡（Daily Diagnosis · 首页上部）

与 Card 并列、**每天一份**：

```typescript
type DailyDiagnosisV1 = {
  greetingName: string;           // 「王老板」
  restaurantName: string;
  healthScore: number | null;     // 0–100；无数据则 null（禁止假数）
  stageLabel: string;             // 「增长放缓期」等 — 来自 Brain stage + 规则，勿 LLM 瞎编硬数字
  primaryCause: string;           // 「老客复购下降」
  notCause?: string;              // 「不是客流下降」
  impactLine: string;             // 影响句；无量化依据则定性
  evidenceChecks: Array<{
    label: string;                // 「最近30天营业数据」
    available: boolean;           // 有事实才 ✓
  }>;
  confidence: number;             // 与 Brain 完整度 / 证据覆盖挂钩
  understandingScore?: number;    // Brain
};
```

**铁律：** `healthScore` / `-8%` 等数字**必须**有 Runtime/Brain 事实支撑；否则只展示定性诊断 + 低置信。

### 3.4 Daily Scan 聚合 DTO

```typescript
type DailyScanV1 = {
  diagnosis: DailyDiagnosisV1;
  primaryCard: DecisionCardV1 | null;
  secondaryCards: DecisionCardV1[];  // V1 ≤2
  actions: Array<{ id: string; title: string; done: boolean }>; // ≤3
  counts: { risks: number; opportunities: number; actions: number };
  primaryCta: {
    label: string;
    href: string;
    reason: "redeision" | "council" | "draft" | "meeting" | "checkin" | "open_card";
  };
};
```

**实现：** `buildDashboardHome` → `toDailyScanV1(home)`（D1）；tRPC 可挂 `dashboard.getHome` 增字段或 `dashboard.getDailyScan` 薄包装（同一 builder）。

---

## 四、Decision Agent Pipeline（冻结）

### 4.1 原则

> Pipeline = **编排现有能力**，不是新 Agent。

```text
[1] Collect signals
      Risk Runtime · Opportunity Runtime · Validation · Council draft · Brain context
        ↓
[2] Rank & pick
      runtime-priority（阻断风险压机会）
        ↓
[3] Project DailyScanV1 + DecisionCardV1
      dashboard.service（纯函数投影）
        ↓
[4] Open Decision Space
      research → advisor | council → decision-room | resume draft
        ↓
[5] Analyze & Argue
      四席 Insight（可选）→ 七常委 Council Runtime
        ↓
[6] Founder Decide
      accept | adjust | continue
        ↓
[7] Persist
      Decision + DecisionEvent + Brain DecisionRecord
        ↓
[8] Execute
      executionRuntime.createFromDecision → ActionPlan + ValidationTask
        ↓
[9] Learn
      Validation → LEARNED → Brain Learning / Evolution
```

### 4.2 步骤与代码锚点

| 步 | 锚点 | 说明 |
|----|------|------|
| 1–3 | `buildDashboardHome` · `runtime-priority.ts` | Scan |
| 4 | `MeetingHub` · `buildMeetingHref` · `decision-room?resume=1` | 分流 |
| 5 | `decision-council` · `decision-room-runtime.ts` | 论证 |
| 6 | `founderDecide` · `confirmFromMeeting` | 裁决 |
| 7 | `createDecision` / archive · `linkDecisionToRestaurantBrain` | 落库 |
| 8 | `executionRuntime.createFromDecision` | M-EXEC |
| 9 | Validation OS · Brain `learn` / applyLearning | 回灌 |

### 4.3 禁止出现的 Pipeline 节点

- `ChatAgent.reply` 作为首页主路径  
- `NewDecisionCenterAgent`  
- 绕过 `mkStatus` 直接写执行任务  

---

## 五、七常委如何挂载（冻结）

### 5.1 挂载点

| 层级 | 挂载 | 形态 |
|------|------|------|
| Card 预览 | `councilPreview` | 仅票数 + 一句建议（可来自上次 board 或启发式） |
| 决策空间 | `CouncilMeetingSession` | 会议桌观点卡，**非聊天** |
| 确认后 | `outcome.council` + `DecisionEvent` | 可追溯 |

### 5.2 人格化展示契约（产品→前端）

```typescript
type CouncilSeatView = {
  roleId: string;           // CFO / CSO / COO …
  title: string;            // 「财务官 CFO」
  judgement: string;        // 「不要急着增加投入。」
  reason: string;           // 「利润模型还没验证。」
  redLine?: string;         // 「单店利润下降时禁止扩投入。」
  stance: "support" | "oppose" | "conditional" | "observe";
};
```

数据来自 `CouncilMeetingSession.opinions` / `board`，经 **view mapper** 转老板语言；**禁止**再造七个 Prompt 聊天 Agent。

### 5.3 与 4+1 的关系

垂直 Agent（M-PNT/MKT/BIZ/ED）→ MKInsight Adapter → Council。  
Decision Center **只消费** Council 输出，不直连垂直报告进首页。

---

## 六、Restaurant Brain 如何提供证据（冻结）

### 6.1 职责

| Brain 提供 | Decision Center 用法 |
|------------|----------------------|
| `AgentRestaurantContext` / `priorBlock` | 决策空间「经营事实」底稿 |
| `understandingScore` / `dataCompleteness` | 体检卡可信度、空态 |
| `recentDecisions` / `DecisionRecord` | 档案层、避免重复踩坑 |
| `BrainLearning` | 诊断「历史经营记录」勾选 |
| 能力/经营数字 | impactLine 的事实来源（有则量化） |

### 6.2 证据墙映射

```text
经营事实墙 ← Brain business/capability + Runtime 指标（若有）
依据勾选   ← evidenceChecks.available = 字段非空 / 有 Learning
可信度     ← f(dataCompleteness, evidenceCoverage, councilConfidence)
```

### 6.3 写入回灌

| 时机 | 写 Brain |
|------|----------|
| 决策确认 | `DecisionRecord` + `BrainEvent.DECISION_CREATED`（已接线） |
| 执行完成 / 验证 | ActionRecord / actualOutcome（加深） |
| 复盘 | `learn` → Learning + Evolution |

**铁律：** Decision Center **读 Brain 证据、写决策关联**；不把诊断答案当 DNA 事实存。

---

## 七、M-EXEC 如何接管执行（冻结）

### 7.1 触发

老板在决策空间点 **「接受方案」**：

```text
recordDecisionApproved (mkStatus → APPROVED)
        ↓
executionRuntime.createFromDecision
        ↓
outcome.mkStatus → EXECUTING
DecisionEvent: ExecutionStarted
profile.lastActionPlan + validationTasks
        ↓
今日行动（≤3）+ 行动页全量任务
```

### 7.2 老板按钮语义

| 按钮 | 行为 |
|------|------|
| **接受方案** | APPROVED → createFromDecision → 回今日/行动 |
| **调整方案** | 回到 COUNCIL_REVIEW / 编辑结论（不执行） |
| **继续讨论** | resume decision-room / advisor（不 APPROVED） |

### 7.3 执行结果回 Brain

Validation 完成 → `DecisionLearned` → Brain `actualOutcome` / `learn`。  
V1 允许先打通「接受 → ActionPlan 出现在今日行动」；完整 LEARNED 回灌按 Execution/Growth 既有切片加深。

---

## 八、API / 路由表面（V1）

| 表面 | 用途 |
|------|------|
| `GET` 语义 `dashboard.getHome`（+ Scan 字段）或 `dashboard.getDailyScan` | L1 |
| `decisionCouncil.*` · `decision-room` | L2 论证 |
| `decisionArchive.confirmFromMeeting` | 老板确认 |
| `executionRuntime.createFromDecision` | 接受后执行 |
| `restaurantBrain.getOverview` / `listDecisions` | 档案与空态 |
| `decisionRuntime.appendOpinion` 等 | 加深，非入口阻塞 |

**禁止** `POST /api/chat` 作为 Decision Center 主入口。

---

## 九、与「经营晨会」产品形态对齐（实现约束）

| 产品块 | 技术对象 |
|--------|----------|
| 早上好 + 健康度 | `DailyDiagnosisV1` |
| 今日诊断 | `diagnosis.stageLabel` + cause + impact |
| AI 判断依据 | `evidenceChecks` + `confidence` |
| Decision Card | `DecisionCardV1` |
| 决策委员会 | `CouncilSeatView[]` |
| 老板确认三按钮 | §7.2 |
| 执行计划 | ActionPlan from Execution Runtime |

---

## 十、工程切片（接产品 D0–D5）

| 切片 | 技术交付 |
|------|----------|
| **T0** | 新建 `contracts/decision-center.ts`：`DailyScanV1` / `DecisionCardV1` / `DailyDiagnosisV1` / `CouncilSeatView` |
| **T1** | `toDailyScanV1(bundle|home)`；`getHome` 附带或薄 API |
| **T2** | Card → MeetingHub 分流（`entryMode`） |
| **T3** | 决策空间页：事实墙用 Brain context；常委用 SeatView mapper |
| **T4** | 接受方案 → `createFromDecision` 串联验收测试 |
| **T5** | 档案：最近 `DecisionRecord` 老板语言卡 |

**明确不做：** 新 Prisma 模型、新 Agent、新 Runtime、平行 Brief 微服务。

---

## 十一、成功标准（技术）

1. L1 只依赖 Scan DTO，前端不直接拼 6 个 Runtime。  
2. 任一决策确认后：`Decision.mkStatus≥APPROVED` 且存在 `DecisionRecord.mkDecisionId`。  
3. 接受方案后：`lastActionPlan` 非空或明确降级提示。  
4. 无证据时不出现假精确百分比。  
5. 零「首页主路径 = 聊天补全」。

---

## 十二、文档关系

| 文档 | 关系 |
|------|------|
| `MEALKEY_DECISION_CENTER_V1.md` | 产品入口 / IA |
| **本文** | 对象 / 状态机 / Card / Pipeline / 挂载 |
| `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md` | **壁垒层**：Framing / Scenario / Challenge；本文 Pipeline 编排之 |
| `MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` | MKDecision 真源，不重复发明 |
| Brain Entity / Service | 证据与档案 |
| Execution Runtime V2 | 接受后接管 |

---

**一句话：** Decision Center 的技术架构 = **在既有 MKDecision 状态机上，增加 DailyScan / DecisionCard 投影与晨会 Pipeline**；决策质量内核见 DIE；七常委、Brain、M-EXEC 全部是挂载点，不是新中枢。
