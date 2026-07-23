# MealKey 大模型宿主 vs 工具 Agent（冻结）

> **状态：正式冻结（Freeze）**  
> **日期：** 2026-07-23  
> **权威挂载：** `docs/AUTHORITY.md` L0  
> **配套：** Agent Core · Goal Compiler · Tool Agent Framework · Mobile Agent  

---

## 〇、一句话

> **餐饮经营 AI（宿主）= 大模型始终在线。**  
> **独立跑的 Agent = 偏工具，可以不靠大模型。**

不存在「主产品不用大模型也能当 MealKey」的产品叙事。

---

## 一、分层（冻结）

| 层 | 是什么 | 大模型 |
|----|--------|--------|
| **Host Intelligence** | MealKey 本体：理解意图、Goal Compiler、Persona、编排、经营对话 | **始终需要**（DeepSeek/OpenAI 等） |
| **L1 四席能力** | 定位/市场/商业/股权等专业判断（可进程内或外呼） | 默认有模型；外呼失败可降级但须明示 |
| **L3 Tool Agent** | 独立引擎：采集、算表、规则诊断、信号等 | **可不依赖大模型**（纯 TS/规则/本地算子） |

```text
用户
  ↓
MealKey Host（LLM 始终在线）
  ↓ 编排调用
L1 能力 / L3 工具（工具可无 LLM）
  ↓
经营对象 / 资产 / 决策门禁
```

---

## 二、明确不做

- ❌ 把「无 Key 启发式长文」当成正式产品主路径对外交付  
- ❌ 用一堆无模型工具 Agent 冒充「懂经营的 AI」  
- ❌ 让老板选择「要不要开大模型」当主交互  
- ❌ L3 工具升格为战略终局（仍服从 Tool Agent / 权限冻结）  

## 三、允许的 Stub

| 场景 | 允许 |
|------|------|
| 单测 / CI | `compileGoalTurn` 纯启发式脚手架 |
| 本地无 Key 调试 | `ALLOW_COMPILER_STUB=1` 显式 stub，UI 标明「开发桩」 |
| 生产 | **必须**配置宿主大模型；缺 Key → 明确错误，不装懂 |

---

## 四、工程锚点

- Host 编译：`goal-compiler` 脚手架 + **`llm-compile` 必跑**（`mobileAgent.compile`）  
- 工具层：`@mealkey/tool-agent-kit` · 外置 L3（如经营诊断引擎，可无 LLM）  
- 冲突：与「可全程无模型跑通老板主路径」类叙述 → **以本文为准**
