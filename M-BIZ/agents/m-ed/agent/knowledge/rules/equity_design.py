"""
股权结构设计 — 规则知识资产

角色权重分配规则，从 handler/design.py 的 _design_fallback 抽取。
"""

from typing import Any
from agent.knowledge.audit import AuditTracker


# ============================================================
# 知识资产：角色权重表
# ============================================================

ROLE_WEIGHTS = {
    "创始人": 0.40,
    "CTO": 0.25,
    "COO": 0.20,
    "设计师": 0.08,
    "工程师": 0.15,
    "顾问": 0.05,
}

# 团队总分配比例
TEAM_ALLOCATION_RATIO = 0.70  # 70%
# 期权池预留比例
OPTION_POOL_RATIO = 0.12  # 12%

# 投入类型 → 股权类型映射
CONTRIBUTION_TO_EQUITY_TYPE = {
    "全职": "普通股",
    "兼职": "受限股",
    "顾问": "受限股",
}

# 默认权重（未列出的角色）
DEFAULT_ROLE_WEIGHT = 0.10


def get_role_weight(role: str) -> float:
    """获取角色权重"""
    return ROLE_WEIGHTS.get(role, DEFAULT_ROLE_WEIGHT)


def get_equity_type(contribution_type: str) -> str:
    """根据投入类型获取股权类型"""
    return CONTRIBUTION_TO_EQUITY_TYPE.get(contribution_type, "普通股")


def design_equity_fallback(payload: dict, tracker: AuditTracker | None = None) -> dict:
    """
    股权分配规则引擎退路 — 按角色权重分配

    Args:
        payload: 请求 payload（含 project_name, project_stage, team_members）
        tracker: 可选的审计追踪器

    Returns:
        分配方案 dict
    """
    t = tracker or AuditTracker("design_equity")
    team = payload.get("team_members", [])
    stage = payload.get("project_stage", "seed")

    t.trace("start", "parse_team", f"团队共 {len(team)} 人", team_count=len(team), project_stage=stage)

    # 计算总权重
    total_weight = sum(get_role_weight(m["role"]) for m in team)
    t.trace("calc", "total_weight", f"总权重={total_weight:.2f}",
            total_weight=round(total_weight, 2))

    allocations = []
    for m in team:
        weight = get_role_weight(m["role"])
        percent = round((weight / total_weight) * (TEAM_ALLOCATION_RATIO * 100), 1)
        eq_type = get_equity_type(m.get("contribution_type", ""))
        allocations.append({
            "member": m["name"],
            "role": m["role"],
            "equity_percent": percent,
            "equity_type": eq_type,
            "rationale": f"基于角色 '{m['role']}' 的行业标准分配比例",
        })
        t.trace("alloc", "member", f"{m['name']}({m['role']})={percent}% {eq_type}",
                member=m["name"], role=m["role"], percent=percent)

    sum_allocated = sum(a["equity_percent"] for a in allocations)
    unallocated = round(100 - sum_allocated - (OPTION_POOL_RATIO * 100), 1)

    t.trace("result", "summary",
            f"团队分配={sum_allocated}%, 期权池=12%, 未分配={unallocated}%",
            allocated=sum_allocated, pool=12.0, unallocated=unallocated)

    return {
        "scheme": {
            "name": f"{payload.get('project_name', '项目')} {stage}期股权分配方案",
            "version": "v1",
            "allocations": allocations,
            "reserved_pool": {"name": "期权池", "equity_percent": 12.0},
            "unallocated": unallocated,
            "summary": "基于规则引擎生成的参考方案，建议在 LLM 可用时重新生成更精确的方案。",
        },
        "analysis": {
            "strengths": ["规则引擎快速生成基础方案"],
            "risks": ["未考虑成员的具体贡献度和协商情况"],
            "suggestions": ["建议使用 LLM 引擎生成更精细的方案"],
        },
        "metadata": {
            "model": "rule_engine",
            "fallback": True,
            "audit": t.summary(),
        },
    }
