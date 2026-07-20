# MealKey Decision Intelligence Engine V1（架构冻结）

> **状态：正式冻结（Freeze）— 后续首页 / 常委 / Brain / M-INTEL / M-EXEC / 模型调用的唯一决策内核**  
> **日期：** 2026-07-18  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **对外品牌：** 餐启 · Mealkey  
> **数据契约 SSOT：** `docs/MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md` · `contracts/decision-intelligence-data-contract.ts`  
> **配套：** Context `MEALKEY_DECISION_CONTEXT_V1.md` · Evidence `MEALKEY_M_INTEL_V1.md` · 入口交互 `MEALKEY_DECISION_CENTER_INTERACTION_V1.md`  
> **持久真源：** `DecisionCase.id ≡ MKDecision.id ≡ Prisma Decision.id`（**禁止**平行 Decision 大表 / 第七 Runtime）

---

## 一、核心定位（冻结）

> Decision Intelligence Engine 是 MealKey 的**经营决策核心引擎**：围绕具体经营决策对象，融合餐厅事实、外部情报、历史经验、多角色推演和执行反馈，**持续提升决策质量**。

| 它不是 | 它是 |
|--------|------|
| ❌ AI 聊天层 | ✅ **决策形成系统** |
| ❌ 数据分析层 | ✅ 以 Decision Case 为中心的推演闭环 |
| ❌ 报表系统 | ✅ Signal → Case → Context → Decide → Commit → Learn |
| ❌ 咨询报告生成器 | ✅ 可执行、可验证、可学习的决策资产 |

**产品句（冻结）：**

> MealKey 不是帮老板回答问题，而是每天帮助老板发现关键经营问题，并基于真实经营事实做出正确决策。

**本层冻结后约束：**

| 模块 | 必须服从 DIE |
|------|----------------|
| 首页 | 展示 Signal / Case Card，不是资讯或聊天 |
| 七常委 | Challenge（压力测试），不产终局答案 |
| Restaurant Brain | 提供记忆，不参与终局判断 |
| M-INTEL | 只产 Evidence（证据），不产战略结论 |
| M-EXEC | 执行 Decision Package（承诺），不是工具箱闲逛 |
| AI 模型 | 只在 Pipeline 节点内调用，读写 Case/Context |

---

## 二、五大核心对象（冻结）

整个系统**只围绕**下列五个对象扩展；禁止再发明平行「分析中枢 / 报告对象」。

### 2.1 Decision Signal（决策信号）

**作用：** 发现「哪些事情值得老板关注」。  
**不给答案**——只表达：「这里可能需要决策」。

**来源：** Restaurant Brain · M-INTEL · 经营数据 · 历史趋势 · Risk/Opportunity Runtime。

```typescript
type DecisionSignalV1 = {
  signalId: string;
  projectId: string;
  signal: string;                 // 「晚餐客流持续下降」
  impact: string;                 // 「revenue」| 老板语言影响域
  confidence: number;             // 0–1
  urgency: "low" | "medium" | "high";
  evidenceIds: string[];          // 必填，禁止空信号
  suggestedQuestion: string;      // 确认后可变成 Case.question
  observedAt: string;
  status: "open" | "opened_case" | "dismissed" | "merged";
  decisionCaseId?: string;
};
```

### 2.2 Decision Case（决策案例）

Signal **被老板确认**（或系统高置信自动开案且老板未驳回）后，生成决策对象。

```text
Signal: 晚餐下降
    → Decision Case: 是否调整晚餐产品策略？
```

```typescript
type DecisionCaseV1 = {
  id: string;                     // ≡ MKDecision.id
  projectId: string;
  question: string;               // 决策问题（可被 Frame 改写）
  objective: string;              // 目标，如「稳住晚餐营收」
  ownerId: string;
  ownerLabel: string;
  createdAt: string;
  updatedAt: string;
  status: DecisionCaseStatusV1;
  signalId?: string;
  contextId?: string;
  selectedOptionId?: string;
  packageId?: string;             // Decision Package → M-EXEC
};

type DecisionCaseStatusV1 =
  | "DISCOVERED"      // 已建案，待分析
  | "ANALYZING"       // 收集/归因/出方案中
  | "DELIBERATING"    // 七常委挑战 + 模拟
  | "DECIDED"         // 老板已裁决
  | "EXECUTING"       // 承诺执行中（含验证）
  | "LEARNING";       // 复盘学习（可再 → 归档于 outcome）
```

**与 mkStatus 映射（冻结）：**

