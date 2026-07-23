"""
M-ED 股权决策 Agent — 错误处理模块
完全对齐对接规范文档中的错误码定义
"""

from typing import Optional, Dict, Any


class AgentError(Exception):
    """Agent 基础异常"""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class InvalidParameterError(AgentError):
    """400: 请求参数校验失败"""
    def __init__(self, message: str = "请求参数校验失败", details: Optional[dict] = None):
        super().__init__(
            code="INVALID_PARAMETER",
            message=message,
            status_code=400,
            details=details,
        )


class InvalidActionError(AgentError):
    """400: 不支持的 action 类型"""
    def __init__(self, action: str):
        super().__init__(
            code="INVALID_ACTION",
            message=f"不支持的 action 类型: '{action}'",
            status_code=400,
            details={"supported_actions": [
                "design_equity",
                "adjust_equity",
                "simulate",
                "compliance_check",
                "generate_document",
                "get_context",
                "reset_context",
            ]},
        )


class SessionNotFoundError(AgentError):
    """404: session_id 不存在"""
    def __init__(self, session_id: str):
        super().__init__(
            code="SESSION_NOT_FOUND",
            message=f"指定的 session_id '{session_id}' 不存在",
            status_code=404,
            details={"session_id": session_id},
        )


class InternalError(AgentError):
    """500: 服务端内部错误"""
    def __init__(self, message: str = "服务端内部错误"):
        super().__init__(
            code="INTERNAL_ERROR",
            message=message,
            status_code=500,
        )


class LLMError(AgentError):
    """502: LLM 引擎响应异常"""
    def __init__(self, message: str = "LLM 引擎响应异常"):
        super().__init__(
            code="LLM_ERROR",
            message=message,
            status_code=502,
        )


# ============================================================
# 非股权消息过滤 — 用于意图分类后拒绝非股权请求
# ============================================================

class NonEquityMessageError(AgentError):
    """非股权相关消息，Agent 不处理"""
    def __init__(self):
        super().__init__(
            code="NON_EQUITY_MESSAGE",
            message="抱歉，M-ED 股权决策 Agent 仅处理股权相关的咨询。请提供股权结构设计、分配方案、动态调整、合规检查或文档生成相关的问题。",
            status_code=400,
            details={"hint": "请尝试提出股权相关的问题，例如：'帮我设计一个种子期的股权分配方案'"}
        )
