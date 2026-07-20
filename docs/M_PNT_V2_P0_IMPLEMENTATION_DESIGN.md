# M-PNT V2 P0 实施设计（冻结）

> 冻结日：2026-07-15  
> 范围：**只做三件** — StateMachine / BrandBrief / PositioningContract  
> 禁止：爬虫、新 Agent、UI 大改、市场库、行业扩展

---

## 0. 目标一句话

把 M-PNT 从：

```
问题 → 7步 → LLM建议 → 结果
```

升级为：

```
立项 → 访谈 → 事实 → 问题定义 → 框架 → 假设 → 证据 → 判断 → 定位决策 → 正式交付
```

P0 只打通前半闭环的「质量控制骨架」：

| 模块 | 职责 |
|------|------|
| `BrandProjectStateMachine` | 知道处在哪一阶段；门禁不让跳步 |
| `BrandBriefInterviewEngine` | 用访谈产出咨询输入，不是问答 |
| `PositioningContractEngine` | 强制标准定位合同 + Evidence 绑定 |

代码落点（权威）：

```
packages/agents/src/m-pnt/consulting/
  types.ts
  stage-contracts.ts
  state-machine.ts
  brand-brief-engine.ts
  positioning-contract-engine.ts
  index.ts
```

---

## 1. BrandProjectStateMachine

### 1.1 阶段枚举（冻结）

```typescript
enum BrandProjectStage {
  DISCOVERY          // 企业与业务诊断
  BRAND_BRIEF        // 品牌简报访谈
  CATEGORY_ANALYSIS  // 品类机会分析
  CONSUMER_INSIGHT   // 用户洞察
  COMPETITIVE_MAPPING// 竞争地图
  POSITIONING_DESIGN // 定位设计
  POSITION_VALIDATION// 定位验证
  FINAL_STRATEGY     // 战略交付
}
```

线性推进，**禁止跳步**（P0 不做并行分支）。

### 1.2 StageContract（每阶段必须）

```typescript
type StageContract = {
  stage: BrandProjectStage;
  entryCriteria: string[];      // 进入条件（引用上游资产字段）
  requiredInputs: string[];     // 本阶段必填输入
  analysisMethod: string;       // 方法名（非自由发挥）
  outputArtifact: string;       // 产出资产类型名
  exitCriteria: string[];       // 退出/完成条件
};
```

### 1.3 门禁示例（定位设计）

进入 `POSITIONING_DESIGN` 前必须全部为 true：

```
✓ BrandBrief 完成（status=complete）
✓ CategoryDiagnosis 完成
✓ ConsumerInsight 完成
✓ CompetitiveMap 完成
✓ 差异机会（whitespace）已声明
```

否则：`advance()` 抛 `StageGateError`，前端只显示「缺什么」，**禁止生成定位句**。

### 1.4 项目持久化形状

```typescript
type BrandStrategyProject = {
  projectId: string;           // MealKey project id
  brandProjectId: string;      // m-pnt 咨询项目 id
  stage: BrandProjectStage;
  stageStatus: "active" | "blocked" | "complete";
  blockedReasons: string[];
  assets: {
    brandBrief?: BrandBrief;
    categoryDiagnosis?: CategoryDiagnosisStub;   // P0 可占位
    consumerInsight?: ConsumerInsightStub;
    competitiveMap?: CompetitiveMapStub;
    positioningContract?: PositioningContract;
  };
  history: Array<{
    at: string;
    from: BrandProjectStage;
    to: BrandProjectStage;
    reason: string;
  }>;
  updatedAt: string;
};
```

P0 存储：写入 `project.profile.mPntBrandProject`（JSON），不新建 Prisma 表（避免扩边界）。  
P1 再迁正式表。

### 1.5 API 表面（最小）

| 方法 | 行为 |
|------|------|
| `createBrandProject(projectId)` | 立项，stage=DISCOVERY |
| `getBrandProject(projectId)` | 读当前项目 |
| `assertCanEnter(stage)` | 校验门禁 |
| `completeStage(stage, artifact)` | 写入资产 + 尝试 advance |
| `advance()` | 按 exitCriteria 推进下一阶段 |

---

## 2. BrandBriefInterviewEngine

### 2.1 访谈不是闲聊

五层问题库（冻结），每层至少问到完整：

| 层 | 关键问题 |
|----|----------|
| 企业层 | 为什么存在？想成为谁？3年目标？ |
| 品类层 | 自认品类？消费者认什么？想改什么认知？ |
| 用户层 | 核心客户？为什么选你？为什么离开？ |
| 竞争层 | 最大对手？赢他的理由？ |
| 创始人层 | 优势？不可复制资产？ |

### 2.2 会话状态

```typescript
type BriefInterviewSession = {
  brandProjectId: string;
  layer: "enterprise" | "category" | "customer" | "competition" | "founder";
  answers: Record<string, string>;
  openQuestions: string[];
  completeness: number; // 0–1
  status: "in_progress" | "ready_to_compile" | "compiled";
};
```

规则：

- 每层 completeness ≥ 0.8 才能进下一层  
- 五层齐 → `compileBrandBrief()`  
- 未 compile 完成 → 状态机不能离开 `BRAND_BRIEF`

### 2.3 BrandBrief 合同（冻结）