| Case.status | MKDecision.status |
|-------------|-------------------|
| DISCOVERED | DRAFT |
| ANALYZING | ANALYSIS |
| DELIBERATING | COUNCIL_REVIEW |
| DECIDED | APPROVED |
| EXECUTING | EXECUTING 或 VALIDATING |
| LEARNING | LEARNED（归档见 outcome.archived） |

### 2.3 Decision Context（决策上下文）

> 当前决策所有**有效信息**的集合。是系统资产，**不是 Prompt**。

```text
DecisionContext
├── Decision Question
├── Internal Facts
├── External Evidence
├── Historical Experience
├── Expert Opinions      （挑战后写入）
├── Options              （≡ Decision Option 列表）
├── Risks
├── Simulation           （路径模拟结果）
└── Recommendation
```

字段 SSOT：`MEALKEY_DECISION_CONTEXT_V1.md` + `decision-context.ts`。  
**铁律：** DIE / 常委 / 模型调用 **只读 Context**；禁止 Context 外私编本店事实。

### 2.4 Decision Option（决策方案）

任何决策**不能只有一个答案**。V1 默认 **2–3** 个方案。

```typescript
type DecisionOptionV1 = {
  optionId: string;
  caseId: string;
  label: string;                  // 「立即扩张」
  summary: string;
  expectedBenefit: string;
  cost: string;
  risk: string;
  requiredCapability: string[];   // 「店长可独立」「现金缓冲≥X」
  /** 分档概率，禁止无依据假精确 */
  probabilityBand: "unknown" | "low" | "medium" | "high";
  probabilityRationale: string;
  simulation?: {
    d90: string;
    d180: string;
    d365: string;
  };
};
```

扩店例：A 立即扩张 · B 6 个月准备后扩张 · C 先优化单店模型。

### 2.5 Decision Learning（决策学习）

决策结束 = **学习开始**。结果回写 Brain，形成可复用模式。

```typescript
type DecisionLearningV1 = {
  learningId: string;
  caseId: string;
  projectId: string;
  pattern: string;                // 「3店以下老板依赖高时，不建议快速扩张」
  confidence: number;
  priorJudgement: string;         // 当初判断
  actualOutcome: string;          // 实际结果
  createdAt: string;
};
```

---

## 三、Decision Pipeline（冻结 · 11 步）

```text
1. Sense        感知经营变化          ← M-INTEL / Brain / 数据
2. Detect       发现异常信号          ← Decision Signal
3. Frame        重新定义问题          ← DIE Framing
4. Collect      补充必要信息          ← Gap ≤3（停答先采）
5. Reason       分析原因              ← DIE + Context
6. Generate     生成方案              ← Decision Option ×2–3
7. Challenge    七常委挑战            ← Pressure Test
8. Simulate     路径模拟              ← Option.simulation
9. Decide       老板裁决              ← Decision Center L2
10. Execute     M-EXEC 执行           ← Decision Package
11. Learn       反馈学习              ← Decision Learning → Brain
```

| 步 | 模型调用原则 |
|----|----------------|
| Sense/Detect | 规则优先；LLM 仅事件化/润色，不终局 |
| Frame/Reason/Generate/Simulate | 必须注入 Context；输出写回 Case |
| Challenge | 常委协议驱动；LLM 服务席位攻击，不投票平均 |
| Decide | **人类**；系统只呈信分与方案 |
| Execute/Learn | 少 LLM；结构化回写 |

**禁止**跳步：无 Challenge 的高影响 Case 不得直接 DECIDED（L3+ / 召回清单命中时强制）。

---

## 四、七常委 = 决策压力测试系统（冻结）

| 旧理解 | 新理解（冻结） |
|--------|----------------|
| 顾问 / 产答案 | **发现错误**（Decision Challenge System） |

```text
方案 → 七常委挑战 → 漏洞 → 调整方案 → 风险收敛 → 老板裁决
```

输出**不是**「7 个人意见墙」，而是更新后的：

- Context.risks / expertOpinions  
- 各 Option 的 risk 修订  
- **Decision Confidence Score**（见 §五）

协议细节：`FOUNDER_OS_COUNCIL_SYSTEM_V1_FREEZE.md`；输入包：`CouncilDecisionInputV1`。

---

## 五、Decision Confidence Score（冻结）

> 让老板感到：不是 AI 拍脑袋。

总分 **0–100**，加权：

| 因子 | 权重 |
|------|------|
| 事实完整度 | 25% |
| 问题定义质量 | 20% |
| 方案质量 | 20% |
| 风险控制 | 20% |
| 执行能力匹配 | 15% |

