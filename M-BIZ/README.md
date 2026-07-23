# MealKey — 餐饮经营能力增长系统

> 不是 AI 应用，是 AI Operating System。
>
> 普通 AI: 用户输入 → 生成答案
> MealKey: 用户输入 → 理解场景 → 读取记忆 → 识别变量 → 判断链 → 生成决策 → 沉淀学习

## 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  Next.js 14 (App Router) + tRPC + Zustand                       │
│  /dashboard /projects /advisor /report /score /knowledge        │
├──────────────────────────────────────────────────────────────────┤
│                       Service Layer                              │
│  agent.service (编排层) / project.service / report.service      │
│  knowledge.service / memory.service                             │
├──────────────────────────────────────────────────────────────────┤
│                      Agent Core Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ChiefAgent (统一入口) — LLM 驱动五步判断链                │   │
│  │  ProblemUnderstanding → LLM Judgment → RiskAnalysis      │   │
│  │  → ToolExecution → DecisionGen → Challenge → Memory      │   │
│  │  ↓ LLM 失败时: DefaultJudgmentChain (50+ 规则降级)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  AgentRuntime (独立层，为未来多 Agent 预留)                       │
├──────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│  Prisma + SQLite: User → Owner → Project → Decision → Memory   │
│  KnowledgeNode → Conversation → Message → Report               │
└──────────────────────────────────────────────────────────────────┘
```

## 9 Packages

| Package | 版本 | 职责 | 依赖 |
|---------|------|------|------|
| `@mealkey/agent-sdk` | 活跃 | **7 Frozen Protocols** + 类型 + 工具函数 | 无 |
| `@mealkey/agent-runtime` | 活跃 | **Agent 操作系统内核**: WorkflowEngine, MissionRouter, CapabilityRegistry, LLMAdapter | agent-sdk |
| `@mealkey/core` | 活跃 | **经营智能层**: ChiefAgent(LLM驱动), KnowledgeEngine, MemoryEngine, CognitionEngine, IntentDetector | agent-sdk |
| `@mealkey/agents` | 活跃 | **Agent 产品矩阵**: LaunchAgent（开店顾问） | agent-sdk |
| `@mealkey/knowledge-engine` | 活跃 | **知识引擎**（存储无关接口） | 无 |
| `@mealkey/memory-engine` | 活跃 | **记忆引擎**（存储无关接口） | 无 |
| ~~`@mealkey/agent-core`~~ | ❌ 已废弃 | 请使用 agent-runtime + core | — |
| ~~`@mealkey/shared-types`~~ | ❌ 已废弃 | 请使用 agent-sdk | — |
| `@mealkey/web` | ✅ 活跃 | Next.js 前端应用 | agent-sdk, core, agent-runtime, agents |

## 7 Frozen Protocols

| # | 协议 | 核心类型 | 定义位置 |
|---|------|---------|---------|
| 1 | Context | `MKContext`, `OwnerContext`, `ProjectContext` | `protocols.ts` |
| 2 | Decision | `MKDecision`, `Evidence` | `protocols.ts` |
| 3 | Memory | `MemoryEngine`, `MemoryInput`, `MemoryLayer` | `protocols.ts` |
| 4 | Agent Manifest | `AgentManifest` | `protocols.ts` |
| 5 | Capability | `CapabilityDefinition` | `protocols.ts` |
| 6 | Mission | `Mission` | `protocols.ts` |
| 7 | Agent Run | `AgentRun` | `protocols.ts` |

## Agent 执行路径（单一路径）

> ⚠️ **历史更新**: 2025-01 已将 LaunchAgent 工作流路径合并到 ChiefAgent。
> 所有请求现在统一走 ChiefAgent 的 LLM 驱动判断链。

```
用户消息 → ChiefAgent
  1. Problem Understanding (LLM 分析真实意图)
  2. LLM Judgment Chain (5步: 观察→诊断→评估→策略→行动)
     ↓ LLM 失败时降级
     规则判断链 (DefaultJudgmentChain) — 50+ 经营规则打分
  3. Risk Analysis (DefaultRiskAnalyzer — 规则引擎)
  4. Tool Execution (知识搜索 / 经营诊断)
  5. MKDecision 生成 (Protocol 2)
  6. Challenge Engine (反方挑战 — 高风险时自动激活)
  7. Memory Update (记忆更新 + 学习引擎)
  8. AgentRun Tracking (执行记录)
```

## 快速开始

```bash
# 安装依赖
npm install

# 设置环境变量
cp .env.example apps/web/.env
# 编辑 apps/web/.env，填入 DEEPSEEK_API_KEY 与 AUTH_SECRET

# 初始化数据库（SQLite 开发默认）
npm run db:push
# 或迁移：npm run db:migrate

# 写入种子数据（仅初始化知识库）
npm run db:seed

# 启动开发服务器
npm run dev
```

生产 / 本地基建：
- [docs/POSTGRES.md](docs/POSTGRES.md) — SQLite → PostgreSQL
- [docs/BLOB_STORAGE.md](docs/BLOB_STORAGE.md) — 本地 / S3 / MinIO
- CI：`.github/workflows/ci.yml`（typecheck · lint · test · build · postgres smoke）

```bash
# Postgres 一键（需 Docker Desktop）
npm run db:pg:up

# MinIO 对象存储冒烟
npm run db:minio:smoke

# 全量基建
npm run db:infra:up
```

## 种子数据

`npm run db:seed` 会创建：
- 3 个知识分类（定位策略、选址判断、增长策略）
- 3 条知识节点（选址、定位、增长）

真实用户需要通过 `/register` 创建账号，再通过 `/login` 登录进入系统。

## 构建状态

```bash
npx turbo build
# packages + @mealkey/web 均可成功构建
# next build: ✓ Compiled successfully（App Router 全量路由）
```

## 测试

```bash
# 包级 smoke + web vitest
npm test

# 仅 packages
npm run test:packages

# 仅 web（dashboard / blob / rate-limit）
npm run test:web

# 运行所有测试
npx tsx tests/test-agent-sdk.ts
npx tsx tests/test-agent-runtime.ts
npx tsx tests/test-mealkey-core.ts
npx tsx tests/test-engines.ts
npx tsx tests/test-agents.ts
```

当前测试覆盖: **104 个测试用例，全部通过**
- 原有 71 个 + M-PNT 33 个（含 Manifest / Workflow / Capabilities / 三理论矩阵 / 定位知识 / 端到端集成）

> M-PNT ❌ 不自带 LLM，它继承 MealKey 母体的 LLM 能力。
> MealKey 必须配置 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` 才能调用大模型。
> M-PNT 与之共享同一个 API Key，无需单独配置。
