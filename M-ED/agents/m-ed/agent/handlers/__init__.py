"""
M-ED 股权决策引擎 — Handler 公共工具

提供 handler_wrapper 装饰器，消除 5 个 handler 中重复的：
  参数校验 → LLM 调用/退路 → 补充 metadata 模板代码
"""

import logging
from datetime import datetime, timezone
from functools import wraps
from typing import Callable, Optional, Any

from agent.utils.llm import LLMEngine
from agent.utils.errors import InvalidParameterError, LLMError

logger = logging.getLogger(__name__)


def handler_wrapper(
    payload_model: type,
    prompt_template: str = "",
    fallback_fn: Optional[Callable] = None,
    prompt_builder: Optional[Callable] = None,
):
    """
    装饰器：统一 handler 的「参数校验 → Prompt 构建 → LLM/退路 → metadata」流程。

    Args:
        payload_model: Pydantic 模型类，用于参数校验
        prompt_template: LLM Prompt 模板
        fallback_fn: 规则引擎退路函数（接收 validated 对象）
        prompt_builder: Prompt 变量构造器（接收 validated 对象，返回 dict）

    Usage:
        @handler_wrapper(
            payload_model=DesignEquityPayload,
            prompt_template=DESIGN_EQUITY_PROMPT_TEMPLATE,
            fallback_fn=_design_fallback,
            prompt_builder=_build_design_prompt_vars,
        )
        def handle_design_equity(payload, llm, context, validated, result):
            # 可选的后处理逻辑
            return result
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(
            payload: dict,
            llm: LLMEngine,
            context: Optional[dict] = None,
        ) -> dict:
            # 1. 参数校验
            try:
                validated = payload_model(**payload)
            except Exception as e:
                raise InvalidParameterError(
                    message=f"参数校验失败: {str(e)}",
                    details={"field": str(e)},
                )

            # 2. 调用 LLM 或退路
            try:
                if llm.is_available() and prompt_template:
                    kwargs = prompt_builder(validated) if prompt_builder else {}
                    # 注入会话上下文段落
                    from agent.utils.llm import build_context_section
                    kwargs["context_section"] = build_context_section(context)
                    result = llm.generate(prompt_template, **kwargs)
                elif fallback_fn:
                    logger.info("LLM 不可用，使用规则引擎退路方案")
                    result = fallback_fn(validated)
                else:
                    result = {"message": "无 LLM 可用且未配置退路方案"}
            except Exception as e:
                # LLM 调用失败时自动降级到 fallback
                if fallback_fn:
                    logger.warning(f"LLM 调用失败，自动降级到规则引擎退路: {e}")
                    result = fallback_fn(validated)
                else:
                    logger.error(f"LLM/退路调用失败: {e}")
                    raise LLMError(message=f"处理请求时出错: {str(e)}")

            # 3. 补充元数据
            result.setdefault("metadata", {})
            result["metadata"]["model"] = llm.model if llm.is_available() else "rule_engine"
            result["metadata"]["generated_at"] = datetime.now(timezone.utc).isoformat()

            # 4. 后处理（原 handler 的额外逻辑）
            return func(payload, llm, context, validated, result)
        return wrapper
    return decorator
