"""
合规检查 Handler

使用 handler_wrapper 消除重复的模板代码。
规则退路从 agent/knowledge/rules/compliance 加载。
"""

import json
from agent.models.schemas import ComplianceCheckPayload
from agent.utils.llm import LLMEngine, COMPLIANCE_PROMPT_TEMPLATE, build_context_section
from agent.handlers import handler_wrapper
from agent.knowledge.rules.compliance import compliance_fallback


def _build_compliance_prompt_vars(validated: ComplianceCheckPayload) -> dict:
    """构造合规检查的 Prompt 变量"""
    return {
        "scheme": json.dumps(validated.scheme.model_dump(), ensure_ascii=False, indent=2),
        "jurisdiction": validated.jurisdiction.value,
        "check_items": ", ".join(item.value for item in validated.check_items),
    }


def _compliance_fallback(validated: ComplianceCheckPayload) -> dict:
    """合规检查的规则引擎退路 — 委托到 knowledge 模块"""
    return compliance_fallback(validated)


@handler_wrapper(
    payload_model=ComplianceCheckPayload,
    prompt_template=COMPLIANCE_PROMPT_TEMPLATE,
    fallback_fn=_compliance_fallback,
    prompt_builder=_build_compliance_prompt_vars,
)
def handle_compliance_check(payload: dict, llm: LLMEngine, context: dict | None,
                            validated: ComplianceCheckPayload, result: dict) -> dict:
    """合规检查 — 后处理（补充管辖地元数据）"""
    result.setdefault("metadata", {})
    result["metadata"]["jurisdiction"] = validated.jurisdiction.value
    return result
