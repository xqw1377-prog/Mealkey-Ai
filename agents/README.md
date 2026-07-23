# Agents — 四席外呼引擎（侧车）

本目录是 **L1 四席**的独立引擎进程，由 `docker-compose.agents.yml` / Host 外呼使用。  
进程内 Consulting-OS 契约与题组在 `packages/agents`，二者分工：

| 位置 | 角色 |
|------|------|
| `packages/agents` | TS 契约 · 咨询旅程 · MKInsight / 决策室类型（进 workspaces） |
| `agents/<id>` | 可独立部署的引擎实现（**不进** npm workspaces） |

## 当前四席

| Agent | 目录 | 技术栈 | 说明 |
|-------|------|--------|------|
| M-PNT | `agents/m-pnt/` | TypeScript | 品牌定位决策引擎 |
| M-MKT | `agents/m-mkt/` | Python | 市场机会分析引擎 |
| M-BIZ | `agents/m-biz/` | Python FastAPI | 商业模式评估（ECC） |
| M-ED | `agents/m-ed/` | Python FastAPI | 股权决策引擎 |

**不要**再把完整镜像仓 `M-PNT/` `M-MKT/` `M-BIZ/` `M-ED/` 嵌进仓库根目录。

## 目录约定

```text
agents/<agent-name>/
├── <源码>             # 项目代码
├── tests/             # 测试
├── docs/              # 引擎设计（可选）
├── README.md
└── requirements.txt   # 或 package.json
```

L3 Tool Agent 不放此处，见 `tool-agents/README.md` 与外置 `M-OPS-Agent`。
