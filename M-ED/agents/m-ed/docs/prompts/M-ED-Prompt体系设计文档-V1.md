# M-ED Prompt 体系设计文档 V1

> **版本**：V1.0  
> **更新**：2025-07  
> **状态**：正式发布  

---

## 1. 概述

M-ED 使用 **1 个 System Prompt + 5 个能力 Prompt 模板** 构成完整的 Prompt 体系。

> 当前 Prompt 实现在 `agent/utils/llm.py` 中，System Prompt 为 `SYSTEM_PROMPT` 常量，5 个模板为 `{ACTION}_PROMPT_TEMPLATE` 常量。

---

## 2. System Prompt（全局约束）

```text
你是一个专业的股权决策顾问，名为 M-ED Equity Agent。
你的职责是根据用户提供的项目信息，给出股权结构设计、分配方案、
动态调整建议、合规检查或文档生成等专业建议。

【核心原则】
1. 所有建议必须基于用户提供的数据，不要凭空假设
2. 输出必须结构清晰，包含推理过程
3. 必须包含风险提示和免责声明
4. 使用中文输出，专业术语可保留英文
5. 涉及法律问题时，必须声明"建议咨询专业律师"

【输出格式要求】
始终使用 JSON 格式输出，确保数据结构完整可解析。
```

### 2.1 设计原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | **数据驱动** | 禁止凭空假设，所有建议基于用户提供的数据 |
| 2 | **结构化输出** | 强制 JSON 格式，便于后续解析和处理 |
| 3 | **风险提示** | 每个输出都包含风险和免责声明 |
| 4 | **专业用语** | 中文为主，专业术语保留英文 |
| 5 | **法律免责** | 涉及法律问题时声明"建议咨询专业律师" |

---

## 3. Prompt 模板

### 3.1 股权结构设计 — `DESIGN_EQUITY_PROMPT_TEMPLATE`

```
请根据以下项目信息设计股权分配方案：

项目名称: {project_name}
项目阶段: {project_stage}
团队成员:
{team_members}

附加信息: {additional_info}

{context_section}

请输出包含以下结构的 JSON：
1. scheme: 分配方案详情（allocations, reserved_pool, unallocated, summary）
2. analysis: 优势、风险、建议
3. 确保所有比例合计为 100%
```

**变量说明**：

| 变量 | 来源 | 格式 |
|------|------|------|
| project_name | payload.project_name | string |
| project_stage | payload.project_stage | enum value |
| team_members | payload.team_members | 多行文本，每行 "  - name (role, contribution): responsibility" |
| additional_info | payload.additional_info | JSON 字符串 |
| context_section | 会话上下文 | 格式化后的上下文段落 |

### 3.2 动态调整建议 — `ADJUST_EQUITY_PROMPT_TEMPLATE`

```
请根据以下信息提出股权调整建议：

当前方案: {current_scheme}
触发事件: {trigger_event}
贡献记录: {contributions}
调整类型: {adjustment_type}

{context_section}

请输出包含以下结构的 JSON：
1. adjustment_suggestion: 调整详情
2. impact_analysis: 影响分析
3. recommendations: 操作建议
```

### 3.3 场景模拟 — `SIMULATE_PROMPT_TEMPLATE`

```
请模拟以下场景的股权演变：

基础方案: {base_scheme}
场景列表: {scenarios}

{context_section}

请输出每个场景的详细演算结果和分析洞察。
```

### 3.4 合规检查 — `COMPLIANCE_PROMPT_TEMPLATE`

```
请对以下股权方案进行合规性审查：

方案: {scheme}
管辖地: {jurisdiction}
检查项目: {check_items}

{context_section}

请输出每个检查项目的状态（pass/warn/fail）、详细说明和建议。
```

### 3.5 文档生成 — `DOCUMENT_PROMPT_TEMPLATE`

```
请根据以下方案数据生成股权文档：

文档类型: {document_type}
方案版本: {scheme_version}
方案数据: {scheme_data}
输出格式: {output_format}

{context_section}

请输出完整的文档内容。
```

---

## 4. 上下文注入段落

每个 Prompt 模板的 `{context_section}` 由 `build_context_section()` 函数动态生成。

### 4.1 注入逻辑

```text
【会话上下文】
【输出语言】{language}                          # 仅当 language ≠ "zh-CN"
【当前方案】{current_scheme JSON}               # 仅当存在当前方案
【已知团队成员】name1(role1), name2(role2)      # 仅当有团队成员
【最近操作】action1(summary1); action2(summary2) # 仅当有历史记录
```

### 4.2 数据来源

上下文数据来自 `SessionManager.get_context_summary()`，包含：

| 字段 | 说明 |
|------|------|
| language | 输出语言 |
| has_current_scheme | 是否有当前方案 |
| current_scheme | 当前方案的完整 JSON |
| team_members | 团队成员列表 |
| recent_history | 最近 3 条操作历史 |

---

## 5. LLM 调用参数

| 参数 | 值 | 说明 |
|------|-----|------|
| temperature | 0.3 | 低温度确保输出稳定性和可复现性 |
| response_format (OpenAI) | json_object | 强制 JSON 输出 |
| max_tokens (Anthropic) | 4096 | 足够生成完整的股权文档 |

---

## 6. 输出解析策略

```
LLM 返回原始文本
    ├─ json.loads() 直接解析 → 成功 → 返回 dict
    └─ 解析失败 → 正则提取 ```json ... ``` 块
        ├─ 提取成功 → json.loads() → 返回 dict
        └─ 提取失败 → 抛异常 → handler_wrapper 自动降级到规则退路
```

---

## 7. 模型选择策略

```
model.startswith("gpt") → OpenAI SDK
model.startswith("claude") → Anthropic SDK
默认 → "gpt-4"
```

每个模型需要安装对应的 SDK：
- OpenAI: `pip install openai`
- Anthropic: `pip install anthropic`
