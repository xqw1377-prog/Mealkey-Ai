# M-ED 专业模型设计文档 V1

> **版本**：V1.0  
> **更新**：2025-07  
> **状态**：正式发布  

---

## 1. 概述

M-ED（MealKey Equity Decision Engine）是一套 **股权决策专业判断结构**，覆盖初创团队从股权设计到落地的全链路需求。核心包含 **5 大能力**：

| # | 能力 | 专业领域 | 输出 |
|---|------|---------|------|
| 1 | **股权结构设计** | 股权分配 | 分配方案 + 分析报告 |
| 2 | **动态调整建议** | 股权调整 | 调整建议 + 影响分析 |
| 3 | **场景模拟** | 融资稀释 | 多场景演变结果 |
| 4 | **合规检查** | 法律合规 | 逐项检查结果 + 建议 |
| 5 | **文档生成** | 法律文档 | 协议/决议/报告 |

---

## 2. 股权结构设计模型

### 2.1 输入

| 字段 | 类型 | 说明 |
|------|------|------|
| project_name | string | 项目名称 |
| project_stage | enum | idea / seed / angel / pre-a / a |
| team_members | array | 团队成员列表 |
| additional_info | dict | 可选：initial_capital, vesting_period_months, cliff_months |

### 2.2 团队成员

| 字段 | 类型 | 说明 |
|------|------|------|
| role | string | 角色：创始人、CTO、COO、设计师、工程师、顾问 |
| name | string | 姓名 |
| contribution_type | enum | 全职 / 兼职 / 顾问 |
| responsibility | string | 职责描述 |
| expected_equity_range | dict | 可选：{ min, max }，范围 0–100 |

### 2.3 分配逻辑

**LLM 模式**：GPT-4/Claude 根据项目信息生成完整的分配方案，含推理过程。

**规则退路**：按角色权重分配

| 角色 | 权重 |
|------|------|
| 创始人 | 0.40 |
| CTO | 0.25 |
| COO | 0.20 |
| 工程师 | 0.15 |
| 设计师 | 0.08 |
| 顾问 | 0.05 |
| 其他 | 0.10 |

分配规则：
- 团队获得 70% 股权（按角色权重等比分配）
- 预留期权池 12%
- 余额为未分配部分
- 全职成员获"普通股"，非全职获"受限股"

### 2.4 输出结构

```json
{
  "scheme": {
    "name": "项目名 seed期股权分配方案",
    "version": "v1",
    "allocations": [
      { "member": "张三", "role": "创始人", "equity_percent": 40.0, "equity_type": "普通股", "rationale": "..." }
    ],
    "reserved_pool": { "name": "期权池", "equity_percent": 12.0 },
    "unallocated": 10.0,
    "summary": "方案说明"
  },
  "analysis": {
    "strengths": ["优势1"],
    "risks": ["风险1"],
    "suggestions": ["建议1"]
  }
}
```

---

## 3. 动态调整建议模型

### 3.1 输入

| 字段 | 类型 | 说明 |
|------|------|------|
| current_scheme | object | 当前股权方案 |
| trigger_event | object | 触发调整的事件 |
| contributions | array | 贡献记录列表 |
| adjustment_type | enum | general_review / milestone / new_member / departure |

### 3.2 触发事件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| milestone_completion | 里程碑达成 | "产品 MVP 上线" |
| new_funding | 新融资 | "完成天使轮" |
| member_join | 新成员加入 | "CTO 入职" |
| member_departure | 成员离开 | "联合创始人退出" |
| time_period | 定期回顾 | "半年回顾" |

### 3.3 调整逻辑

**LLM 模式**：GPT-4/Claude 综合当前方案 + 触发事件 + 贡献记录，生成调整建议和影响分析。

**规则退路**：

```
每项贡献记录 → achievement_weight = min(len(achievements) × 0.5, 5.0)
from_pct → to_pct = from_pct + achievement_weight
版本号：v1 → v1.1
```

### 3.4 输出结构

```json
{
  "adjustment_suggestion": {
    "current_version": "v1",
    "suggested_version": "v1.1",
    "changes": [
      { "member": "李四", "from": 25.0, "to": 27.0, "change": 2.0, "rationale": "..." }
    ]
  },
  "impact_analysis": {
    "voting_power": "分析",
    "future_funding": "分析",
    "team_morale": "分析"
  },
  "recommendations": ["操作建议"]
}
```