```typescript
type DecisionConfidenceScoreV1 = {
  caseId: string;
  total: number;                  // 0–100
  factors: {
    factCompleteness: number;
    problemFraming: number;
    optionQuality: number;
    riskControl: number;
    executionFit: number;
  };
  band: "low" | "medium" | "high";
  suggestion: "proceed" | "proceed_with_conditions" | "defer" | "need_more_evidence";
  rationale: string[];            // ≤4
};
```

示例：事实 90 · 风险 60 · 执行 55 → 综合约 68 → **建议暂缓 / 带条件**。  
与 Context `refuseDeepJudgement`：事实分过低时强制 `need_more_evidence`。

---

## 六、接口冻结

### 6.1 M-INTEL → DIE（只进 Evidence）

```typescript
type IntelEvidenceV1 = {
  evidenceId: string;
  source: string;
  type: string;
  content: string;                // 完整证据句
  impact: string;
  confidence: number;
  timestamp: string;
};
```

❌「附近开了一家店」  
✅「同商圈新增湘菜竞争者；影响：客流竞争增加；置信度 82%；2026-07-18」

### 6.2 Restaurant Brain → DIE（只提供记忆）

```text
Restaurant Profile
+ Historical Decisions
+ Learning Patterns
+ Capability State（含 Restaurant State 投影）
```

**Brain 不参与终局判断**——只供记忆与状态。

### 6.3 DIE → M-EXEC（Decision Package）

决策输出**不是**一句建议，而是承诺包：

```typescript
type DecisionPackageV1 = {
  packageId: string;
  caseId: string;                 // ≡ decisionId
  decision: string;               // 老板裁决结论
  objective: string;
  actions: Array<{
    title: string;
    owner?: string;
    dueInDays?: number;
  }>;
  metrics: Array<{
    name: string;
    target: string;
  }>;
  deadline?: string;
};
```

→ `executionRuntime.createFromDecision`；无 Package 不得标 EXECUTING 成功。

### 6.4 DIE ↔ 模型

| 允许 | 禁止 |
|------|------|
| 在指定 Pipeline 步调用 | 首页主路径 = ChatCompletion |
| 输入 = Context 序列化 | 输入 = 裸用户句 + 世界知识瞎编 |
| 输出 = 结构化写入 Case | 输出 = 长报告 PDF 心态 |

---

## 七、产品闭环（冻结）

```text
每天
  → M-INTEL 发现变化（Evidence / Signal）
  → Decision Center 展示问题（Signal / Card）
  → Decision Intelligence 分析（Context / Options）
  → 七常委挑战（Confidence Score）
  → 老板确认（DECIDED）
  → M-EXEC 执行（Package）
  → 结果进入 Brain（Learning）
  → 下一次更准确
```

---

## 八、工程切片（冻结后只准加深，不准改语义）

| 切片 | 内容 |
|------|------|
| **E0** | 本文 + 五对象契约 |
| **E1** | Signal → Case |
| **E2** | Context 九块组装 |
| **E3** | Options ×2–3 + Simulate |
| **E4** | Challenge → Confidence Score |
| **E5** | Package → M-EXEC → Learning |

产品交互：见 `MEALKEY_DECISION_CENTER_INTERACTION_V1.md`。  
质量飞轮：见 `MEALKEY_DECISION_QUALITY_MECHANISM_V1.md`（**不再扩新模块**，先做入口可感 + 质量可算）。

---

## 九、成功标准

1. 任一关键经营问题都落为 **Decision Case**，不落聊天气泡。  
2. Case 打开可见 Context 资产树（至少 Question/Facts/Options）。  
3. 高影响决策可见 **Confidence Score** 与因子，而非只一句建议。  
4. 常委产出体现为风险收敛与分数变化，而非七段作文。  
5. DECIDED 后存在 Decision Package 或明确降级原因。  
6. LEARNING 至少一条 pattern 可回写 Brain。  

---

## 十、文档关系

| 文档 | 关系 |
|------|------|
| **本文** | DIE 架构总冻结（对象 / Pipeline / 接口 / 信分） |
| `MEALKEY_DECISION_CONTEXT_V1.md` | Context 字段 SSOT |
| `MEALKEY_M_INTEL_V1.md` | Evidence Engine |
| `MEALKEY_DECISION_CENTER_V1.md` | 入口产品定位 |
| `MEALKEY_DECISION_CENTER_INTERACTION_V1.md` | **入口交互冻结** |
| `MEALKEY_DECISION_RUNTIME_BACKEND_V1.md` | mkStatus 真源 |
| Council / Execution 专篇 | Challenge / Commitment 实现 |

---

**一句话：**  
DIE 冻结之后，MealKey 只做一件事——**把经营变化变成可挑战、可承诺、可学习的 Decision Case**；其余模块都是它的传感器、记忆体、压力机与执行臂。
