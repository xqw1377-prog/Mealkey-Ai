# 仓库同步与 Tool Agent 规则 V1

> **日期：** 2026-07-21  
> **目的：** GitHub 为唯一真源；L3/Gateway 规则进仓，避免本地漂移。垂直诊断在外置 `M-OPS-Agent`。

## 1. 真源

| 项 | 值 |
|----|-----|
| Remote | `origin` = `https://github.com/xqw1377-prog/Mealkey-Ai.git` |
| 默认分支 | `master` |
| 权威入口 | `docs/AUTHORITY.md` |
| 经营诊断外置仓 | `C:\Users\xqw13\M-OPS-Agent`（独立产品，非本 monorepo） |

**工作流：** 本地改完 → commit → `git push`。禁止长期未推送的功能代码。

## 2. Core 包结构（清理后）

```text
apps/web/ · apps/mini-shell/
packages/tool-agent-kit/          # L3 框架
packages/agent-sdk/               # 含 platform Gateway Client
packages/agents/                  # 四席 Consulting-OS + Founder 契约
packages/business-signal-engine/
agents/m-pnt|m-mkt|m-biz|m-ed/    # 四席侧车引擎（非 workspace）
tool-agents/                      # L3 骨架说明（样板已外置）
apps/web/.../agent-platform-gateway/  # Host Gateway
# ❌ 已删除 packages/m-ops-diag、mealkey-agents/*
# ❌ 已删除根目录嵌套镜像 M-BIZ/ M-ED/ M-PNT/ M-MKT/ M-OPS-Agent/
```

Cursor 规则：

- `.cursor/rules/tool-agent-framework-v1.mdc`
- `.cursor/rules/github-source-of-truth.mdc`

## 3. 垂直 Agent 规则（摘要）

- 禁止在 MealKey Core 新增垂直 Agent  
- 合法出口经 Gateway Ports（Signal/Insight/Work/Gap）  
- 样板：`M-OPS-Agent` + `MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md`

## 4. 禁止入库

`.env*` · 密钥 · `.vercel/` · `*.tsbuildinfo` · `node_modules` · `.next` / `dist`
