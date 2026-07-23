"""
M-MKT CLI — 命令行评估工具

Usage:
    python -m core.cli 咖啡 上海
    python -m core.cli 火锅 成都 --experience 首次创业 --capital low
    python -m core.cli --list-categories
    python -m core.cli --list-cities
"""

from __future__ import annotations

import argparse
import json
import sys

from .api import MKTEngine
from .batch import BatchAnalyzer
from .engine import OpportunityDecision

# 处理 Windows 控制台 GBK 编码问题
_USE_ASCII = (sys.stdout.encoding or "").lower() in ("gbk", "gb2312", "gb18030")
_BULLET = "*" if _USE_ASCII else "•"
_BAR = "#" if _USE_ASCII else "█"
_WARN = "!" if _USE_ASCII else "⚠"

_EXPERIENCE_CHOICES = ("无经验", "首次创业", "丰富", "多次创业")
_CAPITAL_CHOICES = ("very_low", "low", "medium", "high", "very_high")
_TEAM_CHOICES = ("solo", "small", "medium", "large")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="M-MKT 餐饮市场机会分析引擎 · CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python -m core.cli 咖啡 上海
  python -m core.cli 火锅 成都 --experience 首次创业 --capital low
  python -m core.cli --list-categories
  python -m core.cli 湘菜 --json
        """,
    )
    parser.add_argument("category", nargs="?", help="品类名称（如 咖啡、火锅、湘菜）")
    parser.add_argument("city", nargs="?", default=None, help="城市名称（如 上海、成都）")
    parser.add_argument("--experience", default="首次创业", help="创业经验")
    parser.add_argument(
        "--capital", "--capital-level", dest="capital_level", default="medium", help="资金水平"
    )
    parser.add_argument("--team", "--team-size", dest="team_size", default="small", help="团队规模")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    parser.add_argument("--list-categories", action="store_true", help="列出所有支持的品类")
    parser.add_argument("--list-cities", action="store_true", help="列出所有支持的城市")
    parser.add_argument(
        "--compare",
        nargs="+",
        default=None,
        help="对比多个品类或城市（如: --compare 上海 成都 长沙）",
    )
    parser.add_argument(
        "--mode",
        choices=["category", "city"],
        default="city",
        help="对比模式: 同一品类对比不同城市(city)或同一城市对比不同品类(category)",
    )
    parser.add_argument(
        "--report", choices=["markdown", "text", "json"], default=None, help="生成评估报告格式"
    )
    parser.add_argument("--output", type=str, default=None, help="输出文件路径")
    parser.add_argument(
        "--v2", action="store_true", help="使用 V2 管线模式（含审计轨迹）"
    )
    parser.add_argument(
        "--audit", action="store_true", help="V2 模式：显示评分变化链"
    )
    parser.add_argument(
        "--pipeline-mode", choices=["default", "light"], default="default",
        help="V2 管线模式: default(完整5阶段) / light(仅评分+建议)"
    )
    return parser


def print_result(decision: OpportunityDecision, fmt: str = "human") -> None:
    if fmt == "json":
        print(json.dumps(decision.to_dict(), ensure_ascii=False, indent=2))
        return

    d = decision

    print()
    print("=" * 60)
    print("  M-MKT 餐饮市场机会分析 评估报告")
    print("=" * 60)
    print()
    print(f"  机会评分:  {d.opportunity_score:.2f}")
    print(f"  机会等级:  {d.opportunity_level}")
    print(f"  原始评分:  {d.raw_score:.2f} (规则调整前)")
    print()

    # 维度得分
    dims = d.model_summary.get("dimensions", [])
    if dims:
        print("  ── 六维模型得分 ──")
        for dim in dims:
            bar = _BAR * int((dim["score"] or 0) * 4)
            space = " " * (20 - len(bar))
            print(
                f"    [{dim['id']}] {dim['name']:<8s}  {dim['score']:.1f}  {bar}{space}  {dim['level']}"
            )
        print()

    # 品类信息
    if d.category_info:
        print(f"  品类: {d.category_info['name']} ({d.category_info['category_stage']})")
        print(f"  定位: {d.category_info['market_position']}")
        print()

    # 城市信息
    if d.city_info:
        print(f"  城市: {d.city_info['city']} ({d.city_info.get('tier', '未分级')})")
        print()

    # 建议
    if d.positioning_suggestions:
        print("  ── 策略建议 ──")
        for s in d.positioning_suggestions:
            print(f"    {_BULLET} {s}")
        print()

    # 规则备注
    if d.rule_notes:
        print("  ── 评估备注 ──")
        for note in d.rule_notes:
            print(f"    {_BULLET} {note}")
        print()

    # 警告
    if d.warnings:
        print("  ── 风险提示 ──")
        for w in d.warnings:
            print(f"    {_WARN} {w}")
        print()

    # 相关案例
    if d.related_cases:
        print("  ── 参考案例 ──")
        for case in d.related_cases:
            print(f"    {_BULLET} {case['name']}: {case['brand']} ({case['positioning']})")
        print()

    print("=" * 60)
    print("  MealKey · M-MKT · 专业判断结构")
    print("=" * 60)
    print()


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list_categories and args.list_cities:
        parser.error("--list-categories 和 --list-cities 不能同时使用")

    engine = MKTEngine()

    if args.list_categories:
        print("支持的品类:")
        for cat in engine.list_categories():
            print(f"  {_BULLET} {cat}")
        return

    if args.list_cities:
        print("支持的城市:")
        for city in engine.list_cities():
            info = engine.get_city_info(city)
            tier = f" ({info['tier']})" if info and info.get("tier") else ""
            print(f"  {_BULLET} {city}{tier}")
        return

    if not args.category:
        # --compare 模式不需要 category
        if args.compare:
            _handle_compare(args)
            return
        parser.print_help()
        return

    if args.experience not in _EXPERIENCE_CHOICES:
        parser.error(
            f"无效的 experience 值: {args.experience} (可选: {', '.join(_EXPERIENCE_CHOICES)})"
        )
    if args.capital_level not in _CAPITAL_CHOICES:
        parser.error(
            f"无效的 capital 值: {args.capital_level} (可选: {', '.join(_CAPITAL_CHOICES)})"
        )
    if args.team_size not in _TEAM_CHOICES:
        parser.error(f"无效的 team 值: {args.team_size} (可选: {', '.join(_TEAM_CHOICES)})")

    try:
        if args.v2:
            result = engine.analyze_v2(
                category=args.category,
                city=args.city,
                experience=args.experience,
                capital_level=args.capital_level,
                team_size=args.team_size,
                mode=getattr(args, "pipeline_mode", "default"),
            )
            decision = None
        else:
            decision = engine.analyze(
                category=args.category,
                city=args.city,
                experience=args.experience,
                capital_level=args.capital_level,
                team_size=args.team_size,
            )
    except Exception as e:
        print(f"分析出错: {e}", file=sys.stderr)
        sys.exit(1)

    # V2 输出
    if args.v2 and decision is None:
        if args.json or args.report == "json":
            print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
        elif args.audit:
            _print_v2_audit(result)
        else:
            _print_v2_result(result)
        return

    # 报告输出
    if args.report:
        from .reporter import ReportGenerator

        if args.report == "markdown":
            output = ReportGenerator.to_markdown(decision)
        elif args.report == "text":
            output = ReportGenerator.to_text(decision)
        else:
            output = json.dumps(decision.to_dict(), ensure_ascii=False, indent=2)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"报告已保存至: {args.output}")
        else:
            print(output)
        return

    print_result(decision, fmt="json" if args.json else "human")


def _handle_compare(args: argparse.Namespace) -> None:
    """处理对比模式"""
    analyzer = BatchAnalyzer()

    if args.mode == "city" and args.category:
        # 同一品类对比不同城市
        result = analyzer.compare(category=args.category, cities=args.compare)
        mode_name = f"{args.category}在各城市的对比"
    elif args.mode == "category":
        # 同一城市对比不同品类
        city = args.city or args.compare[0]
        compare_cats = args.compare if args.city else args.compare[1:]
        if not compare_cats:
            compare_cats = [args.compare[0]]
        cats = [args.category] + compare_cats if args.category else compare_cats
        # 简化：使用 BatchAnalyzer 做品类对比
        result = analyzer.analyze(categories=cats, cities=[city])
        mode_name = f"{city}各品类对比"
    else:
        # 默认：品类对比城市
        result = analyzer.compare(category=args.category, cities=args.compare)
        mode_name = f"{args.category}在各城市的对比"

    if args.report == "json" or args.json:
        output = result.to_json()
    elif args.report == "csv":
        output = result.to_csv()
    else:
        # 文本输出
        lines = [f"=== {mode_name} ===", ""]
        lines.append(
            f"{'品类':8s} {'城市':8s} {'评分':6s} {'等级':6s} {'市场':6s} {'竞争':6s} {'消费':6s} {'运营':6s} {'品牌':6s} {'环境':6s}"
        )
        lines.append("-" * 70)
        for item in result.items:
            dims = {
                d["name"]: f"{d['score']:.1f}" if d["score"] else "-"
                for d in item.get("dimensions", [])
            }
            lines.append(
                f"{item['category']:8s} {item['city']:8s} "
                f"{item['opportunity_score']:.2f} {item['opportunity_level']:6s} "
                f"{dims.get('市场容量', '-'):6s} {dims.get('竞争格局', '-'):6s} "
                f"{dims.get('消费适配', '-'):6s} {dims.get('运营可行性', '-'):6s} "
                f"{dims.get('品牌势能', '-'):6s} {dims.get('环境适配', '-'):6s}"
            )
        output = "\n".join(lines)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"结果已保存至: {args.output}")
    else:
        print(output)


# ─── V2 输出 ───────────────────────────────────────────────────────


def _print_v2_result(result) -> None:
    """V2 模式标准输出"""
    from .reporter import _bar

    d = result
    print()
    print("=" * 60)
    print("  M-MKT V2 餐饮市场机会分析 评估报告")
    print("=" * 60)
    print()
    print(f"  机会评分:  {d.opportunity_score:.2f}")
    print(f"  机会等级:  {d.opportunity_level}")
    print(f"  原始评分:  {d.raw_score:.2f}")
    print()

    # 维度得分
    dims = d.dimension_scores
    if dims:
        print("  ── 六维模型得分 ──")
        names = {1: "市场容量", 2: "竞争格局", 3: "消费适配",
                 4: "运营可行性", 5: "品牌势能", 6: "环境适配"}
        for dd in dims:
            dim_id = dd.get("id", 0)
            name = names.get(dim_id, dd.get("name", ""))
            score = dd.get("score", 0) or 0
            bar = _BAR * int(score * 4)
            space = " " * (20 - len(bar))
            print(f"    [{dim_id}] {name:<8s}  {score:.1f}  {bar}{space}")
        print()

    # 品类信息
    if d.category_info:
        print(f"  品类: {d.category_info.get('name', '')} "
              f"({d.category_info.get('category_stage', '')})")
    # 城市信息
    if d.city_info:
        print(f"  城市: {d.city_info.get('city', '')} "
              f"({d.city_info.get('tier', '未分级')})")
        print()

    # 建议
    if d.positioning_suggestions:
        print("  ── 策略建议 ──")
        for s in d.positioning_suggestions:
            print(f"    {_BULLET} {s}")
        print()

    if d.strategic_recommendations:
        print("  ── 战略建议 ──")
        for s in d.strategic_recommendations:
            print(f"    {_BULLET} {s}")
        print()

    # 备注
    if d.rule_notes:
        print("  ── 评估备注 ──")
        for note in d.rule_notes:
            print(f"    {_BULLET} {note}")
        print()

    # 警告
    if d.warnings:
        print("  ── 风险提示 ──")
        for w in d.warnings:
            print(f"    {_WARN} {w}")
        print()

    # 案例
    if d.matched_cases:
        print("  ── 参考案例 ──")
        for case in d.matched_cases:
            print(f"    {_BULLET} {case.get('name', '')}: "
                  f"{case.get('brand', '')}")
        print()

    # 审计
    if d.score_chain:
        print("  ── 评分变化链 ──")
        for item in d.score_chain:
            action = item.get("action", "")
            value = item.get("value", 0)
            reason = item.get("reason", "")
            print(f"    {_BULLET} [{action}] {value:.2f} — {reason}")
        print()

    print("=" * 60)
    print("  MealKey · M-MKT V2 · 专业判断结构")
    print("=" * 60)
    print()


def _print_v2_audit(result) -> None:
    """V2 审计模式输出"""
    print()
    print("=" * 60)
    print("  M-MKT V2 评分审计轨迹")
    print("=" * 60)
    print()
    print(f"  请求: {result.category_info.get('name', '?') if result.category_info else '?'} "
          f"/ {result.city_info.get('city', '不限') if result.city_info else '不限'}")
    print()

    if result.score_chain:
        print("  ── 评分变化链 ──")
        for i, item in enumerate(result.score_chain):
            action = item.get("action", "")
            value = item.get("value", 0)
            reason = item.get("reason", "")
            delta = item.get("delta")
            if delta is not None:
                arrow = "↑" if delta > 0 else "↓"
                print(f"    [{i+1}] {reason}")
                print(f"        调整: {delta:+.2f}  {arrow}")
                print(f"        结果: {value:.2f}")
            else:
                print(f"    [{i+1}] {reason}: {value:.2f}")
        print()
        print(f"  最终评分: {result.opportunity_score:.2f} ({result.opportunity_level})")
    else:
        print("  (无审计数据)")

    print()
    if result.warnings:
        print("  ── 风险警告 ──")
        for w in result.warnings:
            print(f"    ! {w}")
        print()
    if result.rule_notes:
        print("  ── 备注 ──")
        for n in result.rule_notes:
            print(f"    * {n}")
        print()
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
