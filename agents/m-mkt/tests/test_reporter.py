"""
报告生成器单元测试
"""

from src.core.engine import OpportunityDecision
from src.core.reporter import ReportGenerator, _bar, _level_color


def make_minimal_decision() -> OpportunityDecision:
    """创建最小决策对象用于测试"""
    return OpportunityDecision(
        opportunity_score=3.25,
        opportunity_level="中机会",
        raw_score=3.0,
        model_summary={
            "model_name": "测试模型",
            "opportunity_score": 3.25,
            "opportunity_level": "中机会",
            "dimensions": [
                {"id": 1, "name": "市场容量", "score": 3.5, "level": "良好", "weight": 0.25},
                {"id": 2, "name": "竞争格局", "score": 4.0, "level": "优秀", "weight": 0.20},
                {"id": 3, "name": "消费适配", "score": 2.5, "level": "一般", "weight": 0.20},
                {"id": 4, "name": "运营可行性", "score": 3.0, "level": "良好", "weight": 0.15},
                {"id": 5, "name": "品牌势能", "score": 3.8, "level": "良好", "weight": 0.10},
                {"id": 6, "name": "环境适配", "score": 2.0, "level": "一般", "weight": 0.10},
            ],
        },
        category_info={"name": "咖啡", "category_stage": "增长期", "market_position": "高增长品类"},
        city_info={"city": "上海", "tier": "一线", "population": "约2500万"},
        related_cases=[],
        rule_notes=["品类阶段: 增长期", "市场定位: 高增长品类"],
        warnings=["注意价格竞争"],
        positioning_suggestions=["社区精品咖啡", "下沉市场咖啡"],
        dimension_details=[
            {
                "id": 1,
                "name": "市场容量",
                "score": 3.5,
                "level": "良好",
                "weight": 0.25,
                "indicators": [
                    {"name": "目标人口规模", "score": 4.0, "weight": 1.0, "weighted_score": 4.0},
                    {"name": "品类增长率", "score": 3.5, "weight": 0.8, "weighted_score": 2.8},
                ],
            },
        ],
    )


def test_bar_function():
    """测试柱状条函数"""
    assert len(_bar(5.0, 20)) == 20
    assert _bar(5.0, 20).startswith("█" * 20)
    assert _bar(0.0, 20).startswith("░" * 20)
    assert _bar(None, 20) == "░" * 20
    assert _bar(2.5, 20) == "█" * 10 + "░" * 10
    assert _bar(3.75, 20) == "█" * 15 + "░" * 5


def test_level_color():
    """测试等级颜色标签"""
    assert _level_color("高机会") == "🟢"
    assert _level_color("中机会") == "🟡"
    assert _level_color("低机会") == "🔴"
    assert _level_color("未知") == "⚪"


def test_to_markdown_contains_sections():
    """测试 Markdown 报告包含关键章节"""
    decision = make_minimal_decision()
    report = ReportGenerator.to_markdown(decision)
    assert "# " in report
    assert "## 评分总览" in report
    assert "## 品类信息" in report
    assert "## 城市信息" in report
    assert "## 六维模型得分" in report
    assert "## 指标级评分明细" in report
    assert "## 策略建议" in report
    assert "## 评估备注" in report
    assert "## 风险提示" in report
    assert "社区精品咖啡" in report
    assert "注意价格竞争" in report
    assert "3.25" in report
    assert "中机会" in report


def test_to_markdown_without_optional():
    """测试没有可选信息时的报告"""
    decision = OpportunityDecision(
        opportunity_score=2.0,
        opportunity_level="低机会",
        raw_score=2.5,
        model_summary={"model_name": "测试", "dimensions": []},
    )
    report = ReportGenerator.to_markdown(decision)
    assert "评分总览" in report
    assert "2.00" in report


def test_to_text_contains_info():
    """测试纯文本报告包含关键信息"""
    decision = make_minimal_decision()
    report = ReportGenerator.to_text(decision)
    assert "机会评分" in report
    assert "3.25" in report
    assert "市场容量" in report
    assert "社区精品咖啡" in report
    assert "注意价格竞争" in report


def test_to_markdown_custom_title():
    """测试自定义标题"""
    decision = make_minimal_decision()
    report = ReportGenerator.to_markdown(decision, title="自定义报告标题")
    assert "# 自定义报告标题" in report


def test_to_text_with_empty_decision():
    """测试空决策的文本报告"""
    decision = OpportunityDecision()
    report = ReportGenerator.to_text(decision)
    assert "M-MKT" in report


def test_to_markdown_with_related_cases():
    """测试包含案例的报告"""
    decision = make_minimal_decision()
    decision.related_cases = [
        {
            "name": "测试案例",
            "brand": "测试品牌",
            "positioning": "测试定位",
            "results": "测试结果",
            "reusable_principles": ["原则1", "原则2"],
        }
    ]
    report = ReportGenerator.to_markdown(decision)
    assert "测试案例" in report
    assert "测试品牌" in report
    assert "原则1" in report
