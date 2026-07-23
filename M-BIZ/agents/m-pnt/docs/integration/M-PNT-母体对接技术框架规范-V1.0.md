# M-PNT 餐饮定位 Agent — 母体对接技术框架规范

> 版本: V1.0  
> 对齐: MealKey 7 Frozen Protocols  
> 参考: LaunchAgent 实现规范  
> 日期: 2026-07

---

## 目录

1. [母体架构总览](#1-母体架构总览)
2. [7 Frozen Protocols 对接规范](#2-7-frozen-protocols-对接规范)
3. [Agent 注册规范](#3-agent-注册规范)
4. [Workflow 工作流规范](#4-workflow-工作流规范)
5. [Capability 能力注册规范](#5-capability-能力注册规范)
6. [Knowledge 知识对接规范](#6-knowledge-知识对接规范)
7. [Memory 记忆系统对接规范](#7-memory-记忆系统对接规范)
8. [ChiefAgent 调度对接规范](#8-chiefagent-调度对接规范)
9. [目录结构与文件规范](#9-目录结构与文件规范)
10. [M-PNT 领域知识体系](#10-m-pnt-领域知识体系)

---

## 1. 母体架构总览

### 1.1 系统分层

```
┌──────────────────────────────────────────────────────────┐
│                    Client Layer (Next.js)                 │
│  /dashboard /projects /advisor /report /score /knowledge │
├──────────────────────────────────────────────────────────┤
│                   Service Layer (tRPC)                    │
│  agent-os.service.ts → chief-agent.factory.ts            │
├──────────────────────────────────────────────────────────┤
│                   Agent Core Layer                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ChiefAgent (统一入口)                            │   │
│  │   ↓ ProblemUnderstanding → LLM Judgment Chain    │   │
│  │   ↓ RiskAnalysis → ToolExec → DecisionGen        │   │
│  │   ↓ 需要专业能力时 → 调度子 Agent (M-PNT等)       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AgentRuntime (子 Agent 执行引擎)                  │   │
│  │  AgentRegistry → WorkflowEngine → CapabilityReg  │   │
│  │  MissionRouter → LLMAdapter → Sandbox            │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│                   Data Layer (Prisma)                     │
│  Owner → Project → Decision → Memory → KnowledgeNode    │
│  Conversation → Message → Report → AgentRun → Mission   │
└──────────────────────────────────────────────────────────┘
```

### 1.2 M-PNT 在母体中的位置

M-PNT（餐饮定位 Agent）作为标准子 Agent 注册到 `@mealkey/agents` 包中，与 LaunchAgent 同级。

**调度路径**：
```
用户消息 → ChiefAgent
  → ProblemUnderstandingEngine 识别 "定位" 意图
  → detectIntent() 判断需要 M-PNT
  → AgentRuntime.run("m-pnt", mission, context)
    → WorkflowEngine 执行 5 步定位工作流
    → CapabilityRegistry 调用定位能力
    → MKDecision 返回给 ChiefAgent
  → ChiefAgent 融合结果 → 生成最终输出
```

---

## 2. 7 Frozen Protocols 对接规范

M-PNT 必须完整对接以下 7 个协议。所有协议类型定义在 `@mealkey/agent-sdk` 的 `protocols.ts` 中，**不允许修改**。

### Protocol 1: Context（MKContext）

M-PNT 接收的输入上下文：

```typescript
interface MKContext {
  owner: OwnerContext;     // 经营者画像
  project: ProjectContext; // 项目信息（品类/城市/预算/阶段）
  memories: MemoryContext[];    // 历史记忆
  decisions: DecisionContext[]; // 历史决策
  knowledge: KnowledgeContext;  // 行业知识
}
```

**M-PNT 特别关注的 Context 字段**：

| 字段 | 路径 | 用途 |
|------|------|------|
| `project.category` | `context.project.category` | 品类（湘菜/火锅/茶饮） |
| `project.city` | `context.project.city` | 所在城市 |
| `project.stage` | `context.project.stage` | 项目阶段 |
| `project.budget` | `context.project.budget` | 预算金额 |
| `project.profile` | `context.project.profile` | 扩展信息（面积/客群/风格） |
| `owner.experience` | `context.owner.experience` | 经营者经验 |
| `owner.strengths` | `context.owner.strengths` | 能力优势 |
| `owner.weaknesses` | `context.owner.weaknesses` | 能力盲区 |

### Protocol 2: MKDecision（输出格式）

M-PNT 所有输出必须生产 MKDecision：

```typescript
interface MKDecision {
  id: string;                    // unique id
  problem: string;               // "品牌定位策略"
  observation: string;           // 观察到的市场/经营者现状
  diagnosis: string;             // 定位问题诊断
  judgement: string;             // 定位判断结论
  strategy: string;              // 定位策略建议
  action: string;                // 具体执行行动
  confidence: number;            // 0-1 置信度
  evidence: Evidence[];          // 支撑证据链
}
```

### Protocol 3: Memory（记忆接口）

M-PNT 通过 MemoryEngine 接口读写记忆：

```typescript
// 读取记忆
const memories = await memoryEngine.getContextForAgent(projectId, "m-pnt");
// → { memories: [...], recentDecisions: [...] }

// 写入决策记忆
await memoryEngine.saveDecision(projectId, "m-pnt", {
  type: "positioning",
  summary: "定位结论",
  reasoning: "推理过程",
  confidence: 0.8,
});
```

### Protocol 4: Agent Manifest（Agent 身份证）

M-PNT 的 Manifest 定义（详见章节 3）。

### Protocol 5: Capability（能力注册）

M-PNT 注册的能力（详见章节 5）。

### Protocol 6: Mission（Agent 间通信）

M-PNT 通过 Mission 接收 ChiefAgent 的调度，也可以产生 sub-Mission 调用其他 Agent。

### Protocol 7: AgentRun（执行追踪）

每次 M-PNT 执行都被记录在 AgentRun 表中，用于复盘和优化。

---

## 3. Agent 注册规范

### 3.1 Manifest 定义

文件位置: `packages/agents/src/m-pnt/manifest.ts`

```typescript
import type { AgentManifestLegacy } from "@mealkey/agent-sdk";

export const mPntManifest: AgentManifestLegacy = {
  id: "m-pnt",
  name: "MealKey 餐饮定位顾问",
  version: "1.0.0",
  description: "帮助餐饮创业者完成品牌定位决策，包括品类分析、客群定义、价格带定位、差异化策略",
  category: "positioning",
  capabilities: [
    "category_analysis",      // 品类分析
    "customer_portrait",      // 客群画像
    "price_positioning",      // 价格带定位
    "competitor_analysis",    // 竞品分析
    "differentiation",        // 差异化策略
    "brand_tonality",         // 品牌调性
  ],
  pricing: {
    type: "one_time",
    price: 49900,
    currency: "CNY",
  },
  permissions: {
    knowledge: true,
    project: true,
    memory: true,
  },
};
```

### 3.2 注册到 Agent 矩阵

文件位置: `packages/agents/src/index.ts`（修改现有文件）

```typescript
import { LaunchAgent } from "./launch";
import { MPntAgent } from "./m-pnt";  // 新增

export const allAgents: AgentDefinition[] = [
  LaunchAgent,
  MPntAgent,  // 新增
];

export { LaunchAgent } from "./launch";
export { MPntAgent } from "./m-pnt";  // 新增
```

### 3.3 Agent 入口定义

文件位置: `packages/agents/src/m-pnt/index.ts`

```typescript
import type { AgentDefinition } from "@mealkey/agent-sdk";
import { mPntManifest } from "./manifest";
import { mPntWorkflow } from "./workflow";
import { mPntCapabilities } from "./capabilities";
import { M_PNT_SYSTEM_PROMPT } from "./prompts/system";
import { mPntReportTemplate } from "./reports/template";

export const MPntAgent: AgentDefinition = {
  manifest: mPntManifest as AgentDefinition["manifest"],
  workflow: mPntWorkflow as AgentDefinition["workflow"],
  capabilities: mPntCapabilities,
  prompt: M_PNT_SYSTEM_PROMPT,
};

export { mPntManifest } from "./manifest";
export { mPntWorkflow } from "./workflow";
export { mPntCapabilities } from "./capabilities";
export { M_PNT_SYSTEM_PROMPT } from "./prompts/system";
export { mPntReportTemplate } from "./reports/template";
```

---

## 4. Workflow 工作流规范

### 4.1 工作流定义

文件位置: `packages/agents/src/m-pnt/workflow.ts`

```typescript
import type { Workflow } from "@mealkey/agent-sdk";

/**
 * M-PNT 定位工作流
 *
 * 流程: 理解品类 → 分析客群 → 定位价格 → 竞争分析 → 差异化策略 → 品牌调性 → 最终决策
 *
 * 每步调用 LLM，上一步结果是下一步的上下文。
 */
export const mPntWorkflow: Workflow = {
  name: "餐饮定位分析流程",
  description: "系统化的餐饮品牌定位决策流程，从品类理解到定位决策",

  steps: [
    {
      id: "category_analysis",
      name: "品类分析",
      type: "analysis",
      capabilities: ["category_analysis"],
      knowledge: ["market_data", "category_benchmarks"],
      prompt: `你正在为一家餐饮项目进行品类分析。

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}
- 预算: {{project.budget}}

经营者画像：
- 经验: {{owner.experience}}
- 优势: {{owner.strengths}}
- 盲区: {{owner.weaknesses}}

分析维度：
1. 该品类在目标城市的市场容量和增长趋势
2. 品类生命周期阶段（导入期/成长期/成熟期/衰退期）
3. 品类竞争饱和度
4. 该品类与创业者资源的匹配度
5. 品类的标准化程度和复制难度

请给出品类评估结论。`,
      next: "customer_portrait",
    },
    {
      id: "customer_portrait",
      name: "客群画像",
      type: "analysis",
      capabilities: ["customer_portrait"],
      knowledge: ["consumer_insights", "demographic_data"],
      prompt: `基于品类分析结果，定义目标客群画像：

品类分析结果：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}

分析维度：
1. 核心客群的人口统计学特征（年龄/性别/收入/职业）
2. 消费场景（日常用餐/社交聚会/商务宴请/外卖）
3. 消费能力和意愿（客单价区间）
4. 消费决策因素（口味/环境/价格/便利性）
5. 客群规模和增长潜力

请给出清晰的目标客群定义。`,
      next: "price_positioning",
    },
    {
      id: "price_positioning",
      name: "价格带定位",
      type: "analysis",
      capabilities: ["price_positioning"],
      knowledge: ["pricing_benchmarks", "cost_models"],
      prompt: `基于品类分析和客群画像，确定价格带定位：

客群画像：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 预算: {{project.budget}}万
- 目标客群: 见客群分析

分析维度：
1. 品类价格带分布（低端/中端/高端价格区间）
2. 目标客群的客单价接受范围
3. 成本结构倒推（食材成本30-35%、人力20-25%、租金10-15%）
4. 竞争定价对标分析
5. 建议价格带及其盈利模型推演

请给出价格带定位建议。`,
      next: "competitor_analysis",
    },
    {
      id: "competitor_analysis",
      name: "竞争分析",
      type: "analysis",
      capabilities: ["competitor_analysis"],
      knowledge: ["competitive_landscape", "industry_benchmarks"],
      prompt: `基于定位方向，进行竞争分析：

价格定位和客群分析：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 区域: {{project.district}}

分析维度：
1. 直接竞争对手（同品类/同价格带/同区域）
2. 间接竞争对手（替代品类/不同价格带）
3. 各竞品的市场份额和优劣势
4. 竞争壁垒分析
5. 差异化空间判断

请给出竞争格局评估和差异化机会。`,
      next: "differentiation",
    },
    {
      id: "differentiation",
      name: "差异化策略",
      type: "strategy",
      capabilities: ["differentiation"],
      knowledge: ["positioning_cases", "success_factors"],
      prompt: `基于竞争分析，制定差异化策略：

竞争分析和定位方向：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 城市: {{project.city}}
- 创业者优势: {{owner.strengths}}

分析维度：
1. 产品差异化（口味创新/品类融合/出品形式）
2. 体验差异化（空间设计/服务模式/场景营造）
3. 品牌差异化（故事/价值观/视觉体系）
4. 运营差异化（效率/标准化/供应链）
5. 可执行性评估（基于创业者的资源和能力）

请给出可执行的差异化策略建议。`,
      next: "brand_tonality",
    },
    {
      id: "brand_tonality",
      name: "品牌调性",
      type: "strategy",
      capabilities: ["brand_tonality"],
      knowledge: ["branding_frameworks", "success_cases"],
      prompt: `基于差异化策略，定义品牌调性：

差异化策略：
{{previousResults}}

项目信息：
- 品类: {{project.category}}
- 目标客群: 见客群分析

分析维度：
1. 品牌核心价值主张
2. 品牌人格和调性（专业/温暖/潮流/高端）
3. 视觉风格建议（色彩/字体/空间风格）
4. 品牌故事线
5. 品牌传播策略（线上/线下/口碑）

请给出完整的品牌调性定义。`,
      next: "final_positioning",
    },
    {
      id: "final_positioning",
      name: "定位决策",
      type: "decision",
      prompt: `基于以上所有分析，给出最终的定位决策建议：

分析结果汇总：
{{previousResults}}

请输出以下 JSON 格式的定位决策：
{
  "type": "positioning",
  "focus": "overall",
  "summary": "一句话定位结论",
  "confidence": 85,
  "brandPositioning": {
    "category": "品类定位",
    "targetCustomers": "目标客群",
    "priceRange": "价格带",
    "differentiation": "差异化核心",
    "brandTonality": "品牌调性"
  },
  "keyFindings": [
    { "dimension": "品类", "conclusion": "...", "confidence": 85 },
    { "dimension": "客群", "conclusion": "...", "confidence": 80 },
    { "dimension": "价格", "conclusion": "...", "confidence": 75 },
    { "dimension": "竞争", "conclusion": "...", "confidence": 70 },
    { "dimension": "差异化", "conclusion": "...", "confidence": 65 }
  ],
  "risks": [
    { "risk": "风险描述", "level": "high|medium|low", "mitigation": "缓解措施" }
  ],
  "nextSteps": [
    { "step": "第一步", "priority": "high", "timeline": "1-2周" }
  ]
}`,
      output: "final",
    },
  ],
};
```

### 4.2 Workflow 设计原则

1. **每步一个能力** — 一个步骤只调用一个 Capability，职责单一
2. **知识注入** — 每步通过 `knowledge` 字段注入领域知识
3. **上一步结果是下一步上下文** — 通过 `{{previousResults}}` 引用
4. **最后一步输出决策** — `type: "decision"`, `output: "final"`
5. **步骤数量 5-7 步** — 覆盖从输入到决策的完整判断链

---

## 5. Capability 能力注册规范

### 5.1 能力定义标准模板

每个 Capability 是一个独立的文件，遵循以下模板：

文件位置: `packages/agents/src/m-pnt/capabilities/*.ts`

```typescript
import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export const [name]Capability: CapabilityDefinition = {
  id: "[capability-id]",
  name: "[能力名称]",
  description: "[能力描述]",
  domain: "[领域分类]",
  inputSchema: {
    type: "object",
    properties: {
      // 输入参数
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      // 输出参数
    },
  },

  async execute(input: unknown, context: MKContext): Promise<MKDecision> {
    // 1. 从 context 提取项目/经营者信息
    // 2. 从 input 提取用户输入参数
    // 3. 执行领域逻辑（规则引擎/LLM/数据查询）
    // 4. 返回 MKDecision

    return {
      id: `[capability]_${Date.now()}`,
      problem: `${context.project.name} [能力]`,
      observation: `基于...的观察`,
      diagnosis: `诊断结果`,
      judgement: `判断结论`,
      strategy: `策略建议`,
      action: `具体行动`,
      confidence: 0.7, // 0-1
      evidence: [
        {
          source: "observation",
          content: "证据内容",
          relevance: 0.8,
        },
      ],
    };
  },
};
```

### 5.2 M-PNT 能力清单

| 能力 ID | 能力名称 | 输入 | 输出 | 领域 |
|---------|----------|------|------|------|
| `category_analysis` | 品类分析 | 品类/城市/预算 | 品类评估/匹配度 | analysis |
| `customer_portrait` | 客群画像 | 品类/区域/客单价 | 客群定义/消费场景 | analysis |
| `price_positioning` | 价格带定位 | 品类/客群/成本 | 价格建议/盈利模型 | strategy |
| `competitor_analysis` | 竞品分析 | 品类/城市/区域 | 竞争格局/差异化空间 | analysis |
| `differentiation` | 差异化策略 | 竞品/创业者优势 | 差异化方案 | strategy |
| `brand_tonality` | 品牌调性 | 差异化/客群 | 品牌定义/视觉风格 | strategy |

### 5.3 能力注册

文件位置: `packages/agents/src/m-pnt/capabilities/index.ts`

```typescript
import type { CapabilityDefinition } from "@mealkey/agent-sdk";
import { categoryAnalysisCapability } from "./category-analysis";
import { customerPortraitCapability } from "./customer-portrait";
import { pricePositioningCapability } from "./price-positioning";
import { competitorAnalysisCapability } from "./competitor-analysis";
import { differentiationCapability } from "./differentiation";
import { brandTonalityCapability } from "./brand-tonality";

export const mPntCapabilities: CapabilityDefinition[] = [
  categoryAnalysisCapability,
  customerPortraitCapability,
  pricePositioningCapability,
  competitorAnalysisCapability,
  differentiationCapability,
  brandTonalityCapability,
];
```

---

## 6. Knowledge 知识对接规范

### 6.1 M-PNT 需要的知识体系

M-PNT 需要以下 5 类领域知识，注入到 `@mealkey/knowledge-engine` 或 `@mealkey/core` 的知识存储中：

#### 6.1.1 品类知识 (Category Knowledge)

```typescript
// 示例：品类基准数据
{
  id: "CAT-BENCH-001",
  type: "FACT",
  title: "湘菜品类基准",
  category: "品类知识",
  content: {
    question: "湘菜的市场基准是什么？",
    answer: "湘菜全国门店约12万家，主要集中在湖南、广东、浙江。客单价区间60-120元，食材成本率32-38%，翻台率2.0-3.5。",
    conditions: [{ field: "category", operator: "=", value: "湘菜" }],
  },
  scenario: ["品类分析", "价格定位"],
  confidence: 0.85,
  source: "industry_report_2025",
  tags: ["湘菜", "品类基准", "经营指标"],
}
```

#### 6.1.2 价格带规则 (Pricing Rules)

```typescript
// 示例：价格带判断规则
{
  id: "PRICE-RULE-001",
  type: "RULE",
  title: "中餐价格带判断",
  category: "价格定位",
  content: {
    question: "如何判断中餐品类的合适价格带？",
    conditions: [
      { field: "category", operator: "in", value: ["湘菜","川菜","粤菜","家常菜"], logic: "AND" },
      { field: "city_tier", operator: "in", value: ["一线","新一线"], logic: "AND" },
    ],
    judgement: "一线城市中餐客单价基准60-120元",
    recommendation: "建议定位中端80-100元区间，覆盖最大客群",
    risk: "若定位高于120元，需品牌力支撑，翻台率可能低于1.5",
  },
  scenario: ["价格定位", "投资评估"],
  confidence: 0.85,
  source: "industry_benchmark",
}
```

#### 6.1.3 客群画像数据 (Customer Data)

品类 × 城市 × 价格带 → 客群画像映射。
包含：年龄分布、收入水平、消费频次、场景偏好。

#### 6.1.4 竞争分析框架 (Competition Framework)

品类饱和度判断模型：
- 每万人门店数 < 5: 蓝海
- 5-10: 适度竞争
- 10-20: 饱和竞争
- > 20: 红海

#### 6.1.5 差异化案例库 (Positioning Cases)

40+ 成功/失败定位案例，按品类/城市/场景索引。

### 6.2 知识接入方式

#### 方式 A：内置知识（强相关数据，随 Agent 发布）

在 `packages/knowledge-engine/src/models/` 或 `packages/knowledge-engine/src/rules/` 中添加 M-PNT 领域数据。

#### 方式 B：数据库存储（通过 Prisma KnowledgeNode）

通过 seed 脚本写入数据库：

```typescript
// prisma/seed-knowledge.ts 中添加
await prisma.knowledgeNode.create({
  data: {
    title: "湘菜品类定位指南",
    content: JSON.stringify({...}),
    type: "rule",
    categoryId: positioningCategory.id,
    tags: JSON.stringify(["品类分析", "湘菜"]),
    status: "published",
  },
});
```

#### 方式 C：Workflow 中注入

在工作流每步的 `knowledge` 字段引用知识分类，由 AgentRuntime 自动注入：

```typescript
knowledge: ["market_data", "category_benchmarks"]
```

### 6.3 Core 中的知识接口对接

M-PNT 通过 ChiefAgent 的 `knowledgeEngine` 获取知识：

```typescript
// AgentRuntime 中的知识注入流程
const knowledgeTexts = await knowledgeEngine.getContextForAgent(
  "m-pnt",
  projectId,
  query,  // 自动基于 project.category + project.stage 构建
  5       // topK
);
```

---

## 7. Memory 记忆系统对接规范

### 7.1 M-PNT 读写记忆的类型

| 记忆层 | 写入场景 | 读取场景 |
|--------|----------|----------|
| `decision` | 每次定位决策后保存 | 下次定位时参考历史判断 |
| `learning` | 用户反馈偏差后保存 | 后续定位时避免重复错误 |
| `project` | 定位策略更新项目状态 | 获取项目最新定位信息 |
| `preference` | 用户倾向记录 | 个性化定位建议 |

### 7.2 记忆读写接口

M-PNT 不直接调用 MemoryStorage（那是 Data Layer 的职责），而是通过 AgentRuntime 的 memoryEngine 接口：

```typescript
// AgentRuntime 自动完成的记忆流程
// 1. 执行前读取
const memoryContext = await memoryEngine.getContextForAgent(projectId, "m-pnt");
// → { memories: [...], recentDecisions: [...] }

// 2. 执行后保存
await memoryEngine.saveDecision(projectId, "m-pnt", {
  type: "positioning",
  summary: "定位结论",
  reasoning: "完整推理",
  confidence: 0.85,
});
```

### 7.3 反馈闭环

用户在 UI 上对 M-PNT 的定位决策给出反馈（正面/负面）时：

```typescript
// feedback 落库到 Memory learning 层
await memoryEngine.save(input.userId, {
  layer: "learning",
  key: `feedback_${projectId}_${Date.now()}`,
  value: {
    type: feedback.helpful ? "positive_feedback" : "negative_feedback",
    problem: "定位推荐",
    comment: feedback.comment,
  },
  importance: 0.8,
  source: "feedback",
  projectId,
});
```

下次 M-PNT 执行时，AgentRuntime 自动加载反馈记忆注入到 Prompt：

```
## 历史反馈
之前对"XX定位"的判断，用户反馈有偏差：位置选型过于保守
```

---

## 8. ChiefAgent 调度对接规范

### 8.1 Intent 识别

在 `@mealkey/core` 的 `intent-detector.ts` 中注册 M-PNT 的意图识别规则：

```typescript
// 在 detectLaunchIntent 同级的 detectPositioningIntent
export function detectPositioningIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /定位|品牌|品类|做什么菜|什么品类|差异化|定位策略/.test(lower);
}
```

### 8.2 ProblemUnderstanding 对接收

M-PNT 所需的 `requiredCapabilities` 在 `ProblemUnderstandingEngine` 中映射：

```typescript
// problem-understanding.ts 的 fallbackAnalyze 中增加
if (lower.includes("品牌") || lower.includes("定位") || lower.includes("品类")) {
  realProblem = "positioning_strategy";
  capabilities.push("positioning", "brand", "market_analysis");
}
```

### 8.3 AgentRuntime 调用

在 service 层，ChiefAgent 通过 AgentRuntime 调度 M-PNT：

```typescript
// agent-os.service.ts
const runtime = createRuntime({
  llm: { provider: "deepseek", apiKey },
  knowledgeEngine: new KnowledgeEngine(storage),
  memoryEngine: new MemoryEngine(storage),
});

// 注册 M-PNT
runtime.registry.register(MPntAgent);

// 调度
const result = await runtime.runSync("m-pnt", mission, execContext, context);
```

---

## 9. 目录结构与文件规范

### 9.1 M-PNT 包目录结构

```
packages/agents/src/m-pnt/
├── index.ts                    # Agent 入口，导出 MPntAgent
├── manifest.ts                 # Agent Manifest 定义
├── workflow.ts                 # 7 步定位工作流
├── capabilities/
│   ├── index.ts                # 能力注册聚合
│   ├── category-analysis.ts    # 品类分析
│   ├── customer-portrait.ts    # 客群画像
│   ├── price-positioning.ts    # 价格带定位
│   ├── competitor-analysis.ts  # 竞品分析
│   ├── differentiation.ts      # 差异化策略
│   └── brand-tonality.ts       # 品牌调性
├── prompts/
│   └── system.ts               # 系统提示词
└── reports/
    └── template.ts             # 报告模板
```

### 9.2 知识数据目录（可选）

```
packages/knowledge-engine/src/
├── positioning/                # M-PNT 领域知识
│   ├── categories.ts           # 品类基准数据
│   ├── pricing.ts              # 价格带规则
│   ├── customers.ts            # 客群画像数据
│   └── cases.ts                # 定位案例库
├── rules/
│   └── positioning-rules.ts    # 定位决策规则
└── index.ts                    # 导出聚合
```

### 9.3 测试文件

```
tests/test-m-pnt.ts             # M-PNT 单元测试
├── manifest 验证
├── workflow 步骤验证
├── capabilities 执行验证
└── 知识规则匹配验证
```

### 9.4 Agent 产品注册

修改 `packages/agents/src/index.ts`：

```typescript
import { LaunchAgent } from "./launch";
import { MPntAgent } from "./m-pnt";  // ← 新增

export const allAgents: AgentDefinition[] = [
  LaunchAgent,
  MPntAgent,  // ← 新增
];

export { LaunchAgent } from "./launch";
export { MPntAgent } from "./m-pnt";  // ← 新增
```

---

## 10. M-PNT 领域知识体系

### 10.1 五层知识架构

```
Layer 1: FACT — 事实知识
├── 品类基准数据（20+ 品类的经营指标）
├── 城市餐饮数据（各城市品类分布/人均消费）
└── 价格带分布（各品类各城市价格区间）

Layer 2: RULE — 经营规则（30+）
├── 品类选择规则
├── 价格带判断规则
├── 客群匹配规则
└── 差异化可行性规则

Layer 3: CASE — 案例库（20+）
├── 成功定位案例（品类×城市×价格带）
├── 失败定位案例（常见错误模式）
└── 差异化成功案例

Layer 4: MODEL — 经营模型（5+）
├── 品类吸引力评估模型
├── 价格带利润模型
├── 竞争饱和度模型
├── 客群规模估算模型
└── 定位成功率预测模型

Layer 5: EXPERIENCE — 大师经验（15+）
├── 品类选择经验
├── 定位陷阱识别
├── 差异化原则
└── 品牌建设心法
```

### 10.2 核心数据维度

M-PNT 需要维护以下核心数据映射表：

| 维度 | 数据内容 | 来源 |
|------|----------|------|
| 品类×城市 | 各品类在各城市的门店数/增长率/饱和度 | 行业报告/公开数据 |
| 品类×价格带 | 各品类的低/中/高价格带区间 | 行业基准/实地调研 |
| 城市×消费力 | 各城市人均餐饮消费/客单价分布 | 统计局/行业报告 |
| 品类×客群 | 各品类的核心客群画像 | 消费者调研 |
| 品类×成本 | 各品类的食材/人力/租金成本率 | 行业基准 |
| 品类×标准化 | 各品类的标准化难度/可复制性 | 专家评估 |

### 10.3 判断模型

M-PNT 需要注册以下判断模型到 `@mealkey/core` 的 `cognition/models/`：

#### 10.3.1 品类吸引力评估模型

```
评估维度：
  市场机会 (权重 30%)
    ├── 品类增长率 (0-100) × 40%
    └── 品类规模 (0-100) × 60%
    竞争环境 (权重 25%)
    ├── 饱和度指数 (0-100) × 50%
    └── 差异化空间 (0-100) × 50%
    资源匹配 (权重 25%)
    ├── 经验匹配度 (0-100) × 50%
    └── 资金匹配度 (0-100) × 50%
    可执行性 (权重 20%)
    ├── 标准化难度 (0-100) × 40%
    └── 复制难度 (0-100) × 60%
```

#### 10.3.2 定位风险评估模型

```
风险等级计算：
  品类风险 × 30% + 价格风险 × 25% +   竞争风险 × 25% + 执行风险 × 20%
    品类风险 = f(品类生命周期阶段)
  价格风险 = f(价格带 vs 客群消费力差额)
  竞争风险 = f(区域饱和度指数)
  执行风险 = f(创业者经验匹配度)
```

---

## 附录

### A. 参考文件

| 文件 | 内容 |
|------|------|
| `packages/agents/src/launch/manifest.ts` | LaunchAgent Manifest 参考实现 |
| `packages/agents/src/launch/workflow.ts` | LaunchAgent 工作流参考实现 |
| `packages/agents/src/launch/capabilities/positioning.ts` | 已有定位能力参考 |
| `packages/agents/src/launch/prompts/system.ts` | 系统提示词参考 |
| `packages/agents/src/launch/reports/template.ts` | 报告模板参考 |
| `packages/agent-runtime/src/agent-runtime.ts` | AgentRuntime 执行器 |
| `packages/agent-runtime/src/registry.ts` | Agent 注册中心 |
| `packages/agent-runtime/src/capability-registry.ts` | 能力注册中心 |
| `packages/agent-runtime/src/workflow-engine.ts` | 工作流引擎 |
| `packages/mealkey-core/src/agent/chief-agent.ts` | ChiefAgent 调度入口 |
| `packages/mealkey-core/src/agent/intent-detector.ts` | 意图检测器 |
| `packages/mealkey-core/src/agent/problem-understanding.ts` | 问题理解引擎 |
| `packages/knowledge-engine/src/types.ts` | 知识类型定义 |
| `packages/memory-engine/src/types.ts` | 记忆类型定义 |

### B. 对接检查清单

- [x] Manifest 定义完成（id/name/version/capabilities/pricing）
- [x] Workflow 7 步流程定义完成
- [x] 6 个 Capability 全部实现
- [x] 系统提示词编写完成
- [x] 报告模板定义完成
- [x] Agent 注册到 `packages/agents/src/index.ts`（本仓；合入 monorepo 时并列 LaunchAgent）
- [x] 意图检测规则实现（`m-pnt/protocols/intent-detector.ts`，待合入 core）
- [x] ProblemUnderstanding 能力映射片段（`mapPositioningProblem`）
- [x] 领域知识种子（`m-pnt/knowledge/seeds.ts`，待注入 knowledge-engine）
- [x] 测试文件编写（manifest/workflow/capabilities）
- [ ] 记忆读写验证（输入/输出闭环）— 依赖母体 MemoryEngine
- [ ] AgentRuntime 真跑联调 — 依赖母体 monorepo；本仓 `runMPnt` 可离线跑通

落地说明见：[对接落地状态.md](./对接落地状态.md)
