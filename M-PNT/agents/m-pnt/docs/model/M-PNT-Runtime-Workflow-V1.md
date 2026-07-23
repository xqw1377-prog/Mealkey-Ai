# M-PNT Agent Runtime Workflow V1

> 版本：V1 | 状态：草案 | 对应代码：`packages/agents/src/m-pnt/runtime-v1.ts`

## 概述

V1 工作流将 M-PNT 的定位决策过程重构为 **三阶段流水线**：Situation → Position → Decision。

每个阶段内（必要时）支持并行执行，每阶段产出结构化中间结果，后阶段可读取前阶段数据做决策。

## 执行链

```text
┌─ Situation Stage ──────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ 品类分析     │  │ 客群画像     │  ← 并行                    │
│  └──────┬───────┘  └──────┬───────┘                           │
│         │                 │                                    │
│  ┌──────▼───────┐  ┌──────▼───────┐                           │
│  │ 价格带定位   │  │ 竞争分析     │  ← 并行                    │
│  └──────────────┘  └──────────────┘                           │
│         │                                                      │
│         ▼  (检查 short-circuit: marketOpportunity === failed)   │
│         │  如果触发 → 返回 reject 决策，跳过后续阶段             │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ Position Stage ───────────────────────────────────────────────┐
│  候选方向生成（外部传入 / 默认模板 / 可选 LLM 生成）            │
│         │                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Ries Agent   │  │ Trout Agent  │  │ Ye Agent     │ ← 并行  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         └─────────┬───────┴─────────┬───────┘                 │
│                   ▼                  ▼                         │
│            ┌──────────────┐  ┌──────────────┐                  │
│            │ Cross-Fire   │→│ Synthesis    │                  │
│            └──────────────┘  └──────────────┘                  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ Decision Stage ───────────────────────────────────────────────┐
│  品牌调性（可选，基于 synthesis 主方向）                        │
│         │                                                      │
│  Quality Check（5 条底线 + R4 硬规则校验）                      │
│         │                                                      │
│  Final Output → MKDecision + M-Solution                        │
└───────────────────────────────────────────────────────────────┘
```

## 与 V0 的关键差异

| 维度 | V0 (runtime.ts) | V1 (runtime-v1.ts) |
|---|---|---|
| 阶段 | 7 步串行 | 3 阶段，阶段内并行 |
| 上下文传递 | `previousSummary` 字符串拼接 | 结构化 `StageResult` 对象 |
| 三理论矩阵 | 嵌入在 differentiation Capability 的 LLM Prompt 中 | Workflow 层显式 Position Stage |
| 短路机制 | 无 | Situation Stage 检查 `marketOpportunity`，可提前终止 |
| 跳阶段 | 不支持 | `skipStages` 参数 |
| 外部候选 | 不支持 | `externalCandidates` 输入 |
| 指标追踪 | 无 | `metrics.totalMs / stageMs / modelCalls` |
| 模块化 | 单一 runMPnt 函数 | 可独立调用 `runSituationStage / runPositionStage / runDecisionStage` |

## 接口

### 主入口

```typescript
const result = await runMPntV1(
  context: MKContext,
  mission?: MPntMissionRef,
  options?: MPntRunOptions,
): Promise<MPntRunResult>
```

### MPntRunOptions（新增字段）

```typescript
interface MPntRunOptions {
  llm: LLMAdapter;
  runtimeConfig?: MPntRuntimeConfig;
  input?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // V1 新增
  skipStages?: ("situation" | "position" | "decision")[];
  externalCandidates?: PositionCandidate[];
}
```

### MPntRunResult（V1 结构）

```typescript
interface MPntRunResult {
  agentId: "m-pnt";
  missionId?: string;
  mode: "llm" | "heuristic" | "hybrid";
  
  stages: {
    situation?: SituationStageResult;   // 品类/客群/价格/竞争
    position?: PositionStageResult;     // 候选方向 + 三理论矩阵
    decision?: DecisionStageResult;     // 调性 + Quality + Final
  };
  
  decision: MKDecision;                 // 最终输出
  metrics: {                            // 运行时指标
    totalMs: number;
    stageMs: Record<string, number>;
    modelCalls: number;
    shortCircuited: boolean;
    shortCircuitReason?: string;
  };
}
```

## 短路逻辑

当 Situation Stage 的 `structured.marketOpportunity === "failed"` 时触发短路：

1. 跳过 Position 和 Decision Stage
2. 返回 `decision_recommend: "reject"`
3. `metrics.shortCircuited = true`
4. 附带 `shortCircuitReason` 说明原因

这避免了在无市场机会的品类上浪费 LLM 调用和用户时间。

## Quality Check 规则

Decision Stage 执行 5 条底线检查：

1. ✅ 用户能一眼看懂推荐结论（`final_recommended_position` 不为空）
2. ✅ 用户知道为什么选这个方向（`why_choose_this` 长度 ≥ 10）
3. ✅ 用户知道为什么不选其他方向（`why_not_others` 长度 ≥ 10）
4. ✅ 用户知道最主要风险是什么（`core_risk_summary` 不为空）
5. ✅ 用户知道下一步怎么验证（`validation_focus` 不为空）
6. ✅ R4 不得 primary（硬规则）

## 测试

`packages/agents/tests/runtime-v1.test.ts` — 10 个测试用例覆盖：

- 完整三阶段运行
- 外部传入候选方向
- 跳过各阶段
- 短路机制
- 指标追踪
- Quality Check 字段完整性

运行：`npx tsx --test packages/agents/tests/runtime-v1.test.ts`

## 下一步

1. **V1 → V2**: LLM 驱动的候选方向生成（当前仅支持外部传入或默认模板）
2. **V1 → V2**: 运行时知识引擎集成（当前仅内嵌种子）
3. **V1 → V2**: 记忆回写（当前 V0 有回写，V1 尚未加入）
4. **V1 → V2**: 并行执行超时控制
5. **兼容性**: 提供 V0→V1 适配层，确保 `runMPnt()` 接口在 V1 上仍可用
