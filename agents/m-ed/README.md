# M-ED 股权决策解决方案引擎

> **基于 LLM 的智能股权决策引擎 — 为初创团队提供从设计到落地的全链路股权解决方案。**

M-ED 覆盖股权结构设计、动态调整、场景模拟、合规检查和文档生成五大核心能力，采用 LLM + 规则引擎双引擎驱动。

---

## 核心能力

| # | 能力 | 描述 |
|---|------|------|
| 1 | **股权结构设计** | 根据项目阶段、团队角色、贡献度等因素，推荐合理的股权分配方案 |
| 2 | **动态调整建议** | 基于实际贡献、里程碑达成等数据，提出股权调整建议 |
| 3 | **场景模拟** | 模拟不同分配方案下的未来股权演变（多轮融资稀释等） |
| 4 | **合规检查** | 对股权方案进行 Vesting、IP 转让、税务、创始人保护等合规审查 |
| 5 | **文档生成** | 自动生成股权协议草案、董事会决议、股东协议等法律文档 |

---

## 架构

```
用户/前端 → POST /v1/agent/equity
                │
          Agent Hub (hub.py)
            ├── 意图分类器 (classifiers/intent.py)
            │   ├── 40+ 强信号词、15+ 弱信号词
            │   ├── 非股权关键词过滤（20+ 闲聊/无关词）
            │   └── 自动覆盖 action（自然语言→具体 intent）
            ├── 会话管理 (session/manager.py)
            │   ├── 线程安全内存存储（30 分钟 TTL，5 分钟清理）
            │   └── 上下文追踪 + 自动过期清理
            └── 路由器
                ├── design_equity      → 股权结构设计
                ├── adjust_equity      → 动态调整建议
                ├── simulate           → 场景模拟
                ├── compliance_check   → 合规检查
                └── generate_document  → 文档生成
                        │
              LLM 引擎 (utils/llm.py)
                ├── GPT-4 / Claude Prompt 模板（5 套模板）
                ├── 真实 API 调用（OpenAI / Anthropic SDK）
                └── 自动降级到规则退路
                        │
              知识资产 (knowledge/)
                ├── audit.py           ─ 审计轨迹
                └── rules/             ─ 5 组规则集
                    ├── equity_design.py
                    ├── equity_adjust.py
                    ├── simulate.py
                    ├── compliance.py
                    └── document.py
```

### 双引擎设计

| 模式 | 触发条件 | 说明 |
|------|----------|------|
| **LLM 模式** | 配置 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` | 调用 GPT-4 / Claude 生成高质量方案 |
| **规则引擎退路** | 未配置 API Key 或 SDK 未安装 | 5 种能力各有独立退路逻辑，确保核心功能可用 |

---

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn agent.main:app --reload --port 8001

# 服务地址：http://localhost:8001
# 健康检查：http://localhost:8001/v1/agent/equity/health
```

---

## API

### 统一入口

```
POST /v1/agent/equity
```

### 请求体

```json
{
  "session_id": "可选，不传则自动生成",
  "user_id": "必填，用户标识",
  "language": "zh-CN",
  "action": "design_equity | adjust_equity | simulate | compliance_check | generate_document | get_context | reset_context",
  "payload": { ... }
}
```

### 响应体（成功）

```json
{
  "session_id": "uuid-string",
  "status": "success",
  "data": { ... }
}
```

### 响应体（错误）

```json
{
  "session_id": "uuid-string",
  "status": "error",
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "参数校验失败",
    "details": { "field": "..." }
  }
}
```

> 错误响应通过 HTTP 状态码返回（400/401/404/422/429/500/502），详见下方错误码表。

### 健康检查

```
GET /v1/agent/equity/health

Response:
{
  "status": "ok",
  "agent": "med-equity-engine",
  "version": "2.0.0",
  "auth_required": false,
  "capabilities": ["design_equity", "..."]
}
```

---

## 5 大能力详细请求示例

