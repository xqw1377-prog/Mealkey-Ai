"""
合规检查 — 规则知识资产

5 项合规判定规则，从 handler/compliance.py 的 _compliance_fallback 抽取。
"""

from typing import Any
from agent.knowledge.audit import AuditTracker


# ============================================================
# 知识资产：合规判定阈值
# ============================================================

# Vesting 标准
VESTING_MIN_TOTAL = 36  # 最少总月数
VESTING_MIN_CLIFF = 6   # 最少 Cliff 月数
VESTING_RECOMMENDED_TOTAL = 48
VESTING_RECOMMENDED_CLIFF = 12

# 创始人保护阈值
FOUNDER_ABSOLUTE_CONTROL = 51   # 绝对控制权
FOUNDER_SIGNIFICANT_INFLUENCE = 34  # 重大影响（一票否决权）


def check_vesting(scheme: Any, tracker: AuditTracker) -> dict | None:
    """检查 Vesting 条款"""
    if not scheme.vesting_terms:
        tracker.trace("compliance", "vesting", "fail: 缺少 Vesting 条款")
        return {
            "item": "vesting", "status": "fail",
            "message": "缺少 Vesting 条款，这是创始人保护的核心机制",
            "suggestion": "建议添加标准 4 年 Vesting + 1 年 Cliff 条款",
        }

    standard = scheme.vesting_terms.get("standard", {})
    total = standard.get("total_months", 0) if isinstance(standard, dict) else 0
    cliff = standard.get("cliff_months", 0) if isinstance(standard, dict) else 0

    if total >= VESTING_MIN_TOTAL and cliff >= VESTING_MIN_CLIFF:
        tracker.trace("compliance", "vesting", f"pass: {total}/{cliff}")
        return {
            "item": "vesting", "status": "pass",
            "message": f"Vesting 条款合理: {total}个月总期，{cliff}个月 cliff",
        }
    else:
        tracker.trace("compliance", "vesting", f"warn: {total}/{cliff}, 建议 {VESTING_RECOMMENDED_TOTAL}/{VESTING_RECOMMENDED_CLIFF}")
        return {
            "item": "vesting", "status": "warn",
            "message": f"Vesting 周期偏短: {total}个月总期，{cliff}个月 cliff，建议至少 {VESTING_RECOMMENDED_TOTAL}/{VESTING_RECOMMENDED_CLIFF}",
        }


def check_equity_types(allocations: list, tracker: AuditTracker) -> dict:
    """检查股权类型区分"""
    types = set(a.equity_type.value if a.equity_type else "普通股" for a in allocations)
    if len(types) > 1:
        tracker.trace("compliance", "equity_types", f"pass: {', '.join(types)}")
        return {
            "item": "equity_types", "status": "pass",
            "message": f"股权类型区分清晰: {', '.join(types)}",
        }
    else:
        tracker.trace("compliance", "equity_types", "warn: 全部同一类型")
        return {
            "item": "equity_types", "status": "warn",
            "message": "所有成员均为同一股权类型，建议全职/兼职/顾问区分对待",
        }


def check_ip_transfer(allocations: list, tracker: AuditTracker) -> dict:
    """检查知识产权转让条款"""
    has_ip = any(a.equity_type and a.equity_type.value == "受限股" for a in allocations)
    if has_ip:
        tracker.trace("compliance", "ip_transfer", "warn: 含受限股，需 IP 条款")
        return {
            "item": "ip_transfer", "status": "warn",
            "message": "受限股涉及 IP 归属，建议在协议中明确知识产权转让条款",
            "suggestion": "参考《公司法》及相关司法解释增加 IP 归属条款",
        }
    else:
        tracker.trace("compliance", "ip_transfer", "warn: 建议添加 IP 条款")
        return {
            "item": "ip_transfer", "status": "warn",
            "message": "建议在股东协议中明确知识产权转让条款",
        }


def check_tax(tracker: AuditTracker) -> dict:
    """检查税务合规"""
    tracker.trace("compliance", "tax", "warn: 建议咨询税务专业人士")
    return {
        "item": "tax", "status": "warn",
        "message": "股权激励涉及的个税处理未体现，建议咨询税务专业人士",
        "suggestion": "股权激励行权时可能涉及工资薪金所得税",
    }


