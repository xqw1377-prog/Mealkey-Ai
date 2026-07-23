# M-PNT Data Contract & Runtime Implementation V1

> 版本：V1 | 状态：草案 | 涉及：`agent-sdk/protocols.ts`, `mk-decision-mapper.ts`, `runtime.ts`, `runtime-v1.ts`

## 1. 目标

将 M-PNT 当前分散的数据契约和运行时实现收敛为**一套契约 + 两套实现（V0 兼容 / V1 渐进）**。

### V1 解决的问题

| 问题 | 现状 | V1 目标 |
|---|---|---|
| `MKContext` 无定位专有字段 | `project.category`/`city` 是松散字符串 | 定义 `PositioningContext` 扩展 |
| `MKDecision` 用 `evidence` 作弊 | `source==="structured"` 携带 JSON | 定义结构化载荷协议 |
| V0/V1 输出结构不同 | `steps[]` vs `stages{}` | 统一 `MPntOutput` 契约 |
| `PositioningPageOutput` 与 `PositioningFinalJson` 冗余 | 两个相似接口 | 合并为一个，前端/后端共享 |
| Memory 回写未标准化 | V0 有回写，V1 没有 | 统一 Memory 契约 |

---

## 2. 契约分层

```text
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Frozen Protocols（不可改）                             │
│  MKContext / MKDecision / CapabilityDefinition / AgentRun       │
│  由 @mealkey/agent-sdk 定义，M-PNT 只能消费，不能修改。          │
└─────────────────────────────────────────────────────────────────┘
                            │  extends
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: M-PNT 扩展协议（可演进）                               │
│  PositioningContext / StructuredPayload / MPntOutput            │
│  在 MKDecision 的 evidence[] 中安全传输，不污染 Frozen 字段。    │
└─────────────────────────────────────────────────────────────────┘
                            │  transforms
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: 前端消费层（UI 直接渲染）                               │
│  PositioningPageOutput / CreativeStrategy                       │
│  decisionToPageOutput() 将 MKDecision → 前端可渲染结构。          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 新增/修订契约

### 3.1 Structured Payload 协议（规范 `evidence` 作弊）

当前：`evidence.source === "structured"` 的内容是任意 JSON。

V1：定义结构化载荷的类型标签：

```typescript
type StructuredPayloadTag =
  | 'step:category_analysis'
  | 'step:customer_portrait'
  | 'step:price_positioning'
  | 'step:competitor_analysis'
  | 'step:differentiation'
  | 'step:brand_tonality'
  | 'step:final'
  | 'matrix:theory_view'
  | 'matrix:cross_fire'
  | 'matrix:synthesis'
  | 'output:positioning_page';
```

每个 tag 对应一个明确的 JSON Schema。例如 `step:category_analysis` 的载荷结构：

```typescript
interface CategoryAnalysisPayload {
  stepId: 'category_analysis';
  marketOpportunity: { level: 'strong'|'adequate'|'weak'|'failed'; summary: string };
  competitionDensity: 'blue_ocean'|'moderate'|'crowded'|'red_ocean';
  categoryLifecycle: '导入期'|'成长期'|'成熟期'|'衰退期';
  resourceFit: { level: 'strong'|'adequate'|'weak'; gap: string[] };
  keyFindings: Array<{ dimension: string; conclusion: string; confidence: number }>;
}
```

### 3.2 PositioningPageOutput V2（合并 PositioningFinalJson）

将 `PositioningPageOutput` 和 `PositioningFinalJson` 合并：

```typescript
interface PositioningPageOutput {
  // 元信息
  version: '2.0';
  generatedAt: string;
  agentId: 'm-pnt';
  
  // 决策概要
  summary: string;
  decision_recommend: 'primary'|'secondary'|'backup'|'reject';
  overall_score: number;
  mind_position_level: 'A'|'B'|'C'|'D';
  max_risk_severity: 'R1'|'R2'|'R3'|'R4';
  
  // 定位五要素
  brandPositioning: {
    category: string;
    targetCustomers: string;
    priceRange: string;
    differentiation: string;
    brandTonality: string;
    mentalPosition: string;
  };
  
  // 候选方向
  candidates: CandidateCard[];
  
  // 三理论矩阵（完整保留）
  theoryVoteSummary: TheoryVoteSummary;
  crossFire: CrossFireSummary;
  synthesis: SynthesisSummary;
  
  // 决策理由
  whyChooseThis: string;
  whyNotOthers: string;
  
  // 执行落地
  creativeStrategy: CreativeStrategy;
  mSolution: MSolution;
  risks: RiskItem[];
  validation: ValidationPlan;
  nextSteps: NextStep[];
  
