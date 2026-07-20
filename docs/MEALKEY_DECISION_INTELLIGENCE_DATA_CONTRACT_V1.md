# MealKey Decision Intelligence Data Contract V1（冻结）

> **状态：正式冻结（Freeze）— 决策智能数据契约**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L1  
> **代码 SSOT：** `apps/web/src/server/founder-layer/contracts/decision-intelligence-data-contract.ts`  
> **技术映射：** `docs/MEALKEY_DECISION_INTELLIGENCE_TECH_MAP_V1.md`  
> **解决的问题：** 如何把一次经营决策变成 **可计算、可追踪、可学习的资产**（不是聊天记录）。

---

## 〇、四个原则（冻结）

### 原则 1：Decision 是第一公民

不是「用户提问 / AI 回答」，而是 **一次经营决策事件（DecisionCase）**。

| 错误（无资产） | 正确（有资产） |
|----------------|----------------|
| 用户：要不要开店？→ AI：建议开 | Case：12 个月内是否开第二家？背景/目标/约束 → 老板裁决 → 未来验证 |

### 原则 2：不保存「答案」，保存「为何如此判断」

答案会过期；**推理模式 / Trace** 更重要。

### 原则 3：不保存 Prompt，保存 Decision Trace

记录：用了哪些事实、证据、风险、为何否决某方案——不是「帮我分析」的 Prompt 原文。

### 原则 4：决策必须可复盘

重大决策半年后打开，仍能看到：当时判断、异议、预测对错。

### 持久化铁律

`DecisionCase.id ≡ MKDecision.id ≡ Prisma Decision.id`  
扩展进 `Decision.outcome` + Brain `DecisionRecord` / `LearningRecord`  
**禁止**平行 Decision 大表 / 第七 Runtime。

---

## 一、七个核心对象（V1 只冻结这些）

```text
1 DecisionCase
2 DecisionContext   （含 Unknowns）
3 Evidence
4 DecisionOption
5 Simulation
6 DecisionAssessment
7 DecisionLearning
```

附属（同契约文件，非第七主对象）：Signal · Package · Trace · Counterfactual · SimilarMatch。

---

## 1. DecisionCase（决策案例）

**定义：** 一次需要判断的经营问题。

```typescript
type DecisionTypeV1 =
  | "GROWTH"
  | "OPERATION"
  | "PRODUCT"
  | "MARKETING"
  | "ORGANIZATION"
  | "FINANCE";

type DecisionUrgencyV1 = "LOW" | "MEDIUM" | "HIGH";

type DecisionCaseStatusV1 =
  | "DISCOVERED"
  | "ANALYZING"
  | "DELIBERATING"
  | "DECIDED"
  | "EXECUTING"
  | "LEARNING";

type DecisionCaseV1 = {
  id: string;                    // ≡ MKDecision.id
  schemaVersion: 1;
  projectId: string;
  ownerId: string;
  ownerLabel: string;

  title: string;                 // 「是否开第二家店」
  question: string;              // 具体问题句
  objective: string;             // 「建立第二增长曲线」

  decisionType: DecisionTypeV1;
  urgency: DecisionUrgencyV1;
  status: DecisionCaseStatusV1;

  deadline?: string;
  impactStars: 1 | 2 | 3 | 4 | 5;

  signalId?: string;
  contextId?: string;
  selectedOptionId?: string;
  packageId?: string;
  assessmentId?: string;

  createdAt: string;
  updatedAt: string;
};
```

**V1 主场景：** `decisionType: "GROWTH"` + 扩店题（见 §六）。

**mkStatus 映射：** DISCOVERED→DRAFT · ANALYZING→ANALYSIS · DELIBERATING→COUNCIL_REVIEW · DECIDED→APPROVED · EXECUTING→EXECUTING|VALIDATING · LEARNING→LEARNED。

---

## 2. DecisionContext（决策上下文）

**回答：** AI 基于什么做判断？  
**是系统资产，不是 Prompt。**

