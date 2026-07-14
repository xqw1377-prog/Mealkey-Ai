"""
MKTEngine API 单元测试
"""

from src.core.api import MKTEngine
from src.core.engine import OpportunityDecision


def test_engine_initialization():
    """测试引擎初始化"""
    engine = MKTEngine()
    assert engine is not None


def test_analyze_basic():
    """测试基本分析"""
    engine = MKTEngine()
    decision = engine.analyze("咖啡", "上海")
    assert isinstance(decision, OpportunityDecision)
    assert 0.0 <= decision.opportunity_score <= 5.0
    assert decision.opportunity_level in ("高机会", "中机会", "低机会")


def test_analyze_no_city():
    """测试不传城市"""
    engine = MKTEngine()
    decision = engine.analyze("火锅")
    assert decision.category_info is not None
    assert decision.city_info is None


def test_analyze_with_entrepreneur_params():
    """测试传创业者参数"""
    engine = MKTEngine()
    decision = engine.analyze("湘菜", "长沙", experience="首次创业", capital_level="low")
    assert len(decision.rule_notes) > 0 or len(decision.warnings) > 0


def test_analyze_experienced():
    """测试有经验的创业者"""
    engine = MKTEngine()
    d1 = engine.analyze("咖啡", "上海", experience="丰富", capital_level="high")
    d2 = engine.analyze("咖啡", "上海", experience="首次创业", capital_level="low")
    # 经验丰富+资金充足的评分应更高或等于
    assert d1.opportunity_score >= d2.opportunity_score


def test_analyze_json():
    """测试 JSON 输出"""
    engine = MKTEngine()
    json_str = engine.analyze_json("烧烤", "深圳")
    assert isinstance(json_str, str)
    assert "opportunity_score" in json_str
    assert "opportunity_level" in json_str


def test_list_categories():
    """测试列出品类"""
    engine = MKTEngine()
    cats = engine.list_categories()
    assert len(cats) == 10
    assert "咖啡" in cats
    assert "火锅" in cats
    assert "湘菜" in cats


def test_list_cities():
    """测试列出城市"""
    engine = MKTEngine()
    cities = engine.list_cities()
    assert len(cities) >= 5
    assert "上海" in cities
    assert "成都" in cities


def test_get_category_info():
    """测试获取品类信息"""
    engine = MKTEngine()
    info = engine.get_category_info("湘菜")
    assert info is not None
    assert info["name"] == "湘菜"
    assert info["category_stage"] == "成熟竞争期"


def test_get_category_info_not_found():
    """测试获取不存在的品类"""
    engine = MKTEngine()
    assert engine.get_category_info("不存在的品类") is None


def test_get_city_info():
    """测试获取城市信息"""
    engine = MKTEngine()
    info = engine.get_city_info("成都")
    assert info is not None
    assert info["city"] == "成都"
    assert info["tier"] == "新一线"


def test_get_city_info_not_found():
    """测试获取不存在的城市"""
    engine = MKTEngine()
    assert engine.get_city_info("不存在的城市") is None


def test_decision_has_dimensions():
    """测试决策包含六维得分"""
    engine = MKTEngine()
    decision = engine.analyze("茶饮", "广州")
    dims = decision.model_summary.get("dimensions", [])
    assert len(dims) == 6
    for dim in dims:
        assert "id" in dim
        assert "name" in dim
        assert "score" in dim is not None


def test_decision_has_cases():
    """测试决策包含相关案例"""
    engine = MKTEngine()
    decision = engine.analyze("火锅")
    assert len(decision.related_cases) > 0


def test_decision_to_dict():
    """测试决策序列化"""
    engine = MKTEngine()
    decision = engine.analyze("咖啡", "上海")
    d = decision.to_dict()
    assert isinstance(d, dict)
    assert "opportunity_score" in d
    assert "model_summary" in d
    assert "positioning_suggestions" in d
    assert "dimension_details" in d


def test_decision_has_30_indicators():
    """验证决策包含 30 个指标级评分"""
    engine = MKTEngine()
    decision = engine.analyze("湘菜", "长沙")
    details = decision.to_dict().get("dimension_details", [])
    total = sum(len(d.get("indicators", [])) for d in details)
    assert total == 30, f"应有 30 个指标，实际 {total}"


def test_decision_indicator_weights():
    """验证指标权重与维度定义一致"""
    engine = MKTEngine()
    decision = engine.analyze("火锅", "成都")
    details = decision.to_dict().get("dimension_details", [])
    if details:
        # 第一个指标权重应为 1.0（最高权重指标）
        first_ind = details[0]["indicators"][0]
        assert first_ind["weight"] == 1.0