### 1. 股权结构设计 (`design_equity`)

```json
{
  "user_id": "user-123",
  "action": "design_equity",
  "payload": {
    "project_name": "MyStartup",
    "project_stage": "seed",
    "team_members": [
      {
        "role": "创始人",
        "name": "张三",
        "contribution_type": "全职",
        "responsibility": "产品与战略"
      },
      {
        "role": "CTO",
        "name": "李四",
        "contribution_type": "全职",
        "responsibility": "技术研发"
      }
    ]
  }
}
```

### 2. 动态调整 (`adjust_equity`)

```json
{
  "user_id": "user-123",
  "action": "adjust_equity",
  "payload": {
    "current_scheme": {
      "version": "v1",
      "allocations": [
        { "member": "张三", "role": "创始人", "equity_percent": 45.0 },
        { "member": "李四", "role": "CTO", "equity_percent": 25.0 }
      ],
      "reserved_pool": 12.0,
      "unallocated": 10.0
    },
    "trigger_event": {
      "type": "milestone_completion",
      "description": "产品 MVP 上线，DAU 达到 1000",
      "completed_by": ["李四", "张三"]
    },
    "contributions": [
      {
        "member": "李四",
        "period": "2024-10 ~ 2025-01",
        "achievements": ["MVP 全栈开发", "系统架构设计"],
        "hours_per_week": 50
      }
    ],
    "adjustment_type": "general_review"
  }
}
```

### 3. 场景模拟 (`simulate`)

```json
{
  "user_id": "user-123",
  "action": "simulate",
  "payload": {
    "base_scheme": {
      "allocations": [
        { "member": "张三", "role": "创始人", "equity_percent": 45.0 },
        { "member": "李四", "role": "CTO", "equity_percent": 25.0 }
      ],
      "reserved_pool": 12.0,
      "unallocated": 10.0
    },
    "scenarios": [
      {
        "name": "天使轮融资 500 万，出让 15%",
        "events": [
          { "type": "funding", "amount": 5000000, "dilution_percent": 15, "round": "angel" }
        ]
      }
    ]
  }
}
```

### 4. 合规检查 (`compliance_check`)

```json
{
  "user_id": "user-123",
  "action": "compliance_check",
  "payload": {
    "scheme": {
      "allocations": [
        { "member": "张三", "equity_percent": 45.0, "equity_type": "普通股" },
        { "member": "李四", "equity_percent": 25.0, "equity_type": "普通股" }
      ],
      "reserved_pool": 12.0,
      "vesting_terms": {
        "standard": { "total_months": 48, "cliff_months": 12 },
        "abnormal": { "total_months": 24, "cliff_months": 6 }
      }
    },
    "jurisdiction": "china",
    "check_items": ["vesting", "equity_types", "ip_transfer", "tax", "founder_protection"]
  }
}
```

### 5. 文档生成 (`generate_document`)

```json
{
  "user_id": "user-123",
  "action": "generate_document",
  "payload": {
    "document_type": "equity_agreement_draft",
    "scheme_version": "v1",
    "scheme_data": {
      "project_name": "MyStartup",
      "date": "2025-01-15",
      "parties": [
        { "name": "张三", "role": "创始人", "equity_percent": 45.0 }
      ],
      "vesting_terms": {
        "total_months": 48,
        "cliff_months": 12
      }
    },
    "output_format": "markdown"
  }
}
```

---

## 项目结构

