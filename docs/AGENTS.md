# Agent 系统

> 更新时间: 2026-07-17  
> **权威入口**：[`docs/AUTHORITY.md`](./AUTHORITY.md)（老板 UX = **六步** Consulting-OS；八阶段仅内部）  
> 当前生产路径：**多 Agent 编排**（M-MKT / M-PNT / M-BIZ / M-ED / ChiefAgent）

## 执行路径

```
用户消息 → POST /api/agent/stream
  → streamAgentResponse()
      → buildMKContext() / 附件上下文
      → 意图路由（forceAgent 优先）
          ├─ m-mkt: streamMMktProduct()   → 市场进入判断
          ├─ m-pnt: streamMPntProduct()   → 六步定位咨询 + 知识库注入
          ├─ m-ed:  streamMEdProduct()    → 股权结构判断
          └─ chief: ChiefAgent.process()
               1. Problem Understanding
               2. LLM Judgment Chain（失败 → 规则链）
               3. Risk Analysis + Tools
               4. MKDecision + Challenge
               5. Memory Update + AgentRun ↔ Decision
```

M-BIZ 已接入主 SSE：`forceAgent: "m-biz"` → `streamMBizProduct()`（外呼失败则规则降级）。

## 四席真实引擎接线（P0）

| 席位 | 真实引擎 | 端口 | Web Client | Founder 路径 |
|------|----------|------|------------|--------------|
| M-MKT | `agents/m-mkt` FastAPI 薄层 | **8002** | `m-mkt-client.ts` | `previewMMktSnapshot` 优先外呼，失败启发式 |
| M-PNT | `@mealkey/agents` 进程内 | — | — | `previewMPntSnapshot` → `runMPnt`（timeout 20s） |
| M-BIZ | `agents/m-biz/bmjm-agent` | **8000** | `m-biz-client.ts` | `mbizChat`（timeout 15s，降级可见） |
| M-ED | `agents/m-ed` FastAPI | **8001** | `m-ed-client.ts` | `previewMEdSnapshot` 优先外呼，失败启发式 |

本地启动：

```bash
# M-BIZ（若本机 8000 已被占用，改用 8010）
cd agents/m-biz/bmjm-agent && py -3.12 -m pip install -r requirements.txt
py -3.12 -m uvicorn app.main:app --host 127.0.0.1 --port 8010
# 对应 Web：MBIZ_API_BASE_URL=http://127.0.0.1:8010/api/v1/bmjm

# M-ED
cd agents/m-ed && pip install -r requirements.txt
uvicorn agent.main:app --host 127.0.0.1 --port 8001

# M-MKT
cd agents/m-mkt && pip install -r requirements-server.txt
set PYTHONPATH=src
uvicorn server.main:app --host 127.0.0.1 --port 8002
```

或：`docker compose -f docker-compose.agents.yml up -d`

真实联调冒烟（引擎已启动时）：

```bash
# 1) 起引擎
docker compose -f docker-compose.agents.yml up -d
# 或按上文分别起 8000/8001/8002

# 2) LIVE 冒烟（含可达性预检）
cd apps/web
set LIVE_AGENTS=1
set HEURISTIC_ONLY=false
set MBIZ_API_BASE_URL=http://127.0.0.1:8000/api/v1/bmjm
set MBIZ_API_TOKEN=mbiz-dev-token-2026
set MED_API_BASE_URL=http://127.0.0.1:8001
set MMKT_API_BASE_URL=http://127.0.0.1:8002
npm run test:live-agents
```

说明：默认 CI / `vitest` 会跳过 LIVE 用例；**绿测不等于引擎已通**。生产勿开 `FOUNDER_ALLOW_DEGRADED_MEETING=1` / `HEURISTIC_ONLY=true`（会放行假咨询扣点）。

夜间 / 手动 LIVE：GitHub Actions 工作流 `LIVE Agents Smoke`（`.github/workflows/live-agents.yml`），`workflow_dispatch` 或定时跑 `docker compose` + `npm run test:live-agents`；失败不阻断主 CI。

环境变量（Web）：

```
MBIZ_API_BASE_URL=http://127.0.0.1:8000/api/v1/bmjm
MBIZ_API_TOKEN=mbiz-dev-token-2026
MED_API_BASE_URL=http://127.0.0.1:8001
MED_API_KEY=   # 可选
MMKT_API_BASE_URL=http://127.0.0.1:8002
```

席位门禁：证据不足 3 条硬事实时，`support` 自动降为 `conditional`。  
Decision Memo：合同含董事会一页纸（决策/取舍/条件/验证/停止线）。
外呼席位判断会带 `【真实引擎】` / `【启发式】` 前缀，并写入 `metadata.provider`。

## Founder 会议闭环

