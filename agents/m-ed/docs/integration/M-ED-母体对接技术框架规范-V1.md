# M-ED 母体对接技术框架规范 V1

> **版本**：V1.0  
> **更新**：2025-07  
> **状态**：正式发布  

---

## 1. 概述

M-ED 作为 MealKey 产品矩阵中的 **股权决策子服务**，通过 HTTP 协议与 MealKey ChiefAgent 对接。本规范定义 M-ED 的 Agent Manifest、Capability、Intent Detection、Workflow 以及 MKDecision 输出协议。

### 1.1 对接方式

M-ED 保持独立 FastAPI 服务部署，通过 **HTTP POST** 方式被母体调度。与 M-PNT（TypeScript Agent SDK 内嵌）不同，M-ED 是外部 HTTP 服务。

```
ChiefAgent → detectIntent("股权") → HTTP POST /v1/agent/equity → MKDecision
```

### 1.2 服务地址

| 环境 | 地址 |
|------|------|
| 开发 | `http://localhost:8001` |
| 生产 | 由部署环境决定 |

---

## 2. Agent Manifest

```json
{
  "id": "m-ed",
  "name": "M-ED 股权决策顾问",
  "version": "2.0.0",
  "description": "帮助创业团队完成股权决策：股权结构设计、动态调整、场景模拟、合规检查、文档生成",
  "category": "equity",
  "capabilities": [
    "design_equity",
    "adjust_equity",
    "simulate",
    "compliance_check",
    "generate_document"
  ],
  "pricing": {
    "type": "usage",
    "price": 0,
    "currency": "CNY"
  },
  "permissions": {
    "knowledge": false,
    "project": true,
    "memory": false
  },
  "transport": {
    "protocol": "http",
    "method": "POST",
    "endpoint": "/v1/agent/equity",
    "auth": "bearer_token"
  }
}
```

---

## 3. Capability 定义

