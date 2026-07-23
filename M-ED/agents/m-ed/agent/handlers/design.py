"""
股权结构设计 Handler

使用 handler_wrapper 消除重复的模板代码。
规则退路从 agent/knowledge/rules/equity_design 加载。
"""

from agent.models.schemas import DesignEquityPayload
from agent.utils.llm import LLMEngine, DESIGN_EQUITY_PROMPT_TEMPLATE, build_context_section
from agent.handlers import handler_wrapper
from agent.knowledge.rules.equity_design import design_equity_fallback


def _build_design_prompt_vars(validated: DesignEquityPayload) -> dict:
    """构造设计方案的 Prompt 变量"""
    team_members_str = "\n".join(
        f"  - {m.name} ({m.role}, {m.contribution_type.value}): {m.responsibility}"
        for m in validated.team_members
    )
    return {
        "project_name": validated.project_name,
        "project_stage": validated.project_stage.value,
        "team_members": team_members_str,
        "additional_info": str(validated.additional_info or {}),
    }


def _design_fallback(validated: DesignEquityPayload) -> dict:
    """股权分配规则引擎退路 — 委托到 knowledge 模块"""
    return design_equity_fallback(validated.model_dump())


@handler_wrapper(
    payload_model=DesignEquityPayload,
    prompt_template=DESIGN_EQUITY_PROMPT_TEMPLATE,
    fallback_fn=_design_fallback,
    prompt_builder=_build_design_prompt_vars,
)
def handle_design_equity(payload: dict, llm: LLMEngine, context: dict | None,
                         validated: DesignEquityPayload, result: dict) -> dict:
    """股权结构设计 — 后处理（无需额外逻辑）"""
    return result