```typescript
type DecisionContextV1 = {
  contextId: string;
  schemaVersion: 1;
  decisionId: string;            // ≡ Case.id
  projectId: string;
  updatedAt: string;

  facts: DecisionFactV1[];       // 结构化事实摘要
  evidences: DecisionEvidenceV1[];

  restaurantState: RestaurantStateV1;
  historicalDecisions: DecisionHistorySliceV1[];
  similarMatches: SimilarDecisionMatchV1[];

  constraints: string[];         // 资金、人才、组织…
  assumptions: string[];         // 显式假设
  unknowns: string[];            // 【关键】未知项，禁止装懂

  options: DecisionOptionV1[];
  simulations: DecisionSimulationV1[];
  assessment?: DecisionAssessmentV1;
  recommendation?: {
    optionId: string;
    line: string;
    preconditions: string[];
  };

  councilInput?: CouncilDecisionInputV1;
  expertOpinions: ExpertOpinionSliceV1[];
  risks: RiskSliceV1[];
  counterfactual?: CounterfactualV1;
  infoMap: DecisionInfoMapV1;
  openGaps: Array<{
    gapId: string;
    question: string;
    reason: string;
    bandOptions?: string[];
  }>;
};

type DecisionFactV1 = {
  factId: string;
  label: string;
  value: string;
  source: EvidenceSourceV1;
  asOf?: string;
};
```

### Unknowns（冻结）

例：扩张决策 — 已知「利润稳定」；未知「店长复制能力」。  
UI 必须展示 unknowns；`unknowns.length > 0` 时 Assessment 不得虚高。

---

## 3. Evidence（决策证据）

**M-INTEL / Brain → DIE 的接口形状。**

```typescript
type EvidenceSourceV1 =
  | "POS"
  | "OWNER_INPUT"
  | "EXTERNAL"
  | "MEMORY"
  | "CASE";

type EvidenceImpactV1 = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

type DecisionEvidenceV1 = {
  id: string;
  decisionId?: string;
  source: EvidenceSourceV1;
  content: string;               // 「近90天晚餐收入下降12%」
  impact: EvidenceImpactV1;
  confidence: number;            // 0–100 或 0–1（代码内统一 0–1）
  freshness: number;             // 0–1 计算字段
  weight: number;                // trust × freshness × relevance
  relatedFactors: string[];      // 「晚餐」「人力」…
  createdAt: string;
  available: boolean;
  sourceTrustBand: EvidenceSourceTrustBandV1; // 细粒度权重带
};
```

| source | 典型 trust |
|--------|------------|
| OWNER_INPUT（感觉） | 低 |
| POS | 高 |
| EXTERNAL / CASE / MEMORY | 中高 |

---

## 4. DecisionOption（方案）

**至少两个选择**（V1：2–3）。

```typescript
type DecisionOptionV1 = {
  id: string;
  decisionId: string;
  name: string;                  // 「立即扩张」
  description: string;
  expectedBenefit: string;
  requiredResources: string[];   // 资金/人才…
  riskLevel: SuccessBandV1;
  successProbabilityBand: SuccessBandV1;
  successProbabilityRationale: string;
  executionDifficulty: SuccessBandV1;
  simulationId?: string;
  isRecommended?: boolean;
};
```

扩店例：A 立即扩张 · B 半年准备 · C 继续优化单店。

---

## 5. Simulation（路径模拟）

**区别 GPT 的关键资产。**

```typescript
type SimulationStageV1 = {
  stage: string;                 // 「30天」「90天」
  outcome: string;
  risk: string;
};

type DecisionSimulationV1 = {
  id: string;
  optionId: string;
  decisionId: string;
  timeRange: string;             // 「180天」
  scenarios: SimulationStageV1[];
  probabilityBand: SuccessBandV1;
  /** 仅有相似案例样本时允许区间 */
  probabilityRange?: { low: number; high: number };
  rationale: string;
};
```

**禁止**无样本大字「成功概率 45%」；默认分档 + rationale。

---

## 6. DecisionAssessment（决策评估）