| ID | 名称 | 输入 Schema (JSON) | 输出 Schema (JSON) |
|----|------|-------------------|-------------------|
| `design_equity` | 股权结构设计 | [专业模型文档](../M-ED-专业模型设计文档-V1.md#2-股权结构设计模型) | [设计输出](../M-ED-专业模型设计文档-V1.md#24-输出结构) |
| `adjust_equity` | 动态调整建议 | [调整输入](../M-ED-专业模型设计文档-V1.md#31-输入) | [调整输出](../M-ED-专业模型设计文档-V1.md#34-输出结构) |
| `simulate` | 场景模拟 | [模拟输入](../M-ED-专业模型设计文档-V1.md#41-输入) | [模拟输出](../M-ED-专业模型设计文档-V1.md#44-输出结构) |
| `compliance_check` | 合规检查 | [合规输入](../M-ED-专业模型设计文档-V1.md#51-输入) | [合规输出](../M-ED-专业模型设计文档-V1.md#53-输出结构) |
| `generate_document` | 文档生成 | [文档输入](../M-ED-专业模型设计文档-V1.md#61-输入) | [文档输出](../M-ED-专业模型设计文档-V1.md#62-输出结构) |

### 3.1 请求格式

```json
{
  "session_id": "可选，不传则自动生成",
  "user_id": "必填，用户标识",
  "language": "zh-CN",
  "action": "design_equity | adjust_equity | simulate | compliance_check | generate_document | get_context | reset_context",
  "payload": { "...能力专用参数..." }
}
```

### 3.2 响应格式

成功：
```json
{
  "session_id": "uuid-string",
  "status": "success",
  "data": { "...能力专用输出..." }
}
```

错误：
```json
{
  "session_id": "uuid-string",
  "status": "error",
  "error": {
    "code": "NON_EQUITY_MESSAGE | INVALID_PARAMETER | INVALID_ACTION | SESSION_NOT_FOUND | INTERNAL_ERROR | LLM_ERROR",
    "message": "错误说明",
    "details": { "...可选的错误详情..." }
  }
}
```

---

## 4. Intent Detection

M-ED 内置意图分类器（`agent/classifiers/intent.py`），母体可通过以下两种方式调度：

### 4.1 方式一：母体预分类后直接调用

母体 ChiefAgent 检测到用户意图为"股权"，直接调用 M-ED 的对应 action。

```python
# 母体侧伪代码
intent = detect_intent(user_message)
if intent == "equity":
    # 将完整消息传给 M-ED，由 M-ED 内部二次分类
    call_m_ed(action="design_equity", payload={"text": user_message})
```

### 4.2 方式二：M-ED 内部二次分类

M-ED 的 `validate_and_classify()` 方法可对消息进行二次分类：

| 分类 | 映射 action |
|------|------------|
| "设计"、"分配"、"划分" | design_equity |
| "调整"、"修改"、"变更" | adjust_equity |
| "模拟"、"推演"、"假设"、"稀释" | simulate |
| "合规"、"审查"、"检查"、"风险" | compliance_check |
| "生成"、"文档"、"协议"、"合同" | generate_document |
| "上下文"、"当前状态"、"历史" | get_context |
| "重置"、"清空"、"重新开始" | reset_context |

### 4.3 非股权过滤

M-ED 内置三级关键词过滤（强信号 40+ / 弱信号 15+ / 非股权 20+），自动拒绝非股权消息。

**关键规则**：
- 非股权词命中且无强信号词 → 拒绝（400 NON_EQUITY_MESSAGE）
- 强信号词命中 → 通过（置信度 0.95）
- 弱信号词需 ≥2 个 或占比 >30% → 通过（置信度 0.7）
- 纯文本 message payload → 自动覆盖 action（由意图分类器决定）
- 结构化 payload → 保留用户显式 action，仅做非股权过滤

---

## 5. Workflow

M-ED 的执行链路为 **单个 HTTP 请求内完成**，不需要多步串行。

```
M-ED Single Request Workflow:

用户/ChiefAgent → POST /v1/agent/equity
  ├─ ① Pydantic 校验 (AgentRequest)
  ├─ ② 意图分类 (validate_and_classify)
  │   └─ 非股权 → 立即拒绝
  ├─ ③ 会话管理 (get_or_create)
  ├─ ④ action 路由 → handler
  │   └─ handler_wrapper:
  │       ├─ 参数校验 (Pydantic)
  │       ├─ LLM 调用 / 规则退路
  │       └─ 后处理 + metadata
  ├─ ⑤ 上下文更新 (add_history)
  └─ ⑥ 返回 AgentResponse
```

### 5.1 双引擎策略

| 模式 | 触发条件 | 说明 |
|------|----------|------|
| **LLM 模式** | 配置了 API Key | 调用 GPT-4 / Claude，temperature=0.3 |
| **规则退路** | 无 API Key 或 LLM 调用失败 | 使用 knowledge/rules/ 中的预设规则 |
| **自动降级** | LLM 调用异常 | handler_wrapper 自动降级到规则退路 |

---

## 6. MKDecision 输出协议

M-ED 的响应体（AgentResponse.data）即为 MKDecision 等价物。

### 6.1 格式对应

| MKDecision 字段 | M-ED 映射 | 说明 |
|-----------------|----------|------|
| `id` | `session_id` | 会话 ID |
| `problem` | `action` | 当前执行的能力类型 |
| `observation` | `payload` | 用户输入 |
| `diagnosis` | `result.scheme.analysis` / `result.checks` | 分析诊断 |
| `judgement` | `result.scheme` / `result.adjustment_suggestion` / `result.scenarios` | 核心判断 |
| `strategy` | `result.recommendations` / `result.impact_analysis` | 策略建议 |
| `action` | `result.document` | 生成文档时对应 |
| `confidence` | `metadata.model` | LLM / rule_engine |
| `evidence` | `metadata.audit` (审计轨迹) | 推理依据 |

### 6.2 审计轨迹（evidence）

当使用规则引擎退路时，每个输出包含 `metadata.audit`：

```json
{
  "metadata": {
    "model": "rule_engine",
    "fallback": true,
    "audit": {
      "action": "design_equity",
      "events_count": 5,
      "adjustments_count": 0,
      "events": [
        {"stage": "start", "action": "parse_team", "detail": "团队共 2 人", "meta": {...}},
        {"stage": "calc", "action": "total_weight", "detail": "总权重=0.65"},
        {"stage": "alloc", "action": "member", "detail": "张三(创始人)=43.1% 普通股"},
        {"stage": "alloc", "action": "member", "detail": "李四(CTO)=26.9% 普通股"},
        {"stage": "result", "action": "summary", "detail": "团队分配=70.0%, 期权池=12%, 未分配=18.0%"}
      ],
      "adjustments": []
    }
  }
}
```

---

## 7. 会话管理

M-ED 内置内存会话管理（`agent/session/manager.py`）：

| 参数 | 值 |
|------|-----|
| TTL | 1800 秒（30 分钟） |
| 清理间隔 | 300 秒（5 分钟） |
| 存储方式 | 线程安全内存 OrderedDict |
| 上下文内容 | current_scheme, team_members, history |

**历史记录最多保留 3 条**，用于 LLM Prompt 上下文注入。

---

## 8. 健康检查

```text
GET /v1/agent/equity/health
```

响应：
```json
{
  "status": "ok",
  "agent": "med-equity-engine",
  "version": "2.0.0",
  "auth_required": false,
  "capabilities": ["design_equity", "adjust_equity", "simulate", "compliance_check", "generate_document"]
}
```

---

## 9. 错误码

| 状态码 | 错误码 | 说明 | 触发场景 |
|--------|--------|------|----------|
| 400 | `NON_EQUITY_MESSAGE` | 非股权相关消息 | 用户发送闲聊/无关内容 |
| 400 | `INVALID_PARAMETER` | 请求参数校验失败 | 必填字段缺失、格式错误 |
| 400 | `INVALID_ACTION` | 不支持的 action 类型 | action 不在支持列表中 |
| 401 | `UNAUTHORIZED` | API Key 无效 | 配置了 MED_API_KEY 但认证失败 |
| 404 | `SESSION_NOT_FOUND` | 会话不存在 | session_id 已过期或无效 |
| 422 | — | Pydantic 校验失败 | 请求体结构不符 |
| 500 | `INTERNAL_ERROR` | 服务端内部错误 | 未预期的异常 |
| 502 | `LLM_ERROR` | LLM 引擎响应异常 | LLM 调用失败且无退路方案 |

---

## 10. 对接 Checklist

| # | 事项 | 状态 |
|---|------|------|
| 1 | HTTP 端点已就绪 | ✅ `/v1/agent/equity` |
| 2 | 健康检查已就绪 | ✅ `/v1/agent/equity/health` |
| 3 | Manifest 可注册 | ✅ 见 Section 2 |
| 4 | 5 个 Capability 可调用 | ✅ 5 个 action 均已实现 |
| 5 | 意图分类可集成 | ✅ 内置 validate_and_classify() |
| 6 | 非股权过滤 | ✅ 三级关键词 |
| 7 | 会话管理 | ✅ TTL 30min，自动清理 |
| 8 | 错误码对齐 | ✅ 6 种错误码 |
| 9 | 审计轨迹 | ✅ 规则退路含 audit |
| 10 | 双引擎降级 | ✅ LLM 失败 → 自动降级 |
