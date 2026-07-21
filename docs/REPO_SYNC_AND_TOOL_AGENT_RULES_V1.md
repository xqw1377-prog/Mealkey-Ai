# 仓库同步与 Tool Agent 规则 V1

> **日期：** 2026-07-21  
> **目的：** GitHub 为唯一真源；L3 框架与 m-ops-diag 规则进仓，避免本地漂移。

## 1. 真源

| 项 | 值 |
|----|-----|
| Remote | `origin` = `https://github.com/xqw1377-prog/mealkey-agent-1.git` |
| 默认分支 | `master` |
| 权威入口 | `docs/AUTHORITY.md` |

**工作流：** 本地改完 → commit → `git push`。禁止长期未推送的功能代码。

## 2. 框架清理后的包结构（L3）

```text
packages/tool-agent-kit/     # L3 框架：Manifest / Registry / Compose
packages/m-ops-diag/         # 样板：餐启经营诊断（感知器）
packages/business-signal-engine/
tool-agents/README.md        # 多 Agent 目录说明
```

Cursor 规则（进仓）：

- `.cursor/rules/tool-agent-framework-v1.mdc`
- `.cursor/rules/github-source-of-truth.mdc`

## 3. 新增 L3 规则（摘要）

见 `MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md` + `M_OPS_DIAG_AGENT_V1.md`：

- 非第五顾问席
- 四 Ports 出口
- V1 优先进程内 TS
- 先 Signal（今日）后 Insight（决策室）— 对 m-ops-diag

## 4. 禁止入库

`.env*` · `.vercel/` · `*.tsbuildinfo` · `.next/` · `dist/` · 本地 DB
