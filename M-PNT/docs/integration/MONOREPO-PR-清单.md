# M-PNT 合入 MealKey Monorepo — PR 清单

> 母体路径: `C:\Users\xqw13\Mealkey Agent`  
> 来源: `C:\Users\xqw13\M-PNT\packages\agents\src\m-pnt`  
> 日期: 2026-07-09

---

## 目标

将 M-PNT 作为与 LaunchAgent 同级的标准子 Agent 注册进 `@mealkey/agents`，并完成意图路由、问题理解映射与知识种子挂载。

## PR 拆分建议

| PR | 范围 | 风险 | 说明 |
|---|---|---|---|
| **PR-1** | `packages/agents` 新增 `m-pnt/**` + `allAgents` 注册 | 低 | 纯产品定义，不改调度 |
| **PR-2** | `intent-detector` + `orchestrator` 路由 m-pnt | 中 | 影响主对话路径 |
| **PR-3** | knowledge seeds + memory 闭环验证 | 中 | 依赖 engine 接口 |
| **PR-4** | LLM 真适配（DeepSeekAdapter）+ e2e | 中 | 需 API Key |

本轮已在 M-PNT 仓完成实现；合入时以 **PR-1 必合** 为最小闭环。

---

## PR-1：Agent 产品注册（必合）

### 文件变更

```text
packages/agents/src/m-pnt/**          # 从 M-PNT 仓拷贝
packages/agents/src/index.ts         # 注册 MPntAgent
packages/agents/package.json         # exports "./m-pnt"
```

### `index.ts` 补丁

```typescript
import { LaunchAgent } from "./launch";
import { MPntAgent } from "./m-pnt";

export const allAgents: AgentDefinition[] = [
  LaunchAgent,
  MPntAgent,
];

export { LaunchAgent } from "./launch";
export { MPntAgent } from "./m-pnt";
```

### 类型对齐注意

| 项 | 处理 |
|---|---|
| `WorkflowStepType` | 仅用 `analysis \| question \| decision \| action`（已对齐） |
| `MKDecision` | **无 payload**；结构化数据用 `evidence[source=structured]` |
| `AgentDefinition.reportTemplate` | 不挂在 definition 上，单独 export |
| 勿引入本仓 `packages/agent-sdk` shim | 使用 monorepo `@mealkey/agent-sdk` |

### 验收

```bash
cd "C:\Users\xqw13\Mealkey Agent"
npm run build -w @mealkey/agents
# 或 node tests/test-agents.ts 扩展断言 allAgents 含 m-pnt
```

- [ ] `getAgentById("m-pnt")` 非空  
- [ ] `mPntCapabilities.length === 6`  
- [ ] `mPntWorkflow.steps.length === 7`  
- [ ] 末步 `output === "final"`  

---

## PR-2：意图与调度

### 2.1 `packages/mealkey-core/src/agent/intent-detector.ts`

新增：

```typescript
export function detectPositioningIntent(message: string): boolean {
  return /定位|品牌定位|心智|差异化|价格带|客群画像|品类分析|品牌调性/.test(
    message.toLowerCase(),
  );
}

/** 纯定位优先 M-PNT；「开店」总包仍可走 Launch */
export function shouldUseMPntAgent(message: string): boolean {
  const launch = detectLaunchIntent(message);
  if (launch.intentType === "branding") return true;
  if (detectPositioningIntent(message) && !/准备开|计划开|想开店|开一家|第一次开店/.test(message)) {
    return true;
  }
  return false;
}
```

扩展 branding 关键词（与产品一致）：`/定位|品牌|品类|差异化|心智/`。

导出：`packages/mealkey-core/src/index.ts` 增加 `detectPositioningIntent`, `shouldUseMPntAgent`。

### 2.2 `problem-understanding.ts` fallback

```typescript
if (lower.includes("品牌") || lower.includes("定位") || lower.includes("品类")) {
  realProblem = "positioning_strategy";
  capabilities.push(
    "positioning", "brand", "market_analysis",
    "category_analysis", "customer_portrait", "price_positioning",
    "competitor_analysis", "differentiation", "brand_tonality",
  );
}
```

