"""
M-MKT 报告生成器

将 OpportunityDecision 转换为结构化的评估报告。
支持 Markdown 和纯文本两种格式。
"""

from __future__ import annotations

from datetime import datetime

from .engine import OpportunityDecision


def _bar(score: float | None, length: int = 20) -> str:
    """生成水平柱状条"""
    if score is None:
        return "░" * length
    filled = max(0, min(length, int(score / 5.0 * length)))
    return "█" * filled + "░" * (length - filled)


def _level_color(level: str) -> str:
    """获取等级颜色标签"""
    colors = {"高机会": "🟢", "中机会": "🟡", "低机会": "🔴"}
    return colors.get(level, "⚪")


class ReportGenerator:
    """评估报告生成器"""

    @staticmethod
    def to_markdown(decision: OpportunityDecision, title: str | None = None) -> str:
        """生成 Markdown 格式报告"""
        lines: list[str] = []
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")

        category_name = ""
        if decision.category_info:
            category_name = decision.category_info.get("name", "")
        city_name = ""
        if decision.city_info:
            city_name = decision.city_info.get("city", "")

        report_title = (
            title or f"{category_name}市场机会评估{' · ' + city_name if city_name else ''}"
        )

        lines.append(f"# {report_title}")
        lines.append("")
        lines.append(f"> 生成时间: {ts}")
        lines.append("> 引擎: M-MKT 餐饮市场机会分析引擎 v1.0.0")
        lines.append("")
        lines.append("---")
        lines.append("")

        # 评分总览
        lines.append("## 评分总览")
        lines.append("")
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| **机会评分** | {decision.opportunity_score:.2f} |")
        lines.append(
            f"| **机会等级** | {_level_color(decision.opportunity_level)} {decision.opportunity_level} |"
        )
        lines.append(f"| **原始评分** | {decision.raw_score:.2f} |")
        lines.append(f"| **调整幅度** | {decision.opportunity_score - decision.raw_score:+.2f} |")
        lines.append("")

        # 品类信息
        if decision.category_info:
            ci = decision.category_info
            lines.append("## 品类信息")
            lines.append("")
            lines.append("| 属性 | 内容 |")
            lines.append("|------|------|")
            lines.append(f"| **品类** | {ci.get('name', '')} |")
            lines.append(f"| **生命周期阶段** | {ci.get('category_stage', '')} |")
            lines.append(f"| **市场定位** | {ci.get('market_position', '')} |")
            if ci.get("lifecycle", {}).get("description"):
                lines.append(f"| **阶段说明** | {ci['lifecycle']['description']} |")
            lines.append("")

        # 城市信息
        if decision.city_info:
            ci = decision.city_info
            lines.append("## 城市信息")
            lines.append("")
            lines.append("| 属性 | 内容 |")
            lines.append("|------|------|")
            lines.append(f"| **城市** | {ci.get('city', '')} |")
            lines.append(f"| **城市层级** | {ci.get('tier', '未分级')} |")
            lines.append(f"| **人口** | {ci.get('population', '')} |")
            lines.append("")

        # 六维模型得分
        dims = decision.model_summary.get("dimensions", [])
        if dims:
            lines.append("## 六维模型得分")
            lines.append("")
            lines.append("| 维度 | 得分 | 等级 | 权重 | 评分条 |")
            lines.append("|------|------|------|------|--------|")
            for dim in dims:
                score_str = f"{dim['score']:.1f}" if dim["score"] is not None else "N/A"
                lines.append(
                    f"| **{dim['name']}** | {score_str} | {dim['level'] or 'N/A'} | "
                    f"{dim['weight']:.2f} | {_bar(dim['score'])} |"
                )
            lines.append("")
            lines.append(
                f"**机会评分: {decision.opportunity_score:.2f} — {_level_color(decision.opportunity_level)} {decision.opportunity_level}**"
            )
            lines.append("")

        # 指标级明细
        if decision.dimension_details:
            lines.append("## 指标级评分明细")
            lines.append("")
            for dd in decision.dimension_details:
                lines.append(
                    f"### {dd['name']} (得分: {dd['score']:.1f} / 权重: {dd['weight']:.2f})"
                )
                lines.append("")
                lines.append("| 指标 | 得分 | 权重 | 加权得分 |")
                lines.append("|------|------|------|----------|")
                for ind in dd.get("indicators", []):
                    s = f"{ind['score']:.1f}" if ind["score"] is not None else "N/A"
                    lines.append(
                        f"| {ind['name']} | {s} | {ind['weight']:.1f} | {ind['weighted_score']:.2f} |"
                    )
                lines.append("")

        # 策略建议
        if decision.positioning_suggestions:
            lines.append("## 策略建议")
            lines.append("")
            for s in decision.positioning_suggestions:
                lines.append(f"- {s}")
            lines.append("")

        # 评估备注
        if decision.rule_notes:
            lines.append("## 评估备注")
            lines.append("")
            for note in decision.rule_notes:
                lines.append(f"- {note}")
            lines.append("")

        # 风险提示
        if decision.warnings:
            lines.append("## 风险提示")
            lines.append("")
            for w in decision.warnings:
                lines.append(f"- ⚠ {w}")
            lines.append("")

        # 参考案例
        if decision.related_cases:
            lines.append("## 参考案例")
            lines.append("")
            for case in decision.related_cases:
                lines.append(f"### {case['name']}")
                lines.append("")
                lines.append(f"- **品牌**: {case.get('brand', '')}")
                lines.append(f"- **定位**: {case.get('positioning', '')}")
                lines.append(f"- **结果**: {case.get('results', '')}")
                if case.get("reusable_principles"):
                    lines.append("- **可复用原则**:")
                    for p in case["reusable_principles"]:
                        lines.append(f"  - {p}")
                lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("*报告由 M-MKT 餐饮市场机会分析引擎自动生成*")

        return "\n".join(lines)

    @staticmethod
    def to_text(decision: OpportunityDecision) -> str:
        """生成纯文本格式报告"""
        lines: list[str] = []
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")

        category_name = ""
        if decision.category_info:
            category_name = decision.category_info.get("name", "")
        city_name = ""
        if decision.city_info:
            city_name = decision.city_info.get("city", "")

        report_title = f"{category_name}市场机会评估"
        if city_name:
            report_title += f" · {city_name}"

        sep = "=" * 56
        lines.append(sep)
        lines.append(f"  {report_title}")
        lines.append(f"  生成时间: {ts}")
        lines.append(sep)

        # 评分
        lines.append("")
        lines.append(
            f"  机会评分: {decision.opportunity_score:.2f}  |  机会等级: {decision.opportunity_level}"
        )
        lines.append(
            f"  原始评分: {decision.raw_score:.2f}  |  调整幅度: {decision.opportunity_score - decision.raw_score:+.2f}"
        )
        lines.append("")

        # 六维
        dims = decision.model_summary.get("dimensions", [])
        if dims:
            lines.append("  ── 六维模型 ──")
            for dim in dims:
                bar = _bar(dim["score"], 16)
                score_str = f"{dim['score']:.1f}" if dim["score"] is not None else "N/A"
                lines.append(
                    f"    [{dim['id']}] {dim['name']:<8s}  {score_str}  {bar}  {dim['level'] or ''}"
                )
            lines.append("")

        # 建议
        if decision.positioning_suggestions:
            lines.append("  ── 策略建议 ──")
            for s in decision.positioning_suggestions:
                lines.append(f"    * {s}")
            lines.append("")

        # 备注
        if decision.rule_notes:
            lines.append("  ── 评估备注 ──")
            for note in decision.rule_notes:
                lines.append(f"    * {note}")
            lines.append("")

        # 警告
        if decision.warnings:
            lines.append("  ── 风险提示 ──")
            for w in decision.warnings:
                lines.append(f"    ! {w}")
            lines.append("")

        lines.append(sep)
        lines.append("  M-MKT 餐饮市场机会分析引擎")
        lines.append(sep)

        return "\n".join(lines)
