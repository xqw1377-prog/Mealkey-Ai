# MealKey 调用 M-PNT 说明

M-PNT 是 MealKey 生态下的一个专项 Agent，与 LaunchAgent 同级。
调用入口统一通过 `@mealkey/agents` 包。

---

## 方式一：全链路定位决策（推荐）

```typescript
import { runMPnt } from "@mealkey/agents";
import { getLLMAdapter } from "@mealkey/agent-runtime";
import type { MKContext } from "@mealkey/agent-sdk";

// 1. 构建项目上下文
const context: MKContext = {
  owner: {
    experience: "8年湘菜后厨与门店运营",
    strengths: ["招牌剁椒鱼头", "本地食材供应链"],
    weaknesses: ["品牌表达弱"],
  },
  project: {
    id: "proj_123",
    name: "长沙·湘菜项目",
    category: "湘菜",
    city: "长沙",
    district: "五一商圈",
    stage: "筹备",
    budget: 100,
  },
  memories: [],
  decisions: [],
  knowledge: {},
};

// 2. 调用 M-PNT（所有Capability由LLM驱动 + 竞争数据注入）
const result = await runMPnt(
  context,
  { id: "mission_001", type: "positioning", goal: "完成湘菜品牌定位" },
  {
    llm: getLLMAdapter(),              // MealKey 大模型适配器（必填）
    runtimeConfig: {
      memoryEngine,                     // 记忆引擎（由orchestrator注入）
      knowledgeEngine,                  // 知识引擎（由orchestrator注入）
    },
    temperature: 0.3,
    maxTokens: 4096,
  },
);

// 3. 使用结果
console.log(result.decision.judgement);       // 定位结论
console.log(result.decision.strategy);         // 策略说明
console.log(result.steps.length);              // 7步
```

## 方式二：Agent 注册（Manifest + Workflow）

```typescript
import { MPntAgent, allAgents } from "@mealkey/agents";
import { LaunchAgent } from "@mealkey/agents";

// 在 orchestrator 中注册
export const agents = [LaunchAgent, MPntAgent];

// 或通过 AgentRuntime 运行
const rt = new AgentRuntime({ registry: { register: (a) => agents.push(a) } });
rt.registry.register(MPntAgent);
```

## 方式三：意图路由（用户消息 → M-PNT）

```typescript
import { detectPositioningIntent, mapPositioningProblem } from "@mealkey/agents";

// 在 orchestrator / agent-os.service 中判断
function handleUserMessage(message: string) {
  if (detectPositioningIntent(message)) {
    return { agentPath: "m-pnt", fallback: false };
  }
  // 否则走 LaunchAgent
}
```

## 方式四：单步 Capability（自定义流程）

```typescript
import { getCapability } from "@mealkey/agents";

const cap = getCapability("differentiation");
const decision = await cap.execute({ previousSummary: "..." }, context);
```

## 输出结构

`result.decision` 是 MKDecision 格式：

```typescript
{
  id: "m-pnt_final_xxx",
  problem: "品牌定位策略",
  observation: "品类:湘菜；客群:家庭聚餐客群；价格:80-100",
  diagnosis: "定位问题集中在心智位置是否独特、有利、可防御",
  judgement: "成为周末家庭聚餐场景的首选湘菜品牌（primary）",
  strategy: "选定理由...不选理由...",
  action: "30天验证：主场景转述测试；锚点套餐毛利验证",
  confidence: 0.85,

  // 结构化扩展（frozen-protocol safe）
  evidence: [
    { source: "structured", content: JSON.stringify({
      decision_recommend: "primary",
      overall_score: 82,
      mind_position_level: "A",
      max_risk_severity: "R2",
      candidates: [ /* 候选方向 */ ],
      distillation: {
        six_dimension: { /* 六维诊断 */ },
        candidates: [ /* 候选方案 */ ],
        red_team: [ /* 红队挑战 */ ],
        quality: { /* 质量校验 */ },
      },
      theory_vote_summary: {
        ries: { preferred: "...", theory_recommend: "recommend" },
        trout: { ... },
        ye_maozhong: { ... },
      },
      mSolution: {
        situation: "...",
        insight: "...",
        position: "...",
        strategy: "...",
        action: "...",
        validation: "...",
        decision: "...",
      },
    })}
  ]
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `M_PNT_RUN_MODE` | `llm` | 运行模式（固定为llm） |
| `M_PNT_TIMEOUT_MS` | `120000` | 全链路超时时间 |

## 依赖

- `@mealkey/agents` — M-PNT Agent 实现
- `@mealkey/agent-sdk` — Frozen Protocols 类型
- `@mealkey/agent-runtime` — LLM适配器、MemoryEngine、KnowledgeEngine
- `@mealkey/core` — orchestrator / intent-detector