  // 运行时指标
  metrics?: {
    totalMs: number;
    stageMs: Record<string, number>;
    shortCircuited: boolean;
    shortCircuitReason?: string;
    decisionTraceAvailable: boolean;
  };
}
```

### 3.3 V0 ↔ V1 统一输出契约

```typescript
// V0 和 V1 的统一上层契约
interface MPntOutput {
  agentId: 'm-pnt';
  missionId?: string;
  decision: MKDecision;            // Frozen Protocol — 始终存在
  pageOutput: PositioningPageOutput;  // 前端消费 — 始终存在
  
  // V0 兼容
  steps?: Array<{ stepId: string; decision: MKDecision }>;
  
  // V1 扩展
  stages?: {
    situation?: SituationStageResult;
    position?: PositionStageResult;
    decision?: DecisionStageResult;
  };
  metrics?: {
    totalMs: number;
    stageMs: Record<string, number>;
    modelCalls: number;
    shortCircuited: boolean;
    shortCircuitReason?: string;
  };
}
```

### 3.4 Memory 回写契约

```typescript
interface PositioningMemoryEntry {
  type: 'positioning_decision';
  version: string;
  
  // 定位结论
  summary: string;
  decision_recommend: 'primary'|'secondary'|'backup'|'reject';
  overall_score: number;
  mind_position_level: 'A'|'B'|'C'|'D';
  max_risk_severity: 'R1'|'R2'|'R3'|'R4';
  
  // 三理论投票
  theory_vote: {
    ries: { preferred: string; theory_recommend: string };
    trout: { preferred: string; theory_recommend: string };
    ye_maozhong: { preferred: string; theory_recommend: string };
  };
  
  // 验证状态
  validation_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  next_review_date?: string;
  
  // 版本追踪
  position_version: number;
  previous_version_summary?: string;
}
```

---

## 4. 运行时统一入口

```typescript
async function runMPntUnified(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntRunOptions & { runtimeVersion?: 'v0' | 'v1' },
): Promise<MPntOutput>;

// V0 行为：等价于当前 runMPnt()
// V1 行为：等价于 runMPntV1()
// 默认：V0（向后兼容）
```

实现：

```typescript
export async function runMPntUnified(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntRunOptions & { runtimeVersion?: 'v0' | 'v1' } = {},
): Promise<MPntOutput> {
  if (options.runtimeVersion === 'v1') {
    const v1Result = await runMPntV1(context, mission, options);
    return {
      agentId: 'm-pnt',
      missionId: mission?.id,
      decision: v1Result.decision,
      pageOutput: decisionToPageOutput(v1Result.decision),
      stages: v1Result.stages,
      metrics: v1Result.metrics,
    };
  }
  
  // V0 默认
  const v0Result = await runMPnt(context, mission, options);
  return {
    agentId: 'm-pnt',
    missionId: mission?.id,
    decision: v0Result.decision,
    pageOutput: decisionToPageOutput(v0Result.decision),
    steps: v0Result.steps,
  };
}
```

---

## 5. 迁移路径

| Phase | 内容 | 涉及文件 |
|---|---|---|
| 1 | `StructuredPayload` 类型标签定义 | `protocols/mk-decision-mapper.ts` |
| 2 | `PositioningPageOutput` V2 合并 | `protocols/mk-decision-mapper.ts` |
| 3 | Memory 回写契约 | `runtime-v1.ts` |
| 4 | `runMPntUnified` 统一入口 | `runtime.ts` |
| 5 | V0 runtime 标记 deprecated | `runtime.ts` |

---

## 6. 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 不改 Frozen Protocols | 不改 `MKDecision` 结构 | 母体不允许，`evidence` 作弊是标准做法 |
| 不废弃 V0 runtime | 保留为默认 | 已有 41 个测试依赖 V0 行为 |
| V1 输出包裹统一契约 | `MPntOutput` 包含 `decision` + `pageOutput` | 前端只需 `pageOutput`，母体只需 `decision` |
| Memory 回写用独立接口 | `PositioningMemoryEntry` | 不与 Frozen `saveDecision` 冲突 |

---

## 7. 文件结构（V1 完成后）

```text
packages/agents/src/m-pnt/
  protocol/
    structured-payload.ts      # V1: 结构化载荷标签 + Schema
    memory-contract.ts         # V1: Memory 回写契约
    mk-decision-mapper.ts      # V2: PositioningPageOutput 合并
  
  runtime.ts                   # V0 + runMPntUnified 统一入口
  runtime-v1.ts                # V1 三阶段实现
  
tests/
  runtime-v1.test.ts           # V1 测试
```

---

## 8. 与 V1 其他模块的关系

| 模块 | 关系 |
|---|---|
| Runtime Workflow V1 | 消费 `StructuredPayload` 作为阶段间传递 |
| Decision Engine V1 | 消费 `StructuredPayload` 读取中间评分数据 |
| Frontend Workshop UI V1 | 消费 `PositioningPageOutput` |
| Knowledge Asset V2 | 通过 `StructuredPayload` 传递知识引用 |
