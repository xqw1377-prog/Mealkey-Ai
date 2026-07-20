# MealKey Decision Runtime 后端设计 V1（冻结）

> **状态：正式冻结（Freeze）— Runtime Layer 中枢神经**  
> **日期：** 2026-07-17  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **上级：** `docs/MEALKEY_RUNTIME_LAYER_V1.md`  
> **配套：** 权限模型 V2 · `contracts/decision-v2.ts` · Prisma `Decision` / `DecisionEvent`  
> **下游：** `docs/MEALKEY_EXECUTION_RUNTIME_BACKEND_V2.md`

---

## 一、核心定位

> **Decision Runtime 负责让企业所有重要决策从「一个想法」变成「可追踪、可验证、可学习的经营资产」。**

相对角色：

| 角色 | 职责 |
|------|------|
| M-PNT / M-MKT / M-BIZ / M-ED | 四位专家（判断权） |
| 七常委 | 决策委员会（裁决 / 合法化） |
| M-EXEC | 执行系统（流程权下的行动） |
| **Decision Runtime** | **记录、管理、追踪所有经营判断的操作系统** |

**传统企业：** 想法 → 会议 → 执行 → 结果 → **忘记为什么** → 失败不可复盘、成功不可复制。

**MealKey：**

```
经营问题 → 专家分析 → 委员会决策 → Decision Runtime 登记
    → Execution Runtime 执行 → 结果反馈 → Memory 沉淀
```

不管理聊天；管理 **Decision Entity（MKDecision）**。

---

## 二、核心对象模型

### 2.1 `MKDecision`（规范 TypeScript）

```typescript
type DecisionSourceType = "agent" | "council" | "founder";

/**
 * 主状态机（产品/工程唯一真源）见 §三。
 * 兼容简写（UI/早期草稿）：draft→DRAFT, reviewing→ANALYSIS|COUNCIL_REVIEW,
 * approved→APPROVED, executing→EXECUTING, validated→VALIDATING|LEARNED, closed→ARCHIVED
 */
type MKDecisionStatus =
  | "DRAFT"
  | "ANALYSIS"
  | "COUNCIL_REVIEW"
  | "APPROVED"
  | "EXECUTING"
  | "VALIDATING"
  | "LEARNED"
  | "ARCHIVED";

interface MKDecision {
  id: string; // ≡ Prisma Decision.id
  projectId: string;
  ownerId: string;

  title: string;
  description: string;
  /** 可验证假设（复盘必需） */
  hypothesis?: string;
  /** 最终结论文案 */
  conclusion: string;

  source: {
    type: DecisionSourceType;
    agent?: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
    meetingId?: string;
    contractId?: string; // FounderDecisionContract.id
    packId?: string; // DecisionPack.packId — 不得作外键
  };

  evidence: Evidence[];
  opinions: DecisionOpinion[];
  risks: Array<{ label: string; severity?: "low" | "medium" | "high" }>;
  confidence: number; // 0–1

  /** 七常委裁决摘要（若走过 COUNCIL_REVIEW） */
  council?: CouncilDecision;

  status: MKDecisionStatus;

  links: {
    actionPlanId?: string | null;
    validationTaskIds: string[];
    supersededBy?: string | null;
    supersedes?: string | null;
  };

  review?: {
    nextReviewAt?: string;
    lastReviewAt?: string | null;
    reviewQuestion?: string;
  };

  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Evidence Layer（证据层）

每个决策必须绑定证据——区别「凭感觉建议」的普通 AI。

```typescript
interface Evidence {
  id: string;
  type: "market" | "financial" | "user" | "experience" | "case";
  source: string;
  confidence: number;
  content: string;
}
```

示例（定位决策）：市场搜索增长 · 太二路径案例 · 100 份用户访谈。

### 2.3 Decision Opinion（专家观点）

专家提交意见，不直接终局改库。

```typescript
interface DecisionOpinion {
  decisionId: string;
  expert: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
  position: "support" | "oppose" | "neutral";
  reason: string;
  confidence: number;
  evidenceIds: string[];
}
```

示例：M-PNT 支持（品类空位 85%）· M-BIZ 反对（毛利不足 70%）——这才是专家委员会。

### 2.4 Council Decision（七常委输出）

委员会是 **裁决层**，不是知识库。

```typescript
interface CouncilDecision {
  voteResult: Array<{
    member: string; // 常委角色
    vote: "yes" | "no";
    comment?: string;
  }>;
  finalDecision: string;
  /** 必须保留：重大创新常始于少数意见 */
  minorityOpinion: string;
  riskStatement: string;
}
```

输入：`MKDecision` + Opinions + Evidence → 输出 `CouncilDecision`。

---

## 三、生命周期状态机（核心）

不是简单 CRUD。

```
DRAFT
  → ANALYSIS
  → COUNCIL_REVIEW   （可跳过：单席低冲突 + 老板直批）
  → APPROVED
  → EXECUTING
  → VALIDATING
  → LEARNED
  → ARCHIVED
