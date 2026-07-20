# MealKey Decision Context V1（决策上下文 · 架构冻结）

> **状态：正式冻结（Freeze）— Decision Case 的核心资产包**  
> **日期：** 2026-07-18（对齐 DIE：Context 树九块）  
> **权威挂载：** `docs/AUTHORITY.md` L1（挂 DIE / M-INTEL）  
> **代码契约：** `apps/web/src/server/founder-layer/contracts/decision-context.ts`  
> **上游：** Restaurant Brain + M-INTEL（Evidence Engine）  
> **下游：** DIE · 七常委 Challenge · Decision Center L2 · M-EXEC Commitment  
> **冲突裁决：** Context **不是**第二 Brain、**不是**聊天历史、**不是**平行 Decision 表；**挂在 Decision Case 上**；`decisionId ≡ MKDecision.id`。

---

## 〇、为什么 Context 是相对 GPT 的核心资产

| GPT | MealKey |
|-----|---------|
| 每次重新回答 | 为每个 **Decision Case** 建立并演进 Context |
| 无持久决策对象 | Question/Facts/State/… 绕 Case 聚合 |

```text
Restaurant Brain  +  M-INTEL（Evidence）  +  DIE
                         ↓
                  Decision Context（本文件）
                         ↓
              Challenge / Commit / Learn
```

> Decision Context = 当前这个决策相关的事实、观点、风险、路径的集合。

---

## 一、在链路中的位置（冻结）

```text
Brain（内部认知）──┐
                   ├── buildDecisionContextV1(topic)
M-INTEL（感知事件）─┘              │
                                   ▼
                          Decision Context
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
               DIE            七常委输入          Decision Center L2
            Framing/Scenario   Seat briefs         事实墙展示
                 │                 │
                 └────────┬────────┘
                          ▼
                     MKDecision
                          ▼
                       M-EXEC
```

**铁律：** Agent / DIE / Council **禁止**在 Context 外私编本店事实。

---

## 二、Decision Object（决策对象 · 冻结）

一次决策的规范对象 = 既有 **MKDecision**（`id ≡ Prisma Decision.id`）。  
Context 挂在议题上，可先于 Decision 行存在（Scan 阶段），落库后 `decisionId` 回填。

```typescript
type DecisionObjectRefV1 = {
  decisionId?: string;          // 有则 ≡ MKDecision.id
  projectId: string;
  topic: string;                // 老板原题或 Card 题
  reframedQuestion?: string;    // DIE Framing 后写入
  source:
    | "daily_brief"
    | "risk"
    | "opportunity"
    | "founder_ask"
    | "redeision"
    | "council_resume";
};
```

---

## 三、Decision Context Schema（冻结 · 九块树）

```typescript
type DecisionContextV1 = {
  meta: DecisionObjectRefV1 & {
    contextId: string;
    builtAt: string;
    schemaVersion: 1;
  };

  question: {
    original: string;
    framed: string;
    target?: string;
    deadline?: string;
  };

  facts: DecisionEvidenceV1[];                 // 已核实事实（证据句）
  internalState: RestaurantStateV1;            // 经营状态理解
  externalIntelligence: IntelligenceEventV1[]; // ≤12，已事件化
  historicalDecisions: DecisionHistorySliceV1[];
  expertOpinions: ExpertOpinionSliceV1[];      // 挑战后回填
  options: DecisionOptionV1[];                 // 2–3；simulation 挂选项上
  risks: RiskSliceV1[];
  recommendation?: { line: string; preconditions: string[] };

  // 机制字段
  evidence: DecisionEvidenceV1[];              // 与 facts 同步或超集
  confidence: DecisionConfidenceV1;
  score: DecisionScoreV1;
  councilInput: CouncilDecisionInputV1;
  framePreview?: ProblemFrameV1;
  infoMap: DecisionInfoMapV1;
};
```

`RestaurantStateV1` / `IntelligenceEventV1` / `DecisionSignalV1` / `DecisionCaseV1` 定义见 M-INTEL + DIE 契约；**字段以代码契约为准**。

---

## 四、Evidence Schema（冻结）

```typescript
type EvidenceKindV1 =
  | "brain_fact"
  | "owner_pulse"
  | "system_metric"
  | "intel_event"
  | "validation_result"
  | "decision_memory"
  | "world_signal";

type DecisionEvidenceV1 = {
  evidenceId: string;
  kind: EvidenceKindV1;
  label: string;                // 老板可读：「近 14 天晚餐订单下降」
  claim: string;
  available: boolean;
  confidence: number;           // 0–1
  sourceLabel: string;          // 必填
  asOf?: string;
  linkedEventId?: string;
  /** 禁止：无 available 却给精确百分比当硬事实 */
};
```

**规则：** `available: false` 必须出现在缺口区，不得假装有。

---

## 五、Intelligence Event 在 Context 中的用法（冻结）

- 只收 **已处理事件**（见 `MEALKEY_M_INTEL_V1.md` §四）  
- 按 `relatedDecisions` ∩ 当前 topic + `confidence` 排序  
- 老板 UI 展示：`title · impact · confidence`，不展示原始爬虫正文  

---

## 六、Confidence 机制（冻结）

