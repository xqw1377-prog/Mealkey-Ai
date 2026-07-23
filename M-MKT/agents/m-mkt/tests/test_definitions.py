"""
餐饮六维模型定义单元测试
"""

from src.core.dimension_definitions import (
    DIM_BRAND_MOMENTUM,
    DIM_COMPETITIVE_LANDSCAPE,
    DIM_CONSUMER_FIT,
    DIM_ENVIRONMENTAL_FIT,
    DIM_MARKET_CAPACITY,
    DIM_OPERATIONAL_FEASIBILITY,
    SIX_DIMENSIONS,
    build_opportunity_model,
    register_all,
)
from src.core.models import SixDimensionModel
from src.core.registry import DimensionRegistry
from src.core.scoring import ScoringEngine


def setup_module():
    """每个测试前重置"""
    DimensionRegistry.clear()


def test_six_dimensions_count():
    """测试六个维度完整"""
    assert len(SIX_DIMENSIONS) == 6


def test_each_dimension_has_id():
    """测试每个维度的 ID 正确"""
    for i, dim in enumerate(SIX_DIMENSIONS, 1):
        assert dim.dim_id == i, f"维度 {i} ID 错误"


def test_each_dimension_has_name():
    """测试每个维度有名称"""
    names = []
    for dim in SIX_DIMENSIONS:
        assert dim.name, "维度名称不能为空"
        names.append(dim.name)
    # 确保名称唯一
    assert len(set(names)) == 6, "维度名称不能重复"


def test_each_dimension_has_weight():
    """测试每个维度有权重"""
    for dim in SIX_DIMENSIONS:
        assert 0 < dim.weight <= 1.0, f"维度 {dim.name} 权重异常: {dim.weight}"


def test_weights_sum_to_one():
    """测试权重之和为 1.0"""
    total = sum(dim.weight for dim in SIX_DIMENSIONS)
    assert abs(total - 1.0) < 0.001, f"权重之和为 {total}，应为 1.0"


def test_each_dimension_has_indicators():
    """测试每个维度至少有一个指标"""
    for dim in SIX_DIMENSIONS:
        assert len(dim.indicators) > 0, f"维度 {dim.name} 没有指标"
        assert len(dim.indicators) <= 10, f"维度 {dim.name} 指标过多"


def test_each_indicator_has_name():
    """测试每个指标有名称"""
    for dim in SIX_DIMENSIONS:
        for ind in dim.indicators:
            assert ind.get("name"), f"维度 {dim.name} 中有指标缺少名称"


def test_each_indicator_valid_weight():
    """测试每个指标权重有效"""
    for dim in SIX_DIMENSIONS:
        for ind in dim.indicators:
            w = ind.get("weight", 1.0)
            assert 0 < w <= 1.0, f"维度 {dim.name} 指标 {ind.get('name')} 权重异常: {w}"


def test_register_all():
    """测试批量注册"""
    DimensionRegistry.clear()
    register_all()
    assert DimensionRegistry.count() == 6
    names = DimensionRegistry.list_names()
    assert names[0] == "市场容量"
    assert names[1] == "竞争格局"
    assert names[2] == "消费适配"
    assert names[3] == "运营可行性"
    assert names[4] == "品牌势能"
    assert names[5] == "环境适配"


def test_build_opportunity_model():
    """测试构建完整评估模型"""
    model = build_opportunity_model(name="测试餐饮市场评估")
    assert isinstance(model, SixDimensionModel)
    assert model.name == "测试餐饮市场评估"
    assert len(model.dimensions) == 6

    # 验证每个维度都有指标
    for dim in model.dimensions:
        assert len(dim.indicators) > 0, f"维度 {dim.name} 没有指标"


def test_model_can_score():
    """测试构建的模型可以正常评分"""
    model = build_opportunity_model()
    result = ScoringEngine.evaluate_model(model)
    assert "opportunity_score" in result
    assert "opportunity_level" in result
    assert len(result["dimensions"]) == 6
    # 所有维度得分应为 0（因为指标没有赋值）
    for dim in result["dimensions"]:
        assert dim["score"] == 0.0


def test_model_with_values():
    """测试给指标赋值后评分"""
    model = build_opportunity_model()
    # 给第一个维度的第一个指标赋值
    model.dimensions[0].indicators[0].normalized_score = 4.0
    model.dimensions[1].indicators[0].normalized_score = 3.5
    model.dimensions[2].indicators[0].normalized_score = 4.5

    result = ScoringEngine.evaluate_model(model)
    assert result["opportunity_score"] > 0
    assert result["dimensions"][0]["score"] > 0


def test_each_dimension_description():
    """测试每个维度有完整描述"""
    for dim in SIX_DIMENSIONS:
        desc = dim.description
        assert len(desc) > 20, f"维度 {dim.name} 描述过短"
        assert "。" in desc, f"维度 {dim.name} 描述缺少句号"


def test_indicator_descriptions():
    """测试指标有完整描述"""
    for dim in SIX_DIMENSIONS:
        for ind in dim.indicators:
            desc = ind.get("description", "")
            assert len(desc) > 10, f"维度 {dim.name} > 指标 {ind.get('name')} 描述过短"


def test_market_capacity_indicators():
    """测试市场容量维度指标"""
    indicators = DIM_MARKET_CAPACITY.indicators
    names = [ind["name"] for ind in indicators]
    assert "目标人口规模" in names
    assert "品类市场渗透率" in names
    assert "品类增长率" in names


def test_competitive_landscape_indicators():
    """测试竞争格局维度指标"""
    indicators = DIM_COMPETITIVE_LANDSCAPE.indicators
    names = [ind["name"] for ind in indicators]
    assert "品牌集中度 (CR5)" in names
    assert "每万人餐厅保有量" in names


def test_consumer_fit_indicators():
    """测试消费适配维度指标"""
    indicators = DIM_CONSUMER_FIT.indicators
    names = [ind["name"] for ind in indicators]
    assert "客群画像吻合度" in names
    assert "客单价适配度" in names


def test_operational_feasibility_indicators():
    """测试运营可行性维度指标"""
    indicators = DIM_OPERATIONAL_FEASIBILITY.indicators
    names = [ind["name"] for ind in indicators]
    assert "供应链成熟度" in names
    assert "物业租金水平" in names


def test_brand_momentum_indicators():
    """测试品牌势能维度指标"""
    indicators = DIM_BRAND_MOMENTUM.indicators
    names = [ind["name"] for ind in indicators]
    assert "品牌知名度与美誉度" in names
    assert "产品力评分" in names


def test_environmental_fit_indicators():
    """测试环境适配维度指标"""
    indicators = DIM_ENVIRONMENTAL_FIT.indicators
    names = [ind["name"] for ind in indicators]
    assert "政策支持度" in names
    assert "消费趋势吻合度" in names