```

| 状态 | 含义 | 典型动作 |
|------|------|----------|
| **DRAFT** | 经营问题产生 | 「要不要开第二家店？」登记 |
| **ANALYSIS** | 四席分析中 | 提交 `DecisionOpinion` + Evidence |
| **COUNCIL_REVIEW** | 七常委辩论 / 裁决 | 写入 `CouncilDecision`（含少数意见） |
| **APPROVED** | 最终决策成立 | 老板确认或常委合法化；发 `DecisionApproved` |
| **EXECUTING** | 进入 M-EXEC | 挂 ActionPlan |
| **VALIDATING** | 等待经营结果 | ValidationTask 运行 |
| **LEARNED** | 经验形成 | 写 Memory；Growth 可消费 |
| **ARCHIVED** | 归档 | 时间线只读 |

**跳过规则（冻结）：**

- 单席专项且无高冲突 → `ANALYSIS` 后可直接 `READY` 语义进 `APPROVED`（仍须老板确认），**不强制** `COUNCIL_REVIEW`。  
- 命中权限模型「必须召回七常委」→ **禁止**跳过 `COUNCIL_REVIEW`。  
- `APPROVED` 之前：Execution / L3 **零调用权**。

### 3.1 与旧枚举映射

| 旧（decision-v2 / outcome / final） | MKDecisionStatus |
|------------------------------------|------------------|
| DRAFT | DRAFT |
| DEBATING | ANALYSIS 或 COUNCIL_REVIEW |
| READY_FOR_APPROVAL | ANALYSIS（待批）或 COUNCIL_REVIEW 末 |
| APPROVED / accepted | APPROVED |
| EXECUTING / executing | EXECUTING |
| VALIDATION_REQUIRED / validating | VALIDATING |
| VALIDATED / verified / confirmed | → 收口后 LEARNED |
| FAILED / invalidated | → LEARNED（outcome=failed）再 ARCHIVED 或 REVISE 新决策 |
| SUPERSEDED | ARCHIVED（links.supersededBy） |

实现：`mapToMkDecisionStatus()`；读路径一律经映射。

---

## 四、Decision Event System

所有 Runtime 通过事件连接。Phase 1：先写 `DecisionEvent` 再副作用。

| Event（冻结名） | 触发 | 消费者 |
|-----------------|------|--------|
| `DecisionCreated` | DRAFT 登记 | Registry |
| `DecisionAnalyzed` | 席位意见齐套 / 更新分析 | Registry, UI |
| `ExpertOpinionSubmitted` | 单席提交 Opinion | Registry |
| `CouncilStarted` | 进入 COUNCIL_REVIEW | Council |
| `DecisionApproved` | APPROVED | **Execution, Memory** |
| `ExecutionStarted` | 进入 EXECUTING | Brief |
| `ValidationCompleted` | 验证收口 | Decision→LEARNED, Growth, Memory |
| `DecisionLearned` | LEARNED | Memory, Growth |

示例：M-BIZ 完成 → `DecisionAnalyzed`；M-EXEC 验证完 → `ValidationCompleted` → 复盘进 LEARNED。

---

## 五、数据库设计

### 5.1 逻辑表（产品模型）

| 表 | 关键列 |
|----|--------|
| **decisions** | id, project_id, owner_id, title, description, status, confidence, created_at |
| **decision_evidence** | id, decision_id, type, content, source, confidence |
| **decision_opinions** | id, decision_id, agent, position, reason, confidence |
| **council_votes** | id, decision_id, member, vote, comment |
| **decision_events** | id, decision_id, event_type, payload, created_at |

### 5.2 V1 落地策略（诚实：不一次炸库）

| 逻辑表 | V1 实现 | 后续 |
|--------|---------|------|
| decisions | **复用** Prisma `Decision`；`status` 进 `outcome.status`（或加列 migration） | 可加 `status` 列 |
| decision_evidence | V1：`Decision.evidence` JSON 数组（Evidence 形） | 可拆表 |
| decision_opinions | V1：`outcome.opinions` JSON | 可拆表 |
| council_votes | V1：`outcome.council.voteResult` JSON | 可拆表 |
| decision_events | **复用** Prisma `DecisionEvent`（eventType + metadata） | 保持 |

**ID 铁律：** `MKDecision.id` ≡ `Decision.id`。Validation / ActionPlan **禁止**用 `packId` 当外键。

---

## 六、与现有系统连接

```
              Founder OS
                  │
          Decision Runtime
                  │
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
 M-PNT        M-MKT        M-BIZ / M-ED
                  │
            Council（裁决）
                  │
             MKDecision
                  │
         Execution Runtime（M-EXEC）
                  │
               Result
                  │
          Memory / Growth
