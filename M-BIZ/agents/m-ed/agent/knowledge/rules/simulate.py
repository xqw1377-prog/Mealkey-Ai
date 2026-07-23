"""
场景模拟 — 规则知识资产

等比稀释计算规则，从 handler/simulate.py 的 _simulate_fallback 抽取。
"""

from typing import Any
from agent.knowledge.audit import AuditTracker


def simulate_fallback(validated: Any, tracker: AuditTracker | None = None) -> dict:
    """
    场景模拟规则引擎退路 — 等比稀释计算

    Args:
        validated: SimulatePayload 实例
        tracker: 可选的审计追踪器

    Returns:
        模拟结果 dict
    """
    t = tracker or AuditTracker("simulate")
    t.trace("start", "parse", f"收到 {len(validated.scenarios)} 个模拟场景",
            scenarios_count=len(validated.scenarios))

    scenarios_result = []

    for s_idx, scenario in enumerate(validated.scenarios):
        current = {a.member: a.equity_percent for a in validated.base_scheme.allocations}
        current["期权池"] = validated.base_scheme.reserved_pool

        t.trace("scenario", "init",
                f"场景[{s_idx}]: {scenario.name}, 初始={current}",
                scenario_name=scenario.name, initial_state=current)

        result_items = []
        investors = []

        for e_idx, event in enumerate(scenario.events):
            if event.type == "funding" and event.dilution_percent:
                dilution = event.dilution_percent / 100
                remaining = 1 - dilution

                t.trace("event", "funding",
                        f"事件[{e_idx}]: 融资 {event.dilution_percent}%, 剩余比例={remaining:.2f}",
                        event_index=e_idx, dilution_pct=event.dilution_percent)

                for name in list(current.keys()):
                    before = current[name]
                    current[name] = round(current[name] * remaining, 2)
                    t.adjust("pro_rata_dilution", current[name] - before,
                             f"{name}: {before}% × {remaining:.2f} = {current[name]}%",
                             before=before, after=current[name])

                investor_name = f"投资人({event.round or ('轮次' + str(len(investors)+1))})"
                current[investor_name] = event.dilution_percent
                investors.append(investor_name)

                t.trace("event", "investor_entry",
                        f"投资人入股: {investor_name} = {event.dilution_percent}%",
                        investor=investor_name, percent=event.dilution_percent)

        for name, value in current.items():
            before_val = next(
                (a.equity_percent for a in validated.base_scheme.allocations if a.member == name),
                None
            ) if not name.startswith("投资人") and name not in ["期权池", "未分配"] else None

            result_items.append({
                "member": name,
                "before": before_val,
                "after": value,
                "change": None,
            })

        total_after = sum(r["after"] for r in result_items)
        scenarios_result.append({
            "name": scenario.name,
            "result": result_items,
            "summary": f"模拟后合计: {round(total_after, 2)}%",
        })

        t.trace("scenario", "result",
                f"场景[{s_idx}] 完成, 合计={round(total_after, 2)}%",
                total=round(total_after, 2))

    result = {
        "scenarios": scenarios_result,
        "insights": ["基于规则引擎的简单稀释计算，建议使用 LLM 进行更复杂的场景分析"],
        "metadata": {
            "model": "rule_engine",
            "fallback": True,
            "audit": t.summary(),
        },
    }

    t.trace("done", "complete",
            f"完成 {len(scenarios_result)} 个场景模拟")
    return result
