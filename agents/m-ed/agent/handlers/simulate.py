"""
场景模拟 Handler

使用 handler_wrapper 消除重复的模板代码。
规则退路从 agent/knowledge/rules/simulate 加载。
"""

from agent.models.schemas import SimulatePayload
from agent.utils.llm import LLMEngine, SIMULATE_PROMPT_TEMPLATE, build_context_section
from agent.handlers import handler_wrapper
from agent.knowledge.rules.simulate import simulate_fallback


def _build_simulate_prompt_vars(validated: SimulatePayload) -> dict:
    """构造场景模拟的 Prompt 变量"""
    return {
        "base_scheme": str(validated.base_scheme.model_dump()),
        "scenarios": str([s.model_dump() for s in validated.scenarios]),
    }


def _simulate_fallback(validated: SimulatePayload) -> dict:
    """场景模拟的规则引擎退路 — 委托到 knowledge 模块"""
    return simulate_fallback(validated)


@handler_wrapper(
    payload_model=SimulatePayload,
    prompt_template=SIMULATE_PROMPT_TEMPLATE,
    fallback_fn=_simulate_fallback,
    prompt_builder=_build_simulate_prompt_vars,
)
def handle_simulate(payload: dict, llm: LLMEngine, context: dict | None,
                    validated: SimulatePayload, result: dict) -> dict:
    """场景模拟 — 后处理（无需额外逻辑）"""
    return result