```
M-ED/
├── agent/                         # 股权决策引擎
│   ├── main.py                    # FastAPI 入口（认证 + 异常处理器 + 2 个端点）
│   ├── hub.py                     # Agent Hub 调度中枢
│   ├── classifiers/
│   │   └── intent.py              # 意图识别（强/弱/非股权 三级关键词过滤）
│   ├── handlers/
│   │   ├── __init__.py            # handler_wrapper 公共装饰器
│   │   ├── design.py              # 股权结构设计
│   │   ├── adjust.py              # 动态调整建议
│   │   ├── simulate.py            # 场景模拟
│   │   ├── compliance.py          # 合规检查
│   │   └── document.py            # 文档生成
│   ├── knowledge/                 # 知识资产模块
│   │   ├── __init__.py            # 模块入口
│   │   ├── audit.py               # 审计轨迹（TraceEvent + ScoreAdjustment + AuditTracker）
│   │   └── rules/                 # 规则知识资产
│   │       ├── equity_design.py   # 股权分配规则（角色权重表 + 分配公式）
│   │       ├── equity_adjust.py   # 动态调整规则（贡献评分公式）
│   │       ├── simulate.py        # 场景模拟规则（等比稀释计算）
│   │       ├── compliance.py      # 合规检查规则（5 项判定函数）
│   │       └── document.py        # 文档生成规则（模板框架）
│   ├── models/
│   │   └── schemas.py             # Pydantic v2 数据模型（12 枚举 + 15 模型）
│   ├── session/
│   │   └── manager.py             # 线程安全会话上下文管理
│   └── utils/
│       ├── llm.py                 # LLM 引擎 + 5 套 Prompt 模板
│       └── errors.py              # 错误处理（6 种自定义异常，含 HTTP 状态码映射）
├── docs/                          # 设计文档
│   ├── 00-文档索引.md             # 文档索引
│   ├── M-ED-专业模型设计文档-V1.md  # 专业模型（5 大能力数据模型 + 双引擎设计）
│   ├── M-ED-规则引擎定义-V1.md     # 规则引擎（触发条件 + 5 组退路规则）
│   ├── prompts/
│   │   └── M-ED-Prompt体系设计文档-V1.md  # Prompt 体系（System + 5 模板 + 上下文注入）
│   ├── knowledge/
│   │   └── M-ED-知识资产结构设计文档-V1.md # 知识资产（5 组规则集 + 关键词库）
│   └── integration/
│       └── M-ED-母体对接技术框架规范-V1.md  # 母体对接协议（Manifest + Capability + Workflow）
├── tests/
│   ├── test_api.py                # API 集成测试（7 个端点端到端测试）
│   ├── test_hub.py                # Hub 调度测试（含参数化非股权/股权测试）
│   ├── test_intent.py             # 意图分类测试（强/弱/非股权/边界/英文）
│   ├── test_handlers.py           # 5 个 Handler 单元测试（成功/参数异常/边界）
│   └── test_knowledge.py          # 知识资产测试（审计 + 5 组规则）
├── demo.py                        # 验证脚本（python demo.py [能力名称|all]）
├── requirements.txt               # 最小依赖（FastAPI + Pydantic + pytest）
└── README.md
```

---

## 认证

可选认证，通过环境变量 `MED_API_KEY` 控制：

```bash
# 开发模式（无需认证）
export MED_API_KEY=""  # 默认

# 生产模式
export MED_API_KEY="your-secret-key"

# 请求时在 Header 中传递
# Authorization: Bearer your-secret-key
```

未配置 `MED_API_KEY` 时，所有端点开放访问。
健康检查端点 `/v1/agent/equity/health` 无需认证。

CORS 起源通过 `MED_CORS_ORIGINS` 配置（默认 `*`，多个用逗号分隔）。

---

## 配置

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `MED_API_KEY` | API 认证密钥 | 空（不认证） |
| `MED_CORS_ORIGINS` | 允许的 CORS 起源 | `*` |
| `OPENAI_API_KEY` | OpenAI API Key（启用 GPT-4 模式） | 空（使用规则引擎退路） |
| `ANTHROPIC_API_KEY` | Anthropic API Key（启用 Claude 模式） | 空（使用规则引擎退路） |

**LLM 优先级**：先检查 `model` 参数前缀（`gpt` 用 OpenAI，`claude` 用 Anthropic），需要安装对应 SDK（`pip install openai` 或 `pip install anthropic`）。