最终/过程评分（对齐 Pre-Score / Confidence）。

```typescript
type DecisionAssessmentV1 = {
  id: string;
  decisionId: string;
  kind: "pre" | "post";

  confidenceScore: number;         // 0–100 综合信心
  informationCompleteness: number;
  riskScore: number;               // 越高风险越大
  executionScore: number;          // 执行匹配
  councilAgreement: number;        // 冲突收敛度（非简单投票）
  reasoningQuality: number;

  topRisk?: string;                // 「组织能力」
  unknownFactors: string[];
  suggestion:
    | "proceed"
    | "proceed_with_conditions"
    | "defer"
    | "need_more_evidence";
  rationale: string[];
  computedAt: string;
};
```

展示：「综合信心 78 · 最大风险：组织能力」。

---

## 7. DecisionLearning（决策学习）

**长期壁垒。**

```typescript
type DecisionLearningV1 = {
  id: string;
  decisionId: string;
  projectId: string;

  prediction: string;              // 当初预测
  actualResult: string;            // 实际结果
  difference: string;              // 偏差
  insight: string;                 // 洞察
  pattern: string;                 // 可复用规律
  confidence: number;

  preScoreTotal?: number;
  postScoreTotal?: number;
  createdAt: string;
  brainLearningId?: string;
};
```

例：预测「店长能力不足致扩张风险」→ 半年验证正确 → pattern：「三店以下且老板依赖度高，扩张失败概率上升」。

---

## 二、Decision Trace（不进七主对象，但必存）

```typescript
type DecisionTraceV1 = {
  decisionId: string;
  factsUsed: string[];           // evidence ids
  optionsRejected: Array<{ optionId: string; reason: string }>;
  challenges: Array<{ roleId: string; claim: string }>;
  founderChoice: string;
  founderOverrideReason?: string;
  at: string;
};
```

写入 `outcome.die.trace`；**禁止**存完整 LLM Prompt 当 Trace。

---

## 三、完整生命周期（冻结）

```text
Signal
  → DecisionCase
  → Context Building
  → Evidence Collection
  → Option Generation
  → Council Challenge
  → Simulation
  → Assessment
  → Founder Decision
  → Execution（Package → M-EXEC）
  → Result
  → Learning
```

---

## 四、与现有架构对应

| 层 | 存什么 / 做什么 |
|----|-----------------|
| Restaurant Brain | 餐厅长期事实、State、历史 DecisionRecord、Learning |
| Decision Intelligence | **一次决策过程**（七对象 + Trace） |
| Seven Council | 判断冲突 / Challenge → 更新 Assessment |
| M-PNT/MKT/BIZ/ED | 经 MKInsight → 可进入 Evidence / Opinions，不直写 Case 终局 |
| M-EXEC | Decision Package 执行与验证燃料 |
| Evolution | Pre/Post 偏差 → Learning → 权重/先验 |

---

## 五、V1 范围控制（冻结）

**第一阶段只跑通：「第二家店决策闭环」。**

老板：「我要不要开第二家店？」

1. 读 Restaurant Brain  
2. 生成 DecisionContext（含 unknowns）  
3. 收集必要 Evidence（缺口 ≤3）  
4. 七常委 Challenge  
5. 输出 Options + Simulation  
6. Assessment + 老板裁决  
7. 保存 Case / Trace / DecisionRecord（Brain）  

跑通后再扩：涨价 · 菜单 · 招人 · 店长培养 · 商圈。

---

## 六、工程切片

| 切片 | 内容 |
|------|------|
| **DC0** | 本文 + TS SSOT |
| **DC1** | 扩店 Case 工厂 + Context builder |
| **DC2** | Evidence weight + Assessment(pre) |
| **DC3** | Options×3 + Simulation + Council 挂载 |
| **DC4** | 裁决 → Package → Learning 钩子 |

落点清单：见 **Tech Map**。

---

**一句话：**  
数据契约把「聊一句建议」升级为 **可复盘的经营决策资产**；V1 先用「第二家店」证明整条链能转。