---

## 4. 场景模拟模型

### 4.1 输入

| 字段 | 类型 | 说明 |
|------|------|------|
| base_scheme | object | 基础股权方案 |
| scenarios | array | 模拟场景列表（至少 1 个） |

### 4.2 模拟事件类型

| 类型 | 说明 | 参数 |
|------|------|------|
| funding | 融资事件 | amount, dilution_percent, round |
| option_exercise | 期权行权 | pool_percent_used |

### 4.3 模拟逻辑

**LLM 模式**：GPT-4/Claude 进行复杂演算，包含多轮融资叠加、期权行权、控制权分析。

**规则退路**：等比稀释计算

```
初始状态：{ 张三: 45%, 李四: 25%, 期权池: 12% }
天使轮融资 20%：
  剩余比例 = 1 - 0.20 = 0.80
  张三: 45 × 0.80 = 36%
  李四: 25 × 0.80 = 20%
  期权池: 12 × 0.80 = 9.6%
  投资人(天使轮): 20%
```

### 4.4 输出结构

```json
{
  "scenarios": [
    {
      "name": "天使轮融资 500 万",
      "result": [
        { "member": "张三", "before": 45.0, "after": 36.0 }
      ],
      "summary": "模拟后合计: 100%"
    }
  ],
  "insights": ["洞察1"]
}
```

---

## 5. 合规检查模型

### 5.1 输入

| 字段 | 类型 | 说明 |
|------|------|------|
| scheme | object | 待检查的股权方案 |
| jurisdiction | enum | china / us / singapore / hk |
| check_items | array | 检查项目列表 |

### 5.2 检查项目

| 项目 | 说明 | 规则退路判断逻辑 |
|------|------|-----------------|
| vesting | Vesting 条款合理性 | total_months ≥ 36 且 cliff_months ≥ 6 → pass；否则 warn；无条款 → fail |
| equity_types | 股权类型区分 | 类型数 > 1 → pass；全部相同 → warn |
| ip_transfer | 知识产权转让 | 含受限股 → warn 需 IP 条款；不含 → warn 建议添加 |
| tax | 税务合规 | 始终 → warn 建议咨询税务专业人士 |
| founder_protection | 创始人保护 | max% ≥ 51 → pass；≥ 34 → warn；< 34 → fail |

### 5.3 输出结构

```json
{
  "overall_status": "pass | caution | fail",
  "checks": [
    { "item": "vesting", "status": "pass", "message": "..." }
  ],
  "critical_issues": [],
  "recommendations": ["建议1"]
}
```

---

## 6. 文档生成模型

### 6.1 输入

| 字段 | 类型 | 说明 |
|------|------|------|
| document_type | enum | equity_agreement_draft / board_resolution / shareholder_agreement / summary_report |
| scheme_version | string | 方案版本号 |
| scheme_data | dict | 方案数据（项目名、协议方、Vesting 条款等） |
| output_format | enum | markdown |

### 6.2 输出结构

```json
{
  "document": {
    "title": "项目名 股权分配协议（草案）",
    "generated_at": "ISO 时间戳",
    "content": "Markdown 内容",
    "format": "markdown",
    "disclaimer": "免责声明"
  }
}
```

---

## 7. 会话上下文模型

| 字段 | 类型 | 说明 |
|------|------|------|
| session_id | UUID | 会话唯一标识 |
| user_id | string | 用户标识 |
| current_scheme | dict | 当前方案（在 design/adjust 后更新） |
| team_members | array | 团队成员列表 |
| history | array | 操作历史（最多保留最近 3 条用于上下文注入） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 最后活跃时间 |

上下文生命周期：TTL 30 分钟，5 分钟自动清理。

---

## 8. 双引擎决策模型

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| **LLM 模式** | 配置了 API Key + 对应 SDK 已安装 | 调用 GPT-4 / Claude，temperature=0.3 |
| **规则退路** | 无 API Key 或 LLM 调用失败 | 使用预设规则生成基础方案 |
| **LLM 失败自动降级** | LLM 调用异常 | 自动降级到规则退路，记录 warning 日志 |

LLM 优先级判断：
1. 检查 `model` 参数前缀（`gpt` → OpenAI，`claude` → Anthropic）
2. 默认使用 `gpt-4`
3. OpenAI 强制 `response_format=json_object`
