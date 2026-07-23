# Agent 系统

> 更新时间: 2026-07-14  
> 当前生产路径：**多 Agent 编排**（M-MKT / M-PNT / M-BIZ / M-ED / ChiefAgent）

## 执行路径

```
用户消息 → POST /api/agent/stream
  → streamAgentResponse()
      → buildMKContext() / 附件上下文
      → 意图路由（forceAgent 优先）
          ├─ m-mkt: streamMMktProduct()   → 市场进入判断
          ├─ m-pnt: streamMPntProduct()   → 7 步定位 + 知识库注入
          ├─ m-ed:  streamMEdProduct()    → 股权结构判断
          └─ chief: ChiefAgent.process()
               1. Problem Understanding
               2. LLM Judgment Chain（失败 → 规则链）
               3. Risk Analysis + Tools
               4. MKDecision + Challenge
               5. Memory Update + AgentRun ↔ Decision
```

M-BIZ 已接入主 SSE：`forceAgent: "m-biz"` → `streamMBizProduct()`（外呼失败则规则降级）。

## Founder 会议闭环

- 启动：`trpc.founder.startMeeting`（四席判断 + `memoryWrites` 落库）
- 推进 Round2/3：`trpc.founder.advanceRound`（有 Key 时 LLM 真辩论，否则 runtime 投影）
- 进行中草稿：`Project.profile.activeMeeting`，经 `trpc.meetingSession.get/save/clear`；确认决策后清空
- 会议历史：`trpc.meetingSession.listHistory` 读 Memory `founder_meeting_*`

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

## LaunchAgent（产品元数据）

**位置**: `packages/agents/src/launch/`  
保留 manifest / workflow，**主请求路径不再分流到 LaunchAgent**。
