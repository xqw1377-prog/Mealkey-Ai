# Agents

MealKey 生态的独立 Agent 模块集合。

每个 agent 是一个独立的子项目，有各自的代码、文档和测试，统一放在 `agents/<agent-name>/` 目录下。

## 当前 Agent

| Agent | 目录 | 技术栈 | 说明 |
|-------|------|--------|------|
| **M-ED** | `agents/m-ed/` | Python FastAPI | 股权决策解决方案引擎 |
| **M-PNT** | `agents/m-pnt/` | TypeScript | 餐饮品牌定位决策引擎 |
| **M-BIZ** | `agents/m-biz/` | Python FastAPI | 商业模式评估引擎 (ECC) |
| **M-MKT** | `agents/m-mkt/` | Python | 餐饮市场机会分析引擎 |

## 新增 Agent 规范

```
agents/<agent-name>/
├── <源码目录>        # 项目代码
├── tests/           # 测试
├── docs/            # 设计文档
├── README.md        # agent 说明
└── requirements.txt # 依赖（Python）或 package.json（Node）
```
