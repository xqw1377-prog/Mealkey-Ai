"""
审计轨迹模块 — 记录每次评分/规则调整的完整链路

与 M-MKT 的 TraceEvent / ScoreAdjustment 对齐。

Usage:
    tracker = AuditTracker("design_equity")
    tracker.trace("parse_input", "解析请求参数", meta={"members": 2})
    tracker.adjust("role_weight", +2.0, "创始人角色权重调整", before=40.0)
    report = tracker.report()
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TraceEvent:
    """单次审计事件"""
    stage: str
    action: str
    detail: str
    meta: dict = field(default_factory=dict)
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "stage": self.stage,
            "action": self.action,
            "detail": self.detail,
            "meta": self.meta,
            "timestamp": self.timestamp,
        }


@dataclass
class ScoreAdjustment:
    """单次评分调整记录"""
    rule_name: str
    delta: float
    reason: str
    before: float
    after: float
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "rule": self.rule_name,
            "delta": round(self.delta, 2),
            "reason": self.reason,
            "before": round(self.before, 2),
            "after": round(self.after, 2),
        }


class AuditTracker:
    """
    审计追踪器 — 记录一次完整的规则执行链路

    Usage:
        tracker = AuditTracker("design_equity")
        tracker.trace("start", "开始分配计算")
        tracker.adjust("role_weight", -5.0, "调整原因", before=50.0)
        print(tracker.summary())
    """

    def __init__(self, action: str, session_id: str = ""):
        self.action = action
        self.session_id = session_id
        self._events: list[TraceEvent] = []
        self._adjustments: list[ScoreAdjustment] = []

    def trace(self, stage: str, action: str, detail: str = "", **meta) -> None:
        """记录审计事件"""
        self._events.append(TraceEvent(
            stage=stage,
            action=action,
            detail=detail,
            meta=meta,
        ))

    def adjust(self, rule_name: str, delta: float, reason: str,
               before: float = 0.0, after: float = 0.0) -> None:
        """记录评分调整"""
        if after == 0.0 and before != 0.0:
            after = before + delta
        self._adjustments.append(ScoreAdjustment(
            rule_name=rule_name,
            delta=delta,
            reason=reason,
            before=before,
            after=after,
        ))

    def summary(self) -> dict:
        """获取审计摘要"""
        return {
            "action": self.action,
            "session_id": self.session_id,
            "events_count": len(self._events),
            "adjustments_count": len(self._adjustments),
            "events": [e.to_dict() for e in self._events],
            "adjustments": [a.to_dict() for a in self._adjustments],
        }

    def report(self) -> dict:
        """获取完整审计报告（含精简事件链）"""
        chain = []
        for e in self._events:
            chain.append({
                "stage": e.stage,
                "action": e.action,
                "detail": e.detail
            })
        for a in self._adjustments:
            chain.append({
                "stage": "adjust",
                "action": a.rule_name,
                "detail": f"{a.reason} ({a.delta:+.1f}) → {a.after:.1f}"
            })
        return {
            "action": self.action,
            "chain": chain,
        }
