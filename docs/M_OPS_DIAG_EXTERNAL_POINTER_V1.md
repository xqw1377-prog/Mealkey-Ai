# 餐厅经营诊断 · MealKey 侧指针（冻结）

> **状态：** 产品与引擎已外置  
> **日期：** 2026-07-21  
> **本地独立仓：** `C:\Users\xqw13\M-OPS-Agent`  

---

## MealKey Core 还保留什么？

| 保留 | 路径 |
|------|------|
| Agent Gateway | `apps/web/src/server/agent-platform-gateway` · `/api/v1/gateway/*` |
| Ingress → 今日雷达 | `collectGatewayIngressWorldChanges` |
| 平台协议/SDK/UI 框架文档 | `MEALKEY_AGENT_*` |

## 已迁出（勿再在 Core 恢复）

| 项 | 现真源 |
|----|--------|
| 诊断引擎 / Skill / Web UI | `C:\Users\xqw13\M-OPS-Agent` |
| 产品文档（架构/UX/采集/模型） | `C:\Users\xqw13\M-OPS-Agent\docs\M_OPS_DIAG_*.md` |

原 MealKey 内 `packages/m-ops-diag`、`mealkey-agents/restaurant-diagnosis-agent`、进程内 tRPC bridge **已删除**。

垂直能力只经：**外置 Agent → Gateway Context/Ingress → OS**。
