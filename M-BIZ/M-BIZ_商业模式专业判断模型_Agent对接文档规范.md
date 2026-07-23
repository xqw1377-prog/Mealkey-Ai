# M-BIZ 商业模式专业判断模型 · Agent 对接文档规范

## 目录

1. [文档概述](#1-文档概述)
2. [对接模式总览](#2-对接模式总览)
3. [Agent 通信协议](#3-agent-通信协议)
4. [标准请求/响应规范](#4-标准请求响应规范)
5. [批处理模式](#5-批处理模式)
6. [流式模式](#6-流式模式)
7. [状态管理与上下文](#7-状态管理与上下文)
8. [错误处理与重试](#8-错误处理与重试)
9. [安全与鉴权](#9-安全与鉴权)
10. [SDK 与工具链](#10-sdk-与工具链)
11. [对接检查清单](#11-对接检查清单)

---

## 1. 文档概述

### 1.1 文档目的

本文档定义 M-BIZ 商业模式专业判断模型（BMJM）与外部 Agent 对接时的接口规范、通信协议、数据格式与交互流程，确保各 Agent 能够高效、可靠地调用 BMJM 的判断能力。

### 1.2 适用对象

| 角色 | 关注重点 |
|------|----------|
| Agent 开发者 | API 调用方式、数据结构、错误处理 |
| 系统集成工程师 | 部署架构、鉴权方式、性能要求 |
| 产品经理 | 能力边界、对接模式、使用场景 |
| 测试工程师 | 接口测试用例、验证规范 |

### 1.3 前置依赖

对接 Agent 需理解以下 BMJM 核心概念：
- **九维评估模型**：VP/CS/CH/CR/RS/KR/KA/KP/CS 九大维度
- **健康度等级**：健康/亚健康/警示/危险
- **判断层级**：L1 事实 / L2 规则 / L3 分析 / L4 策略
- **商业模式画像**：SaaS订阅/平台型/免费增值等 8+ 预置画像

详细定义请参考《M-BIZ 商业模式专业判断模型 V1》。

---

## 2. 对接模式总览

### 2.1 三种对接模式

BMJM 提供三种对接模式以适应不同场景：

| 模式 | 方式 | 适用场景 | 特点 |
|------|------|----------|------|
| 同步请求-响应 | REST POST /judge | 单次判断、实时评估 | 等待完整结果 |
| 批处理 | Async POST /judge/batch | 批量评估、大规模分析 | 异步提交+回调 |
| 流式推送 | WebSocket /ws/judge | 实时监控、持续评估 | 全双工+增量推送 |

### 2.2 模式选择指南

| 场景 | 推荐模式 | 理由 |
|------|----------|------|
| 用户交互页面 | REST 同步 | 即时反馈，用户体验好 |
| 后台批量分析 | 批处理 | 高吞吐，资源利用率高 |
| 企业仪表盘实时监控 | WebSocket 流式 | 持续更新，低延迟 |
| AI Agent 对话调用 | REST 同步 | 简单直接，与 LLM 配合好 |
| 定时任务/报告生成 | 批处理 | 可编排，支持调度 |

---

## 3. Agent 通信协议

### 3.1 基础信息

| 项目 | 规范 |
|------|------|
| 协议 | HTTPS / WSS |
| 数据格式 | JSON (UTF-8) |
| 编码 | UTF-8 |
| 时间格式 | ISO 8601 (UTC) |
| 请求路径前缀 | /api/v1/bmjm |
| 内容类型 | application/json |

### 3.2 端点总览

| 方法 | 路径 | 说明 | 模式 |
|------|------|------|------|
| POST | /judge | 单次商业模式判断 | 同步 |
| POST | /judge/batch | 批量提交判断任务 | 批处理 |
| GET | /judge/batch/{task_id} | 查询批处理任务状态 | 批处理 |
| GET | /judge/batch/{task_id}/results | 获取批处理结果 | 批处理 |
| GET | /ws/judge | WebSocket 流式判断 | 流式 |
| GET | /profiles | 获取商业模式画像列表 | 同步 |
| GET | /profiles/{profile_id} | 获取单个画像详情 | 同步 |
| GET | /benchmarks | 获取行业基准列表 | 同步 |
| GET | /benchmarks/{industry} | 获取特定行业基准 | 同步 |
| GET | /rules | 获取预置规则列表 | 同步 |
| POST | /validate | 校验输入数据格式 | 同步 |
| GET | /health | 健康检查 | 同步 |

### 3.3 公共请求头

| 头字段 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer 令牌 |
| X-Request-Id | 否 | 请求追踪 ID (UUID) |
| X-Agent-Id | 是 | Agent 标识 |
| X-Agent-Version | 否 | Agent 版本号 |
| Content-Type | 是 | application/json |

### 3.4 公共响应头

| 头字段 | 说明 |
|--------|------|
| X-Request-Id | 请求追踪 ID |
| X-Processing-Time-Ms | 服务端处理耗时 |
| X-RateLimit-Remaining | 剩余请求配额 |
| X-RateLimit-Reset | 配额重置时间 |

---

## 4. 标准请求/响应规范

### 4.1 商业模式判断 (POST /judge)

#### 请求体

```json
{
  "request_id": "bmjm_req_001",
  "enterprise": {
    "name": "智云科技",
    "industry": "saas",
    "stage": "growth",
    "scale": "mid"
  },
  "business_model_data": {
    "value_proposition": {
      "description": "为企业提供智能客服 SaaS 平台",
      "pain_points": ["客服成本高", "响应效率低", "数据无法沉淀"],
      "differentiation": "AI 驱动的全渠道智能客服"
    },
    "customer_segments": {
      "primary": "中小型电商企业",
      "secondary": "中型零售企业",
      "tam": 5000000000,
      "sam": 500000000
    },
    "channels": {
      "types": ["inbound_marketing", "direct_sales", "partner_channel"],
      "cac": 8000
    },
    "customer_relationships": {
      "type": "dedicated_cs + self_service",
      "monthly_churn_rate": 0.04,
      "nps": 45
    },
    "revenue_streams": {
      "types": ["monthly_subscription", "annual_subscription"],
      "mrr": 2000000,
      "arpu": 2000,
      "top_revenue_share": 0.9
    },
    "key_resources": {
      "primary": "AI 算法团队 + SaaS 平台",
      "unique": "行业垂直领域训练数据集"
    },
    "key_activities": {
      "primary": "产品研发 + 客户成功"
    },
    "key_partnerships": {
      "main_partners": ["云服务提供商", "电商平台"],
      "dependence_level": "medium"
    },
    "cost_structure": {
      "major_costs": ["研发人员工资", "云服务费用", "销售薪酬"],
      "gross_margin": 0.72
    }
  },
  "config": {
    "min_confidence": 0.6,
    "include_evidence_chain": true,
    "include_benchmarking": true,
    "dimension_weights": null,
    "custom_rules": []
  }
}
```

#### 请求字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| request_id | string | 是 | 请求唯一标识(UUID) |
| enterprise.name | string | 是 | 企业名称 |
| enterprise.industry | string | 是 | 所属行业(枚举值) |
| enterprise.stage | string | 是 | 发展阶段 |
| enterprise.scale | string | 是 | 规模 |
| business_model_data | object | 是 | 九维模型数据 |
| config.min_confidence | number | 否 | 最低置信度阈值(默认0.6) |
| config.include_evidence_chain | boolean | 否 | 是否包含推理链(默认true) |
| config.include_benchmarking | boolean | 否 | 是否包含对标分析(默认true) |
| config.dimension_weights | object | 否 | 自定义维度权重(null使用默认值) |
| config.custom_rules | array | 否 | 附加自定义规则ID列表 |
| config.require_verification | boolean | 否 | 是否强制每条建议附带验证动作(默认true) |

#### 响应体

```json
{
  "request_id": "bmjm_req_001",
  "code": 0,
  "message": "success",
  "data": {
    "model_type": "saas_subscription",
    "match_confidence": 0.85,
    "dimension_scores": {
      "VP": {"score": 4, "summary": "AI 客服价值主张清晰，与痛点匹配度高"},
      "CS": {"score": 4, "summary": "客户细分明确，目标市场容量充足"},
      "CH": {"score": 3, "summary": "渠道组合合理，但 CAC 高于行业中位"},
      "CR": {"score": 3, "summary": "留存率处于行业中位水平，有优化空间"},
      "RS": {"score": 3, "summary": "订阅收入稳定，但收入来源单一"},
      "KR": {"score": 4, "summary": "AI 算法团队和数据资产构成核心壁垒"},
      "KA": {"score": 3, "summary": "业务聚焦度良好，运营效率中等"},
      "KP": {"score": 3, "summary": "合作伙伴结构合理，依赖度可控"},
      "CS": {"score": 3, "summary": "毛利率合理但人员成本占比偏高"}
    },
    "overall_health": {
      "score": 0.71,
      "level": "sub_healthy"
    },
    "benchmarking": {
      "industry": "saas",
      "deviations": {
        "cac": {"value": 8000, "benchmark": 5000, "deviation": 0.6, "status": "below_avg"},
        "churn_rate": {"value": 0.04, "benchmark": 0.05, "deviation": -0.2, "status": "above_avg"},
        "gross_margin": {"value": 0.72, "benchmark": 0.75, "deviation": -0.04, "status": "at_par"},
        "nps": {"value": 45, "benchmark": 40, "deviation": 0.125, "status": "above_avg"}
      }
    },
    "risk_alerts": [
      {
        "rule_id": "R-BM-001",
        "severity": "medium",
        "message": "收入来源单一，top1 收入占比 90%",
        "suggestion": "探索按用量付费、增值服务等新收入模式",
        "verification_hint": "请先分析 top 10 客户的月度使用数据，估算按量付费的潜在收入规模"
      }
    ],
    "strategic_suggestions": [
      {
        "priority": "high",
        "dimension": "RS",
        "action": "拓展按使用量计费的弹性付费方案",
        "expected_impact": "降低入门门槛，提升客户覆盖，分散收入来源",
        "verification_action": "请先对现有 top 20 客户做付费意愿调研，统计愿意切换为按量付费的比例，若 > 30% 再推进开发"
      },
      {
        "priority": "high",
        "dimension": "CH",
        "action": "加大内容营销投入，降低对 direct sales 的依赖",
        "expected_impact": "降低 CAC，提升获客效率",
        "verification_action": "请先试运行 1 个月的内容营销（4 篇深度文章 + 2 场研讨会），对比 CAC 后再决策"
      }
    ],
    "evidence_chain": [
      {
        "step": 1,
        "rule_id": "R-BM-001",
        "input_summary": "收入来源数量=2，top1占比=0.9",
        "output_summary": "收入来源单一，触发风险预警",
        "confidence": 0.85
      }
    ],
    "metadata": {
      "processing_time_ms": 3120,
      "rules_triggered": ["R-BM-001", "R-BM-002", "R-BM-003", "R-BM-007", "R-BM-012"],
      "profiles_matched": ["PROF-SAAS-001"],
      "model_version": "1.0"
    }
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| code | integer | 状态码(0=成功) |
| message | string | 状态描述 |
| data.model_type | string | 匹配的商业模式类型 |
| data.match_confidence | number | 画像匹配置信度 |
| data.dimension_scores | object | 九大维度评分详情 |
| data.overall_health.score | number | 综合健康度[0,1] |
| data.overall_health.level | string | 健康度等级 |
| data.benchmarking | object | 行业对标结果 |
| data.risk_alerts | array | 风险预警列表 |
| data.strategic_suggestions | array | 策略建议列表（每条必须含 verification_action） |
| data.risk_alerts | array | 风险预警列表（建议含 verification_hint） |
| data.evidence_chain | array | 推理证据链 |
| data.metadata | object | 处理元信息 |

---

## 5. 批处理模式

### 5.1 提交批量任务 (POST /judge/batch)

```json
{
  "task_id": "batch_001",
  "callback_url": "https://agent.example.com/callback",
  "entries": [
    {
      "request_id": "req_001",
      "enterprise": { "name": "企业A", "industry": "saas", "stage": "growth", "scale": "mid" },
      "business_model_data": {},
      "config": {}
    },
    {
      "request_id": "req_002",
      "enterprise": { "name": "企业B", "industry": "ecommerce", "stage": "mature", "scale": "large" },
      "business_model_data": {},
      "config": {}
    }
  ]
}
```

响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "batch_001",
    "status": "pending",
    "total_entries": 2,
    "accepted_entries": 2,
    "created_at": "2026-07-10T12:00:00Z"
  }
}
```

### 5.2 查询任务状态 (GET /judge/batch/{task_id})

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "batch_001",
    "status": "processing",
    "total_entries": 2,
    "completed": 1,
    "failed": 0,
    "progress": 0.5,
    "created_at": "2026-07-10T12:00:00Z",
    "updated_at": "2026-07-10T12:01:30Z"
  }
}
```

**状态枚举：** pending / processing / completed / failed / partial

### 5.3 获取批处理结果

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "batch_001",
    "status": "completed",
    "results": [
      { "request_id": "req_001", "code": 0, "data": { "...": "判断结果" } },
      { "request_id": "req_002", "code": 0, "data": { "...": "判断结果" } }
    ],
    "summary": {
      "total": 2, "success": 2, "failed": 0, "avg_processing_time_ms": 2800
    }
  }
}
```

### 5.4 回调通知

任务完成后向 callback_url 推送：
```
POST {callback_url}
Content-Type: application/json

{
  "task_id": "batch_001",
  "status": "completed",
  "summary": { "total": 2, "success": 2, "failed": 0 },
  "results_url": "/api/v1/bmjm/judge/batch/batch_001/results",
  "completed_at": "2026-07-10T12:02:00Z"
}
```

---

## 6. 流式模式

### 6.1 WebSocket 连接

```
端点: wss://api.mbiz.com/api/v1/bmjm/ws/judge
鉴权: wss://.../ws/judge?token={token}&agent_id={agent_id}
```

### 6.2 消息帧格式

```json
{
  "type": "message_type",
  "request_id": "uuid",
  "payload": {},
  "timestamp": "2026-07-10T12:00:00Z"
}
```

### 6.3 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| judge_request | C -> S | 发起判断 |
| judge_progress | S -> C | 进度通知 |
| judge_partial | S -> C | 部分结果 |
| judge_complete | S -> C | 完整结果 |
| judge_error | S -> C | 错误通知 |
| ping/pong | 双向 | 心跳(30s间隔) |

### 6.4 流式交互示例

```
C: {"type":"judge_request","request_id":"s001","payload":{"enterprise":{...}}}
S: {"type":"judge_progress","request_id":"s001","payload":{"stage":"scoring","progress":0.3}}
S: {"type":"judge_partial","request_id":"s001","payload":{"dimension":"VP","score":4}}
S: {"type":"judge_progress","request_id":"s001","payload":{"stage":"benchmarking","progress":0.7}}
S: {"type":"judge_complete","request_id":"s001","payload":{"model_type":"...","overall_health":{...}}}
```

### 6.5 心跳保活

- 客户端每 30 秒发送 ping
- 服务端回复 pong
- 60 秒无消息则关闭连接

---

## 7. 状态管理与上下文

### 7.1 会话模式

| 机制 | 说明 | 生命周期 |
|------|------|----------|
| 无状态 | 每次请求独立处理 | 单次 |
| 会话状态 | session_id 关联多轮 | 会话期间 |
| 持久状态 | 企业级长期保持 | 按配置过期 |

### 7.2 会话模式请求

```json
{
  "request_id": "session_req_001",
  "session_id": "sess_abc123",
  "enterprise": {},
  "business_model_data": {},
  "config": {
    "session_mode": "incremental",
    "session_context": {
      "previous_judgments": ["judg_001"],
      "modified_dimensions": ["CH", "RS"],
      "user_feedback": {
        "judg_001": {"accepted": false, "correction": {"CH.score": 2}}
      }
    }
  }
}
```

### 7.3 数据保留策略

| 数据类别 | 保留时间 | 说明 |
|----------|----------|------|
| 请求日志 | 30 天 | 审计与调试 |
| 会话上下文 | 24 小时 | 多轮交互 |
| 企业画像缓存 | 7 天 | 避免重复计算 |
| 用户反馈 | 长期 | 模型优化依据 |

---

## 8. 验证动作强制要求

### 8.1 核心约束

BMJM 强制执行"不算死账"原则：**所有 strategic_suggestions 中的建议必须包含 verification_action 字段**。

### 8.2 合规检查

Agent 调用方在消费响应数据时应做以下检查：

| 检查项 | 说明 |
|--------|------|
| 存在性 | 每条 strategic_suggestion 必须有 verification_action |
| 非空性 | verification_action 不为空字符串 |
| 可读性 | 验证动作应当包含具体步骤和判断标准 |

### 8.3 异常处理

若 Agent 收到的响应中缺少 verification_action 字段，应：
1. 记录异常日志
2. 标记该响应为"需人工审核"
3. 可选：向 BMJM 反馈端点报告此问题

---

## 9. 错误处理与重试

### 8.1 HTTP 状态码

| 状态码 | 含义 | 处理建议 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 | 检查请求体格式 |
| 401 | 未授权 | 检查令牌有效性 |
| 403 | 权限不足 | 检查 Agent 权限 |
| 404 | 资源不存在 | 检查请求路径 |
| 422 | 数据校验失败 | 检查字段值 |
| 429 | 频率超限 | 降频等待 |
| 500 | 服务端错误 | 重试或联系支持 |
| 503 | 服务不可用 | 稍后重试 |

### 8.2 错误响应格式

```json
{
  "code": 40001,
  "message": "请求参数校验失败",
  "details": [
    {
      "field": "enterprise.industry",
      "message": "行业值不在允许范围内",
      "code": "VALIDATION_ENUM"
    }
  ],
  "request_id": "bmjm_req_001",
  "help_url": "https://docs.mbiz.com/errors/40001"
}
```

### 8.3 Agent 重试策略

| 错误码 | 是否重试 | 策略 |
|--------|----------|------|
| 400, 422 | 否 | 修正后重试 |
| 401, 403 | 否 | 更新令牌后重试 |
| 429 | 是 | 指数退避: 1s,2s,4s,8s,max30s |
| 500, 503 | 是 | 指数退避: 1s,2s,4s,8s,max30s |
| 超时 | 是 | 等待3s，最多3次 |

---

## 10. 安全与鉴权

### 9.1 鉴权方式

| 方式 | 适用场景 | 安全等级 |
|------|----------|----------|
| Bearer Token | 标准 API 调用 | 中 |
| API Key + Secret | 服务间调用 | 高 |
| OAuth 2.0 | 用户代理调用 | 高 |

### 9.2 权限范围 (Scopes)

| Scope | 说明 | 默认 |
|-------|------|------|
| bmjm:judge | 执行判断 | 是 |
| bmjm:judge:batch | 批量判断 | 按需 |
| bmjm:profiles:read | 读取画像 | 是 |
| bmjm:benchmarks:read | 读取基准 | 是 |
| bmjm:rules:read | 读取规则 | 按需 |
| bmjm:validate | 校验数据 | 是 |
| bmjm:feedback | 提交反馈 | 按需 |

### 9.3 速率限制

| 层级 | 限制 | 适用 |
|------|------|------|
| 免费 | 10 req/min | 开发测试 |
| 标准 | 60 req/min | 生产环境 |
| 高级 | 300 req/min | 大规模集成 |
| 批处理 | 1000 entries/batch | 批量任务 |

---

## 11. SDK 与工具链

### 10.1 官方 SDK

| 语言 | 状态 | 安装 |
|------|------|------|
| Python | V1 | pip install mbiz-bmjm-sdk |
| JavaScript/TS | V1 | npm install @mbiz/bmjm-sdk |
| Java | 规划中 | - |
| Go | 规划中 | - |

### 10.2 Python SDK 示例

```python
from mbiz_bmjm import BMJMClient

client = BMJMClient(api_key="your_key", agent_id="agent_001")

result = client.judge(
    enterprise={"name": "智云科技", "industry": "saas", "stage": "growth", "scale": "mid"},
    business_model_data={
        "value_proposition": {
            "description": "企业智能客服 SaaS 平台",
            "pain_points": ["客服成本高", "响应效率低"],
            "differentiation": "AI 全渠道智能客服"
        }
    },
    config={"include_benchmarking": True}
)

print(f"商业模式: {result.model_type}")
print(f"健康度: {result.overall_health.score} ({result.overall_health.level})")
print(f"风险数: {len(result.risk_alerts)}")
print(f"建议数: {len(result.strategic_suggestions)}")
```

### 10.3 JavaScript SDK 示例

```javascript
import { BMJMClient } from '@mbiz/bmjm-sdk';

const client = new BMJMClient({ apiKey: 'your_key', agentId: 'agent_001' });

const result = await client.judge({
  enterprise: { name: '智云科技', industry: 'saas', stage: 'growth', scale: 'mid' },
  businessModelData: {
    valueProposition: {
      description: '企业智能客服 SaaS 平台',
      painPoints: ['客服成本高', '响应效率低'],
      differentiation: 'AI 全渠道智能客服'
    }
  },
  config: { includeBenchmarking: true }
});

console.log(`商业模式: ${result.modelType}`);
console.log(`健康度: ${result.overallHealth.score}`);
```

### 10.4 cURL 示例

```bash
curl -X POST https://api.mbiz.com/api/v1/bmjm/judge \
  -H "Authorization: Bearer your_token" \
  -H "X-Agent-Id: agent_001" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "curl_001",
    "enterprise": {"name": "测试企业", "industry": "saas", "stage": "growth", "scale": "mid"},
    "business_model_data": {
      "value_proposition": {"description": "智能客服", "pain_points": ["成本高"], "differentiation": "AI"},
      "revenue_streams": {"types": ["monthly_subscription"], "mrr": 100000, "arpu": 2000, "top_revenue_share": 0.9}
    },
    "config": {"include_benchmarking": false}
  }'
```

---

## 12. 对接检查清单

### 11.1 对接前准备

| # | 事项 | 完成 |
|---|------|------|
| 1 | 获取 API 访问令牌 | |
| 2 | 确定对接模式(同步/批处理/流式) | |
| 3 | 阅读 BMJM 设计文档，理解九维模型 | |
| 4 | 确定需要对接的端点列表 | |
| 5 | 准备完整的企业测试数据 | |
| 6 | 配置回调地址(批处理模式) | |
| 7 | 设置速率限制与重试策略 | |

### 11.2 接口测试

| # | 测试项 | 预期 | 完成 |
|---|--------|------|------|
| 1 | 健康检查 /health | 200 | |
| 2 | 正常判断请求 | 完整结果 | |
| 3 | 缺失必填字段 | 400 + 错误详情 | |
| 4 | 无效行业值 | 422 + 枚举提示 | |
| 5 | 无效令牌 | 401 | |
| 6 | 频率超限 | 429 + 重试头 | |
| 7 | 批量提交+查询 | 异步完成 | |
| 8 | WebSocket 连接 | 流式返回 | |
| 9 | SDK 调用 | 与 API 一致 | |

### 11.3 上线前检查

| # | 事项 | 完成 |
|---|------|------|
| 1 | 实现重试逻辑 | |
| 2 | 配置请求超时时间 | |
| 3 | 监控 API 调用量与成功率 | |
| 4 | 设置错误率告警(>5%) | |
| 5 | 收集用户反馈并回传 | |
| 6 | 定期检查令牌有效期 | |
| 7 | 跟踪 API 更新日志 | |

---

## 附录

### A. 行业枚举值

| 值 | 行业 |
|----|------|
| saas | SaaS/云计算 |
| ecommerce | 电子商务 |
| retail | 消费零售 |
| enterprise_service | 企业服务 |
| fintech | 金融科技 |
| content_media | 内容/媒体 |
| hardware | 硬件制造 |
| healthcare | 医疗健康 |
| education | 教育 |
| logistics | 物流运输 |

### B. 发展阶段枚举

| 值 | 说明 |
|----|------|
| seed | 初创/产品市场匹配 |
| growth | 成长期 |
| mature | 成熟期 |
| decline | 衰退/转型期 |

### C. 企业规模枚举

| 值 | 参考标准 |
|----|----------|
| smb | 小型(<50人/<1000万) |
| mid | 中型(50-500人/1000万-1亿) |
| large | 大型(500-5000人/1亿-10亿) |
| enterprise | 超大型(>5000人/>10亿) |

### D. 响应码总表

| HTTP | 业务码 | 说明 |
|------|--------|------|
| 200 | 0 | 成功 |
| 400 | 30001 | 请求体格式错误 |
| 400 | 30002 | 缺少必填字段 |
| 422 | 40001 | 业务数据校验失败 |
| 422 | 40002 | 行业值不在允许范围 |
| 429 | 50001 | 请求频率超限 |
| 429 | 50002 | 并发数超限 |
| 500 | 10001 | 内部处理错误 |
| 500 | 10002 | 推理引擎异常 |
| 503 | 10003 | 服务过载 |

### E. 相关文档

- M-BIZ 商业模式专业判断模型 V1
- M-BIZ 专业判断模型设计文档 V1
- M-BIZ 知识资产体系设计文档 V1
- M-BIZ API 接口规范 V1
- M-BIZ SDK 使用指南

### F. 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
|------|------|--------|----------|
| V1.0 | 2026-07-10 | - | 初始版本 |

---

> **文档状态**：初稿
> **审核状态**：待审核
> **下次评审日期**：2026-07-17