def check_founder_protection(allocations: list, tracker: AuditTracker) -> dict:
    """检查创始人保护"""
    if not allocations:
        tracker.trace("compliance", "founder_protection", "warn: 无分配数据")
        return {
            "item": "founder_protection", "status": "warn",
            "message": "缺少分配数据，无法评估创始人保护",
        }

    max_pct = max(a.equity_percent for a in allocations)
    if max_pct >= FOUNDER_ABSOLUTE_CONTROL:
        tracker.trace("compliance", "founder_protection",
                      f"pass: 最高持股 {max_pct}%，绝对控制权")
        return {
            "item": "founder_protection", "status": "pass",
            "message": f"创始人持股 {max_pct}%，拥有绝对控制权",
        }
    elif max_pct >= FOUNDER_SIGNIFICANT_INFLUENCE:
        tracker.trace("compliance", "founder_protection",
                      f"warn: 最高持股 {max_pct}%，低于 51%")
        return {
            "item": "founder_protection", "status": "warn",
            "message": f"最高持股 {max_pct}%，低于 51% 无绝对控制权，建议通过 AB 股或一致行动协议保障",
        }
    else:
        tracker.trace("compliance", "founder_protection",
                      f"fail: 最高持股仅 {max_pct}%")
        return {
            "item": "founder_protection", "status": "fail",
            "message": f"最高持股仅 {max_pct}%，创始人控制权严重不足",
        }


# 检查项目映射
CHECK_FUNCTIONS = {
    "vesting": check_vesting,
    "equity_types": check_equity_types,
    "ip_transfer": check_ip_transfer,
    "tax": check_tax,
    "founder_protection": check_founder_protection,
}

# 各检查项所需的额外参数
CHECK_PARAMS = {
    "vesting": ("scheme",),
    "equity_types": ("allocations",),
    "ip_transfer": ("allocations",),
    "tax": (),
    "founder_protection": ("allocations",),
}


def compliance_fallback(validated: Any, tracker: AuditTracker | None = None) -> dict:
    """
    合规检查规则引擎退路 — 5 项判定

    Args:
        validated: ComplianceCheckPayload 实例
        tracker: 可选的审计追踪器

    Returns:
        合规检查结果 dict
    """
    t = tracker or AuditTracker("compliance_check")

    scheme = validated.scheme
    allocations = scheme.allocations
    check_items = validated.check_items

    t.trace("start", "parse",
            f"检查 {len(check_items)} 项: {', '.join(i.value for i in check_items)}",
            items=[i.value for i in check_items],
            jurisdiction=validated.jurisdiction.value)

    checks = []
    for item in check_items:
        check_fn = CHECK_FUNCTIONS.get(item.value)
        if not check_fn:
            continue
        if item.value == "vesting":
            result = check_fn(scheme, t)
        elif item.value == "equity_types":
            result = check_fn(allocations, t)
        elif item.value == "ip_transfer":
            result = check_fn(allocations, t)
        elif item.value == "tax":
            result = check_fn(t)
        elif item.value == "founder_protection":
            result = check_fn(allocations, t)
        else:
            continue
        checks.append(result)

    critical = [c for c in checks if c.get("status") == "fail"]
    critical_count = len(critical)
    warn_count = sum(1 for c in checks if c.get("status") == "warn")

    if critical_count > 0:
        overall = "fail"
    elif warn_count > 0:
        overall = "caution"
    else:
        overall = "pass"

    t.trace("result", "summary",
            f"总体={overall}, fail={critical_count}, warn={warn_count}",
            overall=overall, fail_count=critical_count, warn_count=warn_count)

    return {
        "overall_status": overall,
        "checks": checks,
        "critical_issues": critical,
        "recommendations": [
            "建议聘请专业律师对协议进行最终审查",
            "税务方面建议咨询持牌税务师",
        ],
        "metadata": {
            "model": "rule_engine",
            "fallback": True,
            "audit": t.summary(),
        },
    }
