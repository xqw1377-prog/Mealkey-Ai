import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.core.dimension_definitions import register_all
from src.core.engine import EntrepreneurProfile, OpportunityEngine


def setup_module():
    register_all()


def test_engine_initialization():
    engine = OpportunityEngine()
    assert engine is not None
    assert len(engine.list_categories()) == 10
    assert len(engine.list_cities()) >= 5


def test_engine_evaluate_basic():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="火锅", city_name="成都")
    assert decision is not None
    assert isinstance(decision.opportunity_score, float)
    assert 0.0 <= decision.opportunity_score <= 5.0
    assert decision.opportunity_level in ("高机会", "中机会", "低机会")
    assert decision.category_info is not None
    assert decision.category_info["name"] == "火锅"


def test_engine_evaluate_with_entrepreneur():
    engine = OpportunityEngine()
    entrepreneur = EntrepreneurProfile(
        experience="首次创业",
        capital_level="low",
        team_size="small",
    )
    decision = engine.evaluate(category_name="湘菜", city_name="长沙", entrepreneur=entrepreneur)
    assert decision.opportunity_score >= 0
    assert len(decision.rule_notes) > 0


def test_engine_evaluate_experienced_entrepreneur():
    engine = OpportunityEngine()
    entrepreneur = EntrepreneurProfile(experience="丰富", capital_level="high")
    decision = engine.evaluate(category_name="咖啡", city_name="上海", entrepreneur=entrepreneur)
    assert decision.opportunity_score > 0


def test_engine_rule_notes_present():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="火锅", city_name="成都")
    assert len(decision.rule_notes) > 0 or len(decision.warnings) > 0


def test_engine_related_cases():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="火锅")
    assert len(decision.related_cases) > 0
    assert any("火锅" in c.get("category", "") for c in decision.related_cases)


def test_engine_unknown_category():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="未知品类")
    assert decision.opportunity_score >= 0
    assert decision.category_info is None


def test_engine_unknown_city():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="湘菜", city_name="未知城市")
    assert decision.city_info is None


def test_engine_decision_to_dict():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="烧烤", city_name="深圳")
    d = decision.to_dict()
    assert "opportunity_score" in d
    assert "opportunity_level" in d
    assert "model_summary" in d
    assert "rule_notes" in d
    assert "warnings" in d
    assert "positioning_suggestions" in d


def test_engine_positioning_suggestions():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="咖啡")
    assert len(decision.positioning_suggestions) > 0


def test_engine_raw_score_vs_adjusted():
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="火锅")
    assert decision.raw_score >= 0
    assert decision.opportunity_score >= 0


def test_engine_get_category():
    engine = OpportunityEngine()
    cat = engine.get_category("湘菜")
    assert cat is not None
    assert cat.name == "湘菜"


def test_engine_get_city():
    engine = OpportunityEngine()
    city = engine.get_city("长沙")
    assert city is not None
    assert city.city == "长沙"


def test_engine_list_methods():
    engine = OpportunityEngine()
    assert len(engine.list_categories()) == 10
    assert len(engine.list_cities()) >= 5


def test_engine_uses_formal_weights():
    """验证引擎使用六维模型正式权重而非等权重"""
    engine = OpportunityEngine()
    # 评估一次拿到 model_summary
    decision = engine.evaluate(category_name="火锅")
    dims = decision.model_summary.get("dimensions", [])
    if dims:
        weights = [d["weight"] for d in dims]
        # 各维度权重不应完全相同（非等权重）
        assert len(set(weights)) > 1, "维度权重应差异化，而非等权重"
        # 权重和应为 1.0
        assert abs(sum(weights) - 1.0) < 0.01


def test_engine_dimension_count():
    """验证引擎输出包含六个维度"""
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="咖啡", city_name="上海")
    dims = decision.model_summary.get("dimensions", [])
    assert len(dims) == 6


def test_engine_raw_score_differs_from_final():
    """验证规则调整前后分数不同（有规则触发时）"""
    engine = OpportunityEngine()
    entrepreneur = EntrepreneurProfile(experience="首次创业", capital_level="low")
    decision = engine.evaluate(category_name="火锅", city_name="成都", entrepreneur=entrepreneur)
    # 首次创业+资金低应触发规则调整
    assert decision.raw_score != decision.opportunity_score, "规则应调整分数"


def test_engine_weighted_scoring():
    """验证加权评分与等权重评分不同"""
    engine = OpportunityEngine()
    # 选择一个能产生不同维度得分的场景
    decision = engine.evaluate(category_name="咖啡", city_name="上海")
    dims = decision.model_summary.get("dimensions", [])
    if dims:
        scores = [d["score"] for d in dims if d["score"] is not None]
        [d["weight"] for d in dims]
        if len(scores) == 6 and len(set(scores)) > 1:
            # 计算等权重评分
            equal_weighted = sum(scores) / len(scores)
            # 引擎输出是正式加权评分
            assert abs(decision.raw_score - equal_weighted) > 0.001, "加权评分应与等权重不同"


def test_engine_dimension_details():
    """验证决策包含指标级明细"""
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="咖啡", city_name="上海")
    assert len(decision.dimension_details) == 6
    # 每个维度应有 5 个指标
    for dd in decision.dimension_details:
        assert len(dd["indicators"]) == 5, f"维度 {dd['id']} 应有 5 个指标"
        assert "score" in dd
        assert "level" in dd
        # 检查指标结构
        for ind in dd["indicators"]:
            assert "name" in ind
            assert "score" in ind
            assert "weight" in ind


def test_engine_dimension_details_values():
    """验证指标级明细的数值正确性"""
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="湘菜", city_name="长沙")
    dd = decision.dimension_details
    # 湘菜在长沙——口味匹配度高
    dim3 = dd[2]  # 消费适配维度
    taste_ind = [i for i in dim3["indicators"] if "口味" in i["name"]]
    if taste_ind:
        assert taste_ind[0]["score"] >= 3.5, "湘菜在长沙口味匹配应高分"


def test_engine_30_indicators():
    """验证 6 个维度共 30 个指标全部有值"""
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="咖啡", city_name="上海")
    total = sum(len(dd["indicators"]) for dd in decision.dimension_details)
    assert total == 30, f"应有 30 个指标，实际 {total}"


def test_engine_indicator_scores_in_range():
    """验证所有指标得分在 [0, 5] 范围内"""
    engine = OpportunityEngine()
    decision = engine.evaluate(category_name="烧烤", city_name="深圳")
    for dd in decision.dimension_details:
        for ind in dd["indicators"]:
            s = ind["score"]
            assert s is None or 0.0 <= s <= 5.0, f"指标 {ind['name']} 得分 {s} 越界"


if __name__ == "__main__":
    setup_module()
    test_engine_initialization()
    test_engine_evaluate_basic()
    test_engine_evaluate_with_entrepreneur()
    test_engine_evaluate_experienced_entrepreneur()
    test_engine_rule_notes_present()
    test_engine_related_cases()
    test_engine_unknown_category()
    test_engine_unknown_city()
    test_engine_decision_to_dict()
    test_engine_positioning_suggestions()
    test_engine_raw_score_vs_adjusted()
    test_engine_get_category()
    test_engine_get_city()
    test_engine_list_methods()
    test_engine_uses_formal_weights()
    test_engine_dimension_count()
    test_engine_raw_score_differs_from_final()
    test_engine_weighted_scoring()
    test_engine_dimension_details()
    test_engine_dimension_details_values()
    test_engine_30_indicators()
    test_engine_indicator_scores_in_range()
    print("所有引擎测试通过 ✓")
