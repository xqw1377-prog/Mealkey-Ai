"""
M-ED 股权决策 Agent — 会话上下文管理器

职责：
  - 管理多轮会话的上下文
  - 支持上下文持久化（内存中，可扩展为 Redis）
  - 符合对接规范文档中的上下文管理策略
"""

import uuid
import time
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from collections import OrderedDict

from agent.models.schemas import SessionContext
from agent.utils.errors import SessionNotFoundError


class SessionManager:
    """
    会话上下文管理器。

    使用内存存储（线程安全），支持：
    - 创建/获取/重置/删除会话
    - 自动清理过期会话
    - 上下文信息维护
    """

    def __init__(self, session_ttl_seconds: int = 1800, cleanup_interval: int = 300):
        """
        Args:
            session_ttl_seconds: 会话存活时间（秒），默认 30 分钟
            cleanup_interval: 清理间隔（秒），默认 5 分钟
        """
        self._sessions: Dict[str, SessionContext] = OrderedDict()
        self._ttl = session_ttl_seconds
        self._lock = threading.Lock()

        # 启动后台清理线程
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_interval = cleanup_interval
        self._cleanup_thread.start()

    def create_session(self, user_id: str, language: str = "zh-CN") -> SessionContext:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        context = SessionContext(
            session_id=session_id,
            user_id=user_id,
            language=language,
        )
        with self._lock:
            self._sessions[session_id] = context
        return context

    def get_session(self, session_id: str) -> SessionContext:
        """获取会话上下文，不存在则报错"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            return context

    def get_or_create(self, session_id: Optional[str], user_id: str, language: str = "zh-CN") -> SessionContext:
        """获取或创建会话（自动刷新时间戳）"""
        if session_id:
            try:
                ctx = self.get_session(session_id)
                self.refresh_session(session_id)
                return ctx
            except SessionNotFoundError:
                pass
        return self.create_session(user_id, language)

    def reset_session(self, session_id: str) -> SessionContext:
        """重置会话上下文（线程安全）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            context.reset()
            return context

    def delete_session(self, session_id: str):
        """删除会话"""
        with self._lock:
            self._sessions.pop(session_id, None)

    def update_current_scheme(self, session_id: str, scheme: dict):
        """更新当前方案（线程安全）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            context.current_scheme = scheme

    def update_preferences(self, session_id: str, preferences: dict):
        """更新用户偏好（线程安全）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            context.preferences.update(preferences)

    def refresh_session(self, session_id: str):
        """刷新会话时间戳（线程安全）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if context:
                context.updated_at = datetime.now(timezone.utc)

    def add_history(self, session_id: str, action: str, summary: str):
        """添加历史记录（线程安全）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            context.add_history(action, summary)

    def get_context_summary(self, session_id: str) -> dict:
        """获取上下文摘要（用于 LLM 上下文注入，线程安全快照）"""
        with self._lock:
            context = self._sessions.get(session_id)
            if not context:
                raise SessionNotFoundError(session_id)
            return {
                "session_id": context.session_id,
                "user_id": context.user_id,
                "language": context.language,
                "current_scheme": context.current_scheme,
                "has_current_scheme": context.current_scheme is not None,
                "team_members_count": len(context.team_members),
                "team_members": [m.model_dump() for m in context.team_members],
                "history_count": len(context.history),
                "recent_history": context.history[-3:] if context.history else [],
            }

    def _cleanup_loop(self):
        """后台清理过期会话"""
        while True:
            time.sleep(self._cleanup_interval)
            self._cleanup_expired()

    def _cleanup_expired(self):
        """清理过期会话"""
        now = datetime.now(timezone.utc).timestamp()
        expired_ids = []
        with self._lock:
            for sid, ctx in self._sessions.items():
                age = now - ctx.updated_at.timestamp()
                if age > self._ttl:
                    expired_ids.append(sid)
            for sid in expired_ids:
                del self._sessions[sid]

    @property
    def active_session_count(self) -> int:
        """当前活跃会话数"""
        with self._lock:
            return len(self._sessions)


# 全局单例
session_manager = SessionManager()