```typescript
type DecisionConfidenceV1 = {
  overall: number;              // 0–1
  factors: {
    dataCompleteness: number;   // Brain / State
    evidenceCoverage: number;   // 议题相关证据占比
    eventFreshness: number;     // 事件时效
    historySupport: number;     // 同类决策/验证
  };
  band: "low" | "medium" | "high";
  openGaps: Array<{
    gapId: string;
    question: string;
    reason: string;
    bandOptions?: string[];
  }>;                           // ≤3；驱动 M-INTEL 补采
  refuseDeepJudgement: boolean; // true → DIE 禁止装懂终局
};
```

| overall | 系统行为 |
|---------|----------|
| &lt; 0.35 | 强制 Gap 提问或仅保守信号 |
| 0.35–0.6 | 可 Framing + 双路径，Challenge 加强 |
| &gt; 0.6 | 允许完整 DIE + 常委 |

**禁止**用文案流畅度抬高 confidence。

---

## 七、Decision Score 机制（冻结）

> Score = **决策准备度 / 议题紧迫价值**，不是「AI 有多聪明」。

```typescript
type DecisionScoreV1 = {
  readiness: number;            // 0–100：是否具备做决定的信息
  urgency: number;              // 0–100：拖下去的代价
  impact: number;               // 0–100：做对/做错的影响面
  conflict: number;             // 0–100：常委冲突强度（会后更新）
  composite: number;            // 加权；供 Scan 排序
  rationale: string[];          // ≤4 条老板语言依据
};
```

**V1 权重建议（可调，须文档化）：**  
`composite ≈ 0.35*readiness + 0.25*urgency + 0.25*impact + 0.15*conflict`

- Scan 主卡排序用 `composite`  
- `readiness` 低 → 先采不先辩  
- 与 Risk Runtime 冲突时：**Risk 阻断优先于 Opportunity 高分**

---

## 八、七常委输入规范（冻结）

常委 **不得**各自联网编造本店数字；只消费 `councilInput`：

```typescript
type CouncilDecisionInputV1 = {
  decisionQuestion: string;     // 优先 reframedQuestion
  originalQuestion: string;
  restaurantSnapshot: {
    stage: string;
    revenueTrend: string;
    profitTrend: string;
    organizationHealth: string;
    ownerRisk: string;
  };
  keyEvidence: Array<{ label: string; claim: string }>;  // ≤6
  keyEvents: Array<{ title: string; impact: string }>;     // ≤5
  constraints: string[];
  successLooksLike: string[];
  /** 历史教训一句 */
  lessonLine?: string;
};
```

**输出仍走**既有 Council Protocol / `CouncilSeatView`；本包只规范**输入**。

---

## 九、Info Map（动态信息地图 · 冻结）

```typescript
type DecisionInfoMapV1 = {
  topicFamily:
    | "expansion"
    | "pricing"
    | "product"
    | "marketing"
    | "org"
    | "other";
  weights: Record<string, number>;  // e.g. cash: 0.9, site: 0.7
  elevatedByAsk: boolean;           // 老板本题触发提权
};
```

扩店议题示例权重：`cash / organization / market_capacity / competition / site`。

---

## 十、组装与生命周期（冻结）

| 阶段 | 动作 |
|------|------|
| Brief / Scan | 轻量 Context 或预计算 Score |
| 打开决策空间 | `buildDecisionContextV1` 完整组装 |
| Gap | `openGaps` → M-INTEL 补采 → 重建 Context |
| DIE / Council | 只读 Context |
| 批准 | 摘要写入 `MKDecision.outcome.contextSnapshot`（可选瘦身） |
| 执行后 | 不靠旧 Context 续命；复盘写 Brain，下次重建 |

**禁止**把完整爬虫原文塞进 `outcome`。

---

## 十一、工程切片（C0–C3）

| 切片 | 交付 | 验收 |
|------|------|------|
| **C0** | 本文 + `decision-context.ts` | 类型可编译 |
| **C1** | `buildDecisionContextV1`（Brain + State + Events stub） | 决策空间可读摘要 |
| **C2** | Confidence + Gaps 驱动停答先采 | readiness 低不进装懂终局 |
| **C3** | Score → DailyScan 主卡排序 | 与 runtime-priority 不冲突（Risk 优先） |
| **C4** | `councilInput` 注入 Decision Room open | 常委输入可追溯 |

---

## 十二、成功标准（V1）

1. 任意打开的决策空间能展示：**状态 / 事件 / 证据 / 置信 / 缺口**。  
2. 七常委会议请求体可还原为同一 `councilInput`。  
3. Context 缺失关键证据时，`refuseDeepJudgement=true`。  
4. GPT 式「考虑资金团队市场」在有 Context 时必须被 **具体证据/事件** 替换或降级。  
5. 零「第二 Brain」表；零战略终局出自 Context 组装器。  

---

## 十三、文档关系

| 文档 | 关系 |
|------|------|
| **本文** | Context / Evidence / Confidence / Score / 常委输入真源 |
| `MEALKEY_M_INTEL_V1.md` | State · Event · Brief 供料 |
| `MEALKEY_DECISION_INTELLIGENCE_ENGINE_V1.md` | 消费 Context 做 Framing/Scenario/Challenge |
| `MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` | MKDecision 主实体 |
| `FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md` | 常委协议；本文补输入包 |

---

**一句话：**  
Decision Context 是经营大脑的**突触**——Brain 与 M-INTEL 的感知在此汇合，DIE 与七常委在此共用同一事实，执行与复盘从这里带走可验证假设。
