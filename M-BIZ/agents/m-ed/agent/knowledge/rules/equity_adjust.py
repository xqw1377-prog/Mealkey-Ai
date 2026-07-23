"""
动态调整建议 — 规则知识资产

贡献评分规则，从 handler/adjust.py 的 _adjust_fallback 抽取。
"""

from typing import Any
from agent.knowledge.audit import AuditTracker


# ============================================================
# 知识资产：贡献评分规则
# ============================================================

# 每项成就的权重增幅
ACHIEVEMENT_UNIT_WEIGHT = 0.5  # 每项 +0.5%
# 单次调整上限
MAX_ADJUSTMENT_WEIGHT = 5.0  # 最高 +5%


def calculate_adjustment(achievements_count: int) -> float:
    """根据成就数量计算调整幅度"""
    return min(achievements_count * ACHIEVEMENT_UNIT_WEIGHT, MAX_ADJUSTMENT_WEIGHT)


def adjust_equity_fallback(validated: Any, tracker: AuditTracker | None = None) -> dict:
    """
    调整建议规则引擎退路 — 基于贡献记录线性调整

    Args:
        validated: AdjustEquityPayload 实例
        tracker: 可选的审计追踪器

    Returns:
        调整建议 dict
    """
    t = tracker or AuditTracker("adjust_equity")
    t.trace("start", "parse", f"收到 {len(validated.contributions)} 条贡献记录",
            contributions_count=len(validated.contributions))

    changes = []
    for c in validated.contributions:
        from_pct = next(
            (a.equity_percent for a in validated.current_scheme.allocations if a.member == c.member),
            0
        )
        adj = calculate_adjustment(len(c.achievements))
        to_pct = round(from_pct + adj, 1)

        changes.append({
            "member": c.member,
            "from": from_pct,
            "to": to_pct,
            "change": round(to_pct - from_pct, 1),
            "rationale": f"基于 {len(c.achievements)} 项贡献记录: {', '.join(c.achievements[:2])}",
        })

        t.trace("adjust", "member",
                f"{c.member}: {from_pct}% → {to_pct}% ({adj:+.1f})",
                member=c.member, before=from_pct, after=to_pct, delta=adj)
        t.adjust("achievement_score", adj,
                 f"{c.member}: {len(c.achievements)} 项成就",
                 before=from_pct, after=to_pct)

    result = {
        "adjustment_suggestion": {
            "current_version": validated.current_scheme.version,
            "suggested_version": f"{validated.current_scheme.version}.1",
            "changes": changes,
        },
        "impact_analysis": {
            "note": "基于规则引擎的初步分析，建议使用 LLM 生成完整方案",
            "voting_power": "待 LLM 分析",
            "future_funding": "调整幅度较小，对后续融资无显著影响",
            "team_morale": "待 LLM 分析",
        },
        "recommendations": ["建议使用 LLM 引擎进行精确计算"],
        "metadata": {
            "model": "rule_engine",
            "fallback": True,
            "audit": t.summary(),
        },
    }

    t.trace("result", "summary",
            f"调整了 {len(changes)} 位成员的持股比例",
            changes_count=len(changes))
    return result
