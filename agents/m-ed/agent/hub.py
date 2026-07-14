"""
M-ED 股权决策 Agent — Agent Hub 核心调度中枢

职责：
  - 请求路由：根据 action 分发到对应的 handler
  - 编排：串联 LLM 调用、上下文管理、知识库查询
  - 非股权消息过滤：调用意图分类器，拒绝非股权请求
  - 错误处理：统一捕获异常并返回标准错误响应
"""

import logging
from typing import Optional, Any

from agent.classifiers.intent import (
    validate_and_classify,
    IntentType,
)
from agent.models.schemas import AgentRequest, AgentResponse, AgentAction
from agent.session.manager import session_manager
from agent.utils.llm import LLMEngine, create_llm_engine
from agent.utils.errors import (
    AgentError,
    InvalidActionError,
    InternalError,
    NonEquityMessageError,
)

from agent.handlers.design import handle_design_equity
from agent.handlers.adjust import handle_adjust_equity
from agent.handlers.simulate import handle_simulate
from agent.handlers.compliance import handle_compliance_check
from agent.handlers.document import handle_generate_document

logger = logging.getLogger(__name__)


class AgentHub:
    """
    Agent Hub — 核心调度中枢。

    职责：
      1. 接收 AgentRequest
      2. 意图识别（非股权消息直接拒绝）
      3. 会话上下文管理
      4. 路由到对应的 handler
      5. 统一响应格式
    """

    def __init__(self, llm: Optional[LLMEngine] = None):
        self.llm = llm or create_llm_engine()
        self.session_mgr = session_manager

        # action → handler 映射
        self._handler_map = {
            IntentType.DESIGN_EQUITY: handle_design_equity,
            IntentType.ADJUST_EQUITY: handle_adjust_equity,
            IntentType.SIMULATE: handle_simulate,
            IntentType.COMPLIANCE_CHECK: handle_compliance_check,
            IntentType.GENERATE_DOCUMENT: handle_generate_document,
        }

    def process(self, request: AgentRequest) -> AgentResponse:
        """
        处理 Agent 请求的主入口。

        Args:
            request: 经过 Pydantic 校验的请求

        Returns:
            AgentResponse: 统一响应

        Raises:
            AgentError: 已知业务异常，由 FastAPI 异常处理器映射为 HTTP 状态码
        """
        try:
            return self._process_internal(request)
        except AgentError:
            # 业务异常直接向上抛出，由 main.py 的异常处理器映射 HTTP 状态码
            raise
        except Exception as e:
            logger.exception(f"未预期的错误: {e}")
            raise InternalError("服务端内部错误，请稍后重试") from e

    def _process_internal(self, request: AgentRequest) -> AgentResponse:
        """内部处理逻辑"""
        # ============================================================
        # Step 0: 意图识别 — 非股权消息拒绝
        # ============================================================
        # 从 payload 中提取用户输入文本
        user_text = self._extract_user_text(request)

        # 仅当 payload 是纯文本（无结构化字段）时才走意图分类
        # 如果 payload 含结构化数据（如 project_name、current_scheme），信任用户显式 action
        is_text_only = user_text and len(request.payload) <= 1
        if is_text_only:
            try:
                intent, metadata = validate_and_classify(user_text)
                if intent == IntentType.NON_EQUITY:
                    raise NonEquityMessageError()

                # 仅在纯文本模式下覆盖 action
                if intent != IntentType.NON_EQUITY and intent != request.action.value:
                    logger.info(
                        f"意图分类器覆盖 action: {intent} "
                        f"(原: {request.action.value})"
                    )
                    from copy import deepcopy
                    request = deepcopy(request)
                    request.action = AgentAction(intent)
            except NonEquityMessageError:
                raise
            except Exception as e:
                logger.warning(f"意图分类异常: {e}")
        elif user_text:
            # 结构化 payload 中有文本字段 — 仅做非股权过滤，不覆盖 action
            try:
                intent, _ = validate_and_classify(user_text)
                if intent == IntentType.NON_EQUITY:
                    raise NonEquityMessageError()
            except NonEquityMessageError:
                raise
            except Exception:
                pass  # 分类器异常不阻断

        # ============================================================
        # Step 1: 会话上下文管理
        # ============================================================
        context = self.session_mgr.get_or_create(
            session_id=request.session_id,
            user_id=request.user_id,
            language=request.language,
        )

        # ============================================================
        # Step 2: 特殊 action 处理
        # ============================================================
        if request.action.value == IntentType.GET_CONTEXT:
            summary = self.session_mgr.get_context_summary(context.session_id)
            return AgentResponse(
                session_id=context.session_id,
                status="success",
                data=summary,
            )

        if request.action.value == IntentType.RESET_CONTEXT:
            self.session_mgr.reset_session(context.session_id)
            return AgentResponse(
                session_id=context.session_id,
                status="success",
                data={"message": "会话上下文已重置"},
            )

        # ============================================================
        # Step 3: 路由到对应 handler
        # ============================================================
        intent_type = IntentType(request.action.value)
        handler = self._handler_map.get(intent_type)

        if not handler:
            raise InvalidActionError(request.action.value)

        # 执行 handler
        handler_result = handler(
            payload=request.payload,
            llm=self.llm,
            context=self.session_mgr.get_context_summary(context.session_id),
        )

        # ============================================================
        # Step 4: 更新上下文
        # ============================================================
        summary = self._build_action_summary(request, handler_result)
        self.session_mgr.add_history(
            session_id=context.session_id,
            action=request.action.value,
            summary=summary,
        )

        # 如果是设计或调整方案，保存到上下文
        if intent_type in (IntentType.DESIGN_EQUITY, IntentType.ADJUST_EQUITY):
            if "scheme" in handler_result or "adjustment_suggestion" in handler_result:
                self.session_mgr.update_current_scheme(
                    context.session_id, handler_result
                )

        # ============================================================
        # Step 5: 返回响应
        # ============================================================
        return AgentResponse(
            session_id=context.session_id,
            status="success",
            data=handler_result,
        )

    def _extract_user_text(self, request: AgentRequest) -> Optional[str]:
        """从请求中提取用户自然语言文本"""
        payload = request.payload

        # 如果是自由文本输入
        if isinstance(payload, str):
            return payload

        # 如果 payload 中有 text 或 query 字段
        if isinstance(payload, dict):
            for key in ("text", "query", "message", "input"):
                if key in payload and isinstance(payload[key], str):
                    return payload[key]

        return None

    def _build_action_summary(self, request: AgentRequest, result: dict) -> str:
        """从请求和结果中提取业务摘要用于 history"""
        action = request.action.value
        payload = request.payload
        if action == "design_equity":
            name = payload.get("project_name", "")
            stage = payload.get("project_stage", "")
            count = len(payload.get("team_members", []))
            return f"{name} {stage}期方案, {count}人"
        elif action == "adjust_equity":
            trigger = payload.get("trigger_event", {}).get("type", "")
            return f"触发: {trigger}"
        elif action == "simulate":
            count = len(payload.get("scenarios", []))
            return f"{count}个场景模拟"
        elif action == "compliance_check":
            items = ", ".join(payload.get("check_items", []))
            return f"检查: {items}"
        elif action == "generate_document":
            doc_type = payload.get("document_type", "")
            return f"文档: {doc_type}"
        return f"payload keys: {list(payload.keys())}"


# 全局单例
agent_hub = AgentHub()