- 启动：`trpc.founder.startMeeting`（四席判断 + `memoryWrites` 落库）
- 推进 Round2/3：`trpc.founder.advanceRound`（有 Key 时 LLM 真辩论，否则 runtime 投影）
- 进行中草稿：`Project.profile.activeMeeting`，经 `trpc.meetingSession.get/save/clear`；确认决策后清空
- 会议历史：`trpc.meetingSession.listHistory` 读 Memory `founder_meeting_*`
- **Evidence Layer（MVP）**：`founder-layer/evidence` — Registry + Binding + 会议「顾问依据」展示；每席判断至少绑定 3 条证据，写入 `evidencePack` 与 Memory
- **Memory Engine（V1）**：`memory/engine.ts` — 读回 `FounderMemorySnapshot`（事实/决策/偏好/成败模式）并生成 `priorBlock`；`startMeeting`/`runLoop` 注入四席；失败模式可把激进 `support` 降为 `conditional`；确认决策写 preference；验证完成写 learning；`trpc.founder.getMemorySnapshot`
- **Validation OS（V1）**：`contracts/validation.ts` + `validation/engine.ts` + `trpc.validationOs` — 商业假设验证系统（Hypothesis → Task/Metrics → Outcome Evidence → Memory）；生命周期 CREATED→RUNNING→OBSERVING→PASSED/FAILED/REVIEW；重决策触发器；决策页「决策验证中心」+ 今日页假设监督卡片
- **Debate Engine（V1）**：`contracts/debate-session.ts` + `meeting/debate-engine.ts` — Conflict Detector / Challenge Router / 三轮 Runtime；Round2 强制点名对方 `targetEvidenceId`；产出 `DecisionProposal` + What-If `ScenarioTest`；`startMeeting` 沉淀 `lastDebateScenarios` 供今日页催办；终局决策优先对齐 Debate 提案
- **Consulting Eval（L4）**：`founder-layer/eval/consulting-cases.ts` — 5 个餐饮高压盲测（敢反对老板 / 证据点名 / 提案约束 / Decision Memo 停止线）；`tests/founder-consulting-cases.test.ts`
- **Flywheel Smoke**：`tests/founder-layer-runtime.test.ts` — 启发式全链路冒烟（Debate / Evidence Pack / Memo / 终局约束档）
- **Founder OS V2（母架构）**：`docs/FOUNDER_OS_V2.md` + `capability/` — Cognition / Decision / Execution / Growth **代码已接线**；老板主交付路径仍以六步 / `AUTHORITY.md` 为准（勿把能力链「已接线」写成老板侧已完成）；多品牌 `brands[]` + BrandSwitcher；见相关测试
- **Decision Contract V2**：`contracts/claim.ts` + `contracts/decision-v2.ts` + `decision/contract-v2.ts` — Evidence→Claim→Decision；Decision Gate；会议产出企业行动协议并在确认时落库

能力链：`Evidence → Claims → Debate → Decision → Validation → Memory`

Founder OS 定义：**增强经营者四大能力的 AI 共生体**（认知 / 决策 / 推动 / 成长），不是四个咨询 Agent 的集合。

今日页闭环：验证任务 `triggerReasons` + What-If 情景 +「重新召开战略会议」催办。

前端 IA（V2）：一级导航 **今日 / 能力 / 会议 / 行动 / 成长**；今日为 Morning Brief；能力中心 `/projects/[id]/capability`。详见 `docs/FOUNDER_OS_V2.md` §7。

护城河关键：Memory Engine 让一年后的系统比第一次使用更强——成败模式与老板偏好会进入下一次会议先验，并可校准席位立场。

## ChiefAgent

**位置**: `packages/mealkey-core/src/agent/chief-agent.ts`  
**工厂**: `apps/web/src/server/services/chief-agent.factory.ts`  
**编排**: `apps/web/src/server/services/agent.service.ts`

无 API Key 时工厂注入 stub LLM，运行时降级到规则链；SSE meta 标记 `fallback: true`。

## 专项 Agent

| Agent | 服务 | 专项页 | 会议页 SSE |
|-------|------|--------|------------|
| M-MKT | `m-mkt.service.ts` | `/market` | `market_result` |
| M-PNT | `m-pnt.service.ts` | `/positioning` | `positioning_result` |
| M-BIZ | `m-biz.service.ts` | `/business` | `business_result` |
| M-ED | `m-ed.service.ts` | `/equity` | `equity_result` |

M-MKT / M-ED / M-BIZ 均注入领域 seeds；M-MKT 额外叠加 knowledge-engine `matchRules`。

`@mealkey/agents` 仍包含 LaunchAgent / MPntAgent 包级定义；M-ED / M-MKT 目前在 Web service 层实现。

## 经营点结算（V1）

- 账本：`business-points.service.ts`（`BillingAccount.metadata.businessPoints` + `CreditLedger` POINTS）
- 预扣 / 退回：`founder.startMeeting`；流式路径只做门禁，避免双扣
- 产品目录与前端：`lib/business-wallet.ts` · `/billing`
- 详见 `docs/BUSINESS_POINTS_V1.md`

## LaunchAgent（产品元数据）

**位置**: `packages/agents/src/launch/`  
保留 manifest / workflow，**主请求路径不再分流到 LaunchAgent**。