```typescript
type BrandBrief = {
  briefId: string;
  version: number;
  status: "draft" | "complete";
  businessContext: string;
  categoryDefinition: string;
  targetCustomer: string;
  customerNeed: string;
  competitiveSet: string[];
  brandAmbition: string;
  founderBelief: string;
  rawAnswers: Record<string, string>;
  gaps: string[];           // 仍缺的事实
  compiledAt: string;
};
```

编译规则：字段空 → status 保持 draft，gaps 列出缺项；全部非空 → complete。

### 2.4 与旧 intake 关系

现有 positioning 页 4 字段 intake **降级为 Discovery 预填**，不再视为咨询完成。  
真正完成以 `BrandBrief.status === "complete"` 为准。

---

## 3. PositioningContractEngine

### 3.1 禁止的输出

❌ 「建议定位为年轻人的高品质湘菜品牌」这类无结构金句。

### 3.2 强制结构（冻结）

```typescript
type PositioningStatement = {
  forAudience: string;      // For
  whoNeed: string;          // Who
  ourBrandIs: string;       // Our Brand Is（定位类别）
  thatValue: string;        // That（核心价值）
  because: string;          // Because
  unlike: string;           // Unlike
};
```

### 3.3 Contract = Statement + 战略支撑

```typescript
type PositioningEvidence = {
  evidenceId: string;
  claim: string;
  sourceArtifact: string;   // e.g. BrandBrief.customerNeed
  strength: "strong" | "moderate" | "weak";
};

type PositioningContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "validated" | "frozen";
  statement: PositioningStatement;
  supportingEvidence: PositioningEvidence[];
  strategicChoice: string;          // 为什么选这条路
  rejectedAlternatives: Array<{
    statementSummary: string;
    rejectReason: string;
  }>;
  prerequisites: {
    brandBriefId?: string;
    categoryDone: boolean;
    consumerDone: boolean;
    competitiveDone: boolean;
  };
  frozenAt?: string;
};
```

### 3.4 引擎门禁

`propose(contract)` 前：

1. 状态机 stage ≥ `POSITIONING_DESIGN`  
2. `prerequisites` 全 true  
3. `statement` 六字段全非空  
4. `supportingEvidence.length >= 3`，且至少覆盖 customer / category / competitive 三类 source  
5. `rejectedAlternatives.length >= 1`

`freeze()` 仅当 `status === "validated"`（P0 可用人工确认 = validated）。

未过门禁 → 抛 `ContractGateError`，**不得**写入 FINAL_STRATEGY。

---

## 4. 阶段 × 资产映射（P0）

| Stage | outputArtifact | P0 深度 |
|-------|----------------|---------|
| DISCOVERY | DiscoveryNotes | 最小：从 profile + 预填问题生成 |
| BRAND_BRIEF | BrandBrief | **完整实现** |
| CATEGORY_ANALYSIS | CategoryDiagnosis | stub + 可挂旧 category_analysis |
| CONSUMER_INSIGHT | ConsumerInsight | stub + 可挂旧 customer_portrait |
| COMPETITIVE_MAPPING | CompetitiveMap | stub + 可挂旧 competitor_analysis |
| POSITIONING_DESIGN | PositioningContract(draft/proposed) | **完整实现** |
| POSITION_VALIDATION | PositioningContract(validated) | 人工确认 |
| FINAL_STRATEGY | ReportOutline | 只列 8 章目录，正文 P1 |

中间三阶段 P0 允许「调用旧 capability → 写入 stub 资产标 complete」，但 **门禁字段必须存在**，不能空转跳过。

---

## 5. 终稿目录（固定，P0 只锁结构）

```
01 Brand Brief
02 Category Diagnosis
03 Consumer Insight
04 Competitive Map
05 Positioning Strategy
06 Positioning Contract
07 Brand Architecture
08 Strategic Recommendations
```

P0：生成 `ReportOutline`（章节 + 已绑定资产 id）。  
P1：渲染《品牌定位战略报告》正文。

---

## 6. 明确不做（再冻结）

- ❌ 外部数据爬虫 / 市场数据库  
- ❌ 新 Agent  
- ❌ 大模型升级专项  
- ❌ UI 大重构（只允许最小绑定状态机的提示条）  
- ❌ 行业扩展  
- ❌ Founder OS 能力层扩张  

---

## 7. 验收标准（P0 Done）

1. 无法在 Brief 未完成时进入定位设计  
2. 无法输出非结构化「定位建议」作为终态  
3. 任一 `PositioningContract` 可追溯 ≥3 条 Evidence 到 Brief/品类/竞争资产  
4. `BrandStrategyProject.stage` 在 profile 中可持久化、可恢复  
5. 单测覆盖：门禁失败用例 + Brief 编译 + Contract 六字段校验  

---

## 8. 实施顺序（代码）

```
✅ Day 类型与 StageContract
✅ StateMachine（create/advance/gate）
✅ BrandBriefInterviewEngine
✅ PositioningContractEngine
✅ 单测（7）
✅ 服务层 + tRPC（mPntConsulting）
✅ positioning 页 → BrandConsultingWorkspace
```

产品入口：`/projects/[id]/positioning`

四 Agent 顺序仍冻结：M-PNT → M-MKT → M-BIZ → M-ED。
