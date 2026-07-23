# MealKey — 餐饮经营 AI 操作系统

> 不是聊天机器人，是持续理解餐饮人的专业 AI 经营大脑。  
> **权威入口：** [`docs/AUTHORITY.md`](docs/AUTHORITY.md)  
> **GitHub 真源：** [xqw1377-prog/Mealkey-Ai](https://github.com/xqw1377-prog/Mealkey-Ai.git)

## 仓库边界（冻结）

| 层 | 路径 | 职责 |
|----|------|------|
| Host | `apps/web` · `apps/mini-shell` | 产品 UI / tRPC / Gateway；微信壳 |
| Core 包 | `packages/*` | SDK · Runtime · Consulting-OS · Brain · Signal · L3 kit |
| 四席外呼引擎 | `agents/m-pnt` · `m-mkt` · `m-biz` · `m-ed` | 侧车引擎（不进 npm workspaces） |
| 治理资产 | `founder-os/` | 七常委 YAML / 知识 / 宪章（非 npm 包） |
| L3 骨架 | `tool-agents/` | 新 Tool Agent 落点说明；样板已外置 |
| 文档 | `docs/` | 以 AUTHORITY 为唯一入口 |

**不在本仓：** 经营诊断整仓（`M-OPS-Agent` 独立目录）、历史嵌套镜像 `M-BIZ/` `M-ED/` `M-PNT/` `M-MKT/`（已出库，勿再提交）。

主链路（冻结）：

```text
Agent Insight → Council Review → MKDecision → Execution → Memory Learning
```

四席只做专业能力生产；七常委做企业级判断。L3 不经 Adapter 不得进委员会。

## Packages（workspaces）

| Package | 职责 |
|---------|------|
| `@mealkey/agent-sdk` | 平台协议 / Gateway Client |
| `@mealkey/agent-runtime` | Agent 运行时内核 |
| `@mealkey/core` | 经营智能层（含遗留 Chief 编排） |
| `@mealkey/agents` | 四席 Consulting-OS + Founder / 决策室契约 |
| `@mealkey/knowledge-engine` | 知识引擎接口 |
| `@mealkey/memory-engine` | 记忆引擎接口 |
| `@mealkey/restaurant-brain` | 餐厅经营大脑 |
| `@mealkey/business-signal-engine` | 经营信号 / 今日雷达 |
| `@mealkey/tool-agent-kit` | L3 Tool Agent 框架 |
| `@mealkey/web` | Next.js Host |
| `@mealkey/mini-shell` | 微信 Mini Program 壳契约 |

## 工程主线

1. Council Intelligence Integration + **Council Runtime Engine**
2. Memory / Growth（User Intelligence 挂载，非第七 Runtime）
3. Mobile Agent → 再 Web Studio（见 AUTHORITY）

垂直 L3（如餐启经营诊断）经 **外置仓 → Agent Gateway**，见 `docs/M_OPS_DIAG_EXTERNAL_POINTER_V1.md`。

## 快速开始

```bash
npm install
cp .env.example .env   # 填入本地密钥；勿提交任何 .env*
npm run db:push        # 或按生产手册接 Postgres
npm run dev
```

测试：

```bash
npm test
```

部署与交付清单：`docs/MEALKEY_PRODUCTION_DEPLOY_V1.md` · `docs/MEALKEY_COMMERCIAL_DELIVERY_CHECKLIST_V1.md`。

## 密钥

`.env` / `.env.local` / `.env.vercel*` / 凭证 **永不入库**。若曾误推，立即在 Vercel / 数据库 / LLM 控制台轮换密钥。