---

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| **框架** | FastAPI + Pydantic v2 | 异步原生，类型安全 |
| **LLM** | GPT-4 / Claude | 通过统一 Prompt 模板调用，含 System Prompt 约束 |
| **会话** | 线程安全内存管理 | 30 分钟 TTL，5 分钟自动清理 daemon 线程 |
| **认证** | HTTPBearer（可选） | 通过 `MED_API_KEY` 环境变量控制 |
| **测试** | pytest | 70+ 个测试用例覆盖 Hub 调度 + 意图分类 + 5 个 Handler + API 集成 + 知识资产 + 审计轨迹 |
| **Python** | 3.12+ | 使用 `datetime.UTC`、`model_dump()` 等新 API |

---

## 测试

```bash
# 运行全部测试
pytest tests/ -v

# 运行特定模块
pytest tests/test_api.py -v           # API 端点集成测试（7 个）
pytest tests/test_handlers.py -v      # Handler 单元测试（9 个）
pytest tests/test_hub.py -v           # Hub 调度测试（22 个）
pytest tests/test_intent.py -v        # 意图分类测试（9 个）
pytest tests/test_knowledge.py -v     # 知识资产测试（审计 + 5 组规则）
```

## 验证脚本

```bash
# 运行全部 5 个能力验证（LLM 不可用时自动降级到规则退路）
python demo.py all

# 验证单个能力
python demo.py design                  # 股权结构设计
python demo.py adjust                  # 动态调整建议
python demo.py simulate                # 场景模拟
python demo.py compliance              # 合规检查
python demo.py document                # 文档生成

# 验证非股权过滤
python demo.py non-equity "你好"

# 验证会话管理
python demo.py session
```

---

## 错误码

| 状态码 | 错误码 | 说明 | 触发场景 |
|--------|--------|------|----------|
| 400 | `NON_EQUITY_MESSAGE` | 非股权相关消息 | 用户发送闲聊/无关内容 |
| 400 | `INVALID_PARAMETER` | 请求参数校验失败 | 必填字段缺失、格式错误 |
| 400 | `INVALID_ACTION` | 不支持的 action 类型 | action 不在支持列表中 |
| 401 | `UNAUTHORIZED` | API Key 无效或未提供 | 配置了 `MED_API_KEY` 但认证失败，由 HTTPBearer 中间件直接返回 |
| 404 | `SESSION_NOT_FOUND` | 会话不存在 | 指定的 session_id 已过期或无效 |
| 422 |  | Pydantic 校验失败 | 请求体结构不符，由 FastAPI 自动返回 |
| 500 | `INTERNAL_ERROR` | 服务端内部错误 | 未预期的异常 |
| 502 | `LLM_ERROR` | LLM 引擎响应异常 | LLM API 调用失败且无退路方案 |

---

## 设计决策

| 决策 | 方案 | 原因 |
|------|------|------|
| 错误处理 | AgentError → HTTPException + 全局异常处理器 | 统一错误格式，正确映射 HTTP 状态码 |
| 枚举去重 | IntentType 复用 AgentAction 值 | 避免两处维护，减少不同步风险 |
| 关键词匹配 | 中文整词 / 英文边界 | 避免 "分配" 匹配 "分配器" 等子串误判 |
| 会话刷新 | 每次 get_or_create 时更新时间戳 | 避免活跃会话被后台清理误删 |
| Handler 公共逻辑 | `handler_wrapper` 装饰器 | 消除 5 个 handler 中 60% 的重复模板代码 |
| 知识资产抽取 | `agent/knowledge/rules/` 独立模块 | 规则从 handler fallback 抽取为可测试的知识资产 |
| 审计轨迹 | `AuditTracker` + `TraceEvent` + `ScoreAdjustment` | 每次规则执行记录完整的事件/调整链路 |
| LLM 失败降级 | `model_not_found` 识别 + `handler_wrapper` 自动 fallback | 模型不可用时自动降级，不抛 502 |
