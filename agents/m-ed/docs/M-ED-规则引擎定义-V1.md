# M-ED 规则引擎定义 V1

> **版本**：V1.0  
> **更新**：2025-07  
> **状态**：正式发布  

---

## 1. 概述

M-ED 规则引擎作为 **LLM 不可用时的退路方案**，为 5 大能力提供基于预设规则的基础建议。规则引擎的核心目的是 **确保核心功能在无 API Key 时仍可工作**，而非替代 LLM 的专业性。

---

## 2. 架构

```
handler_wrapper 装饰器
    │
    ├─ llm.is_available() = true → LLM 模式
    │   └─ LLM 调用失败 → 自动降级到规则退路
    │
    └─ llm.is_available() = false → 规则引擎退路
        ├─ design_equity_fallback()
        ├─ adjust_fallback()
        ├─ simulate_fallback()
        ├─ compliance_fallback()
        └─ document_fallback()
```

---

## 3. 触发条件

| 场景 | 行为 |
|------|------|
| 未设置 OPENAI_API_KEY 且未设置 ANTHROPIC_API_KEY | 直接使用规则引擎 |
| 已设置 API Key 但对应 SDK 未安装 | LLMEngine 构造失败，使用规则引擎 |
| LLM API 调用超时/返回错误 | handler_wrapper 捕获异常，自动降级到规则引擎 |
| LLM 返回非 JSON 且无法解析 | handler_wrapper 捕获异常，自动降级到规则引擎 |

---

## 4. 各能力退路规则

详见 [知识资产结构设计文档](knowledge/M-ED-知识资产结构设计文档-V1.md)。

| 能力 | 规则引擎说明 | 与 LLM 差异 |
|------|------------|-------------|
| design_equity | 按角色权重分配，70% 分给团队 | 不考虑贡献度、协商历史、行业特性 |
| adjust_equity | 基于成就数量线性调整，每项 +0.5% | 不考虑贡献质量、市场环境、团队士气 |
| simulate | 等比稀释计算，多轮串联 | 不考虑反稀释条款、优先购买权等复杂场景 |
| compliance | 5 项规则判定（pass/warn/fail） | 规则与 LLM 判定一致（规则更精确） |
| document | 生成草案框架 + 免责声明 | 仅生成大纲，不包含具体条款表述 |
