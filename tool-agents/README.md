# tool-agents — L3 独立引擎目录（骨架）

> 框架：`docs/MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` · 包 `@mealkey/tool-agent-kit`  
> 权威入口：`docs/AUTHORITY.md`（13u / 13v / 13ag）

本目录用于放置**可上架的 L3 Tool Agent**引擎包（Manifest · Engine · Ports）。  
Core Host（`apps/web`）只做薄 Bridge / Gateway，不把垂直产品整仓嵌进 monorepo。

## 官方样板（已外置）

| Agent ID | 真源 | MealKey 侧 |
|----------|------|------------|
| `m-ops-diag` | 独立仓 `C:\Users\xqw13\M-OPS-Agent` | 指针 `docs/M_OPS_DIAG_EXTERNAL_POINTER_V1.md` · Gateway `/api/v1/gateway/*` |

**禁止**在 Core 恢复 `packages/m-ops-diag`、`mealkey-agents/*`，或把 `M-OPS-Agent/` 整仓再提交进本仓库。

## 上架方式

1. 新 L3 先过框架上架清单（见 Tool Agent Framework 文档）
2. 默认：**外置仓 + Gateway Ingress**（与 M-OPS 同型）
3. 例外：极薄引擎可放 `packages/<name>` 或本目录 `tool-agents/<folder>/`，仍须零 Prisma、仅四口出口（`signal` \| `insight` \| `work` \| `gap`）

命名：产品族 `m-*` 或框架态 `l3.*`（均为 L3，不得升格顾问席 / 不得直进七常委）。
