"""
动态调整建议 Handler

使用 handler_wrapper 消除重复的模板代码。
规则退路从 agent/knowledge/rules/equity_adjust 加载。
"""

from agent.models.schemas import AdjustEquityPayload
from agent.utils.llm import LLMEngine, ADJUST_EQUITY_PROMPT_TEMPLATE, build_context_section
from agent.handlers import handler_wrapper
from agent.knowledge.rules.equity_adjust import adjust_equity_fallback


def _build_adjust_prompt_vars(validated: AdjustEquityPayload) -> dict:
    """构造调整建议的 Prompt 变量"""
    return {
        "current_scheme": str(validated.current_scheme.model_dump()),
        "trigger_event": str(validated.trigger_event.model_dump()),
        "contributions": str([c.model_dump() for c in validated.contributions]),
        "adjustment_type": validated.adjustment_type.value,
    }


def _adjust_fallback(validated: AdjustEquityPayload) -> dict:
    """调整建议的规则引擎退路 — 委托到 knowledge 模块"""
    return adjust_equity_fallback(validated)


@handler_wrapper(
    payload_model=AdjustEquityPayload,
    prompt_template=ADJUST_EQUITY_PROMPT_TEMPLATE,
    fallback_fn=_adjust_fallback,
    prompt_builder=_build_adjust_prompt_vars,
)
def handle_adjust_equity(payload: dict, llm: LLMEngine, context: dict | None,
                         validated: AdjustEquityPayload, result: dict) -> dict:
    """动态调整建议 — 后处理（无需额外逻辑）"""
    return result