### 2.3 Orchestrator / agent-os.service

```typescript
// 伪代码
if (shouldUseMPntAgent(message) && projectId) {
  yield { type: "route", agentPath: "m-pnt", fallback: false };
  const result = await runtime.runSync("m-pnt", mission, execContext, context);
  ...
}
```

注册：

```typescript
runtime.registry.register(MPntAgent);
// 或 registry.registerBatch(allAgents)
```

### 验收

| 用户话术 | 期望路由 |
|---|---|
| 「帮我做湘菜品牌定位」 | m-pnt |
| 「想在长沙开一家湘菜馆，全面评估」 | launch（可再 sub-mission 调 m-pnt） |
| 「这个月流水怎么优化」 | chief |

---

## PR-3：知识与记忆

### 知识

- 将 `m-pnt/knowledge/seeds.ts` 内容 seed 到 knowledge-engine 或 Prisma KnowledgeNode  
- tags: `["m-pnt", "定位", 品类名]`  
- `getContextForAgent("m-pnt", ...)` 可召回  

### 记忆

执行后：

```typescript
await memoryEngine.saveDecision(projectId, "m-pnt", {
  type: "positioning",
  summary: decision.judgement,
  reasoning: decision.strategy,
  confidence: decision.confidence,
});
```

- [ ] 二次对话能读到上次定位结论  

---

## PR-4：LLM 化联调

M-PNT 已内置：

```typescript
import { runMPnt, createMockLlm } from "@mealkey/agents";
// 或 monorepo 内
import { createLLMAdapter } from "@mealkey/agent-runtime";

await runMPnt(context, mission, {
  mode: "hybrid", // llm | heuristic | hybrid
  llm: createLLMAdapter({ provider: "deepseek", apiKey }),
});
```

| mode | 行为 |
|---|---|
| `heuristic` | 规则引擎（无 Key、可测） |
| `llm` | 纯 LLM，失败抛错 |
| `hybrid` | LLM 优先，失败回落启发式 |

Capability 通过 `withLlm()` 包装，**不改** `CapabilityDefinition.execute` 签名。

---

## 三理论 × 母体 Workflow 映射（合入说明）

```text
1-4 品类/客群/价格/竞争  → Situation/Insight
5 差异化               → Position + Ries/Trout/Ye
6 品牌调性             → Strategy 表达
7 final_positioning    → Cross-Fire/Synthesis → MKDecision
```

禁止在 monorepo 改 `protocols.ts`（Frozen）。

---

## 回滚

1. `allAgents` 去掉 `MPntAgent`  
2. 路由条件回退  
3. 删除 `src/m-pnt`  

无 DB migration 时回滚成本低。

---

## 检查清单汇总

- [x] M-PNT 仓实现完整（manifest/workflow/6 cap/prompt/report/tests）  
- [x] LLM hybrid 层 + mock 测试  
- [x] MKDecision 无 payload 扩展（structured evidence）  
- [x] 拷贝至 Mealkey Agent `packages/agents/src/m-pnt`  
- [x] 注册 allAgents（Launch + MPnt）  
- [x] intent：`detectPositioningIntent` / `shouldUseMPntAgent` + problem-understanding  
- [x] monorepo `@mealkey/agents` build 通过  
- [x] 产品 service 层：`apps/web/src/server/services/m-pnt.service.ts`  
- [x] `agent.service` 意图路由 M-PNT / forceAgent  
- [x] UI：`/projects/[id]/positioning` + World/Meeting 入口  
- [x] 决策 / 记忆 / 报告 / AgentRun 落库  
- [x] tRPC：positioningMeta / History / Reports  
- [ ] 真 LLM e2e（配 DEEPSEEK_API_KEY 后 hybrid 自动启用）  
- [ ] orchestrator 层与 service 层统一（当前产品路径已在 agent.service）