```

| 方向 | 契约 |
|------|------|
| **输入** | 四席 `propose` / `submitOpinion`；常委 `startCouncil` / `finalizeCouncil` |
| **输出** | `DecisionApproved` → M-EXEC 建 `DecisionExecution` / ActionPlan |
| **写入** | `DecisionApproved` / `DecisionLearned` → Memory（type decision/learning） |

现网入口对齐：`decisionArchive.confirmFromMeeting` → `DecisionRuntime.approve*`；Council → `COUNCIL_REVIEW`；`capability/decision` Pack → `source.packId` 仅溯源。

---

## 七、Memory 写入规则（V1 必做）

| 时机 | type | 最低 payload |
|------|------|--------------|
| `DecisionApproved` | `decision` | id, title, conclusion, hypothesis, confidence, status |
| `ValidationCompleted` | `learning` | id, result, impact, summary |
| `DecisionLearned` | `learning` | id, lesson, minorityOpinion? |

禁止：无 decisionId 的「重大决策」记忆；用 Memory 覆写状态机。

---

## 八、第一版实现范围

### 必须完成（V1）

- [x] 设计冻结：Decision Entity / 状态机 / Evidence / Opinion / Event / Memory 接口  
- [x] 代码：`MKDecision` 契约 + 状态映射（切片 A）  
- [x] 代码：`confirmFromMeeting` → `mkStatus=APPROVED` + `DecisionApproved` 事件（切片 B）  
- [ ] 代码：Opinion / Evidence 独立追加 API  
- [x] 代码：Memory 必写（approve 路径现网已有 decision memory；learned 待 Validation 回调）  
- [ ] 修复：Validation `decisionId` = Prisma id（切片 C / Execution E2）  

### 暂时不做

- ❌ 自动经营数据采集  
- ❌ ERP / POS 对接  
- ❌ 全自动判定成功/失败（仍由 Validation OS + 老板确认）  
- ❌ 拆满物理子表（除非迁移窗口明确）

---

## 九、Phase 1 工程切片

| 序 | 切片 | 验收 |
|----|------|------|
| A | `contracts/mk-decision.ts` + 状态映射单测 | 旧枚举→新状态全覆盖 |
| B | `registry` 包装 `confirmFromMeeting` | 写 `DecisionApproved` 事件 |
| C | Opinion/Evidence JSON 读写 API | 可追加席位意见 |
| D | Validation/Action 外键断言 | 拒绝非 Prisma id |
| E | Memory 必写 | approve 后可查 |
| F | Timeline 列表 | 按项目看决策历史 |

---

## 十、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1-freeze | 2026-07-17 | 初版模型/Event/映射 |
| V1-freeze-final | 2026-07-17 | 对齐终稿：ANALYSIS/COUNCIL_REVIEW/LEARNED、Evidence/Opinion/Council、逻辑表、V1 范围 |
