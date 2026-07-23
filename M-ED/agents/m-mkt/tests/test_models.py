"""
六维模型数据模型单元测试
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.core.models import Dimension, Indicator, ScoreLevel, SixDimensionModel


def test_create_dimension():
    """测试创建维度"""
    dim = Dimension(id=1, name="市场容量", description="评估目标市场的规模与容量", weight=0.25)
    assert dim.id == 1
    assert dim.name == "市场容量"
    assert dim.weight == 0.25
    assert dim.score is None
    assert len(dim.indicators) == 0


def test_create_indicator():
    """测试创建指标"""
    ind = Indicator(
        name="人口规模",
        description="城市常住人口数量",
        value=1000.0,
        normalized_score=4.0,
        weight=0.5,
    )
    assert ind.name == "人口规模"
    assert ind.value == 1000.0
    assert ind.normalized_score == 4.0
    assert ind.weight == 0.5


def test_indicator_weighted_score():
    """测试指标加权得分计算"""
    ind = Indicator(name="测试指标", description="test", normalized_score=4.0, weight=0.5)
    assert ind.get_weighted_score() == 2.0


def test_indicator_weighted_score_none():
    """测试指标得分为 None 时返回 0"""
    ind = Indicator(name="测试指标", description="test", normalized_score=None, weight=0.5)
    assert ind.get_weighted_score() == 0.0


def test_dimension_calculate_score():
    """测试维度得分计算"""
    dim = Dimension(
        id=1,
        name="测试维度",
        description="test",
        weight=0.3,
        indicators=[
            Indicator(name="指标1", description="", normalized_score=4.0, weight=1.0),
            Indicator(name="指标2", description="", normalized_score=3.0, weight=1.0),
        ],
    )
    score = dim.calculate_score()
    assert score == 3.5  # (4.0+3.0)/2


def test_dimension_calculate_score_weighted():
    """测试维度加权得分计算"""
    dim = Dimension(
        id=1,
        name="测试维度",
        description="test",
        weight=0.3,
        indicators=[
            Indicator(name="指标1", description="", normalized_score=5.0, weight=1.0),
            Indicator(name="指标2", description="", normalized_score=2.0, weight=0.5),
        ],
    )
    score = dim.calculate_score()
    assert score == 4.0  # (5*1.0 + 2*0.5) / (1.0+0.5) = 6.0/1.5 = 4.0


def test_dimension_get_level():
    """测试维度等级判定"""
    dim = Dimension(id=1, name="test", description="test")

    dim.score = 4.5
    assert dim.get_level() == ScoreLevel.EXCELLENT

    dim.score = 3.5
    assert dim.get_level() == ScoreLevel.GOOD

    dim.score = 2.5
    assert dim.get_level() == ScoreLevel.AVERAGE

    dim.score = 1.5
    assert dim.get_level() == ScoreLevel.WEAK

    dim.score = 0.5
    assert dim.get_level() == ScoreLevel.POOR


def test_six_dimension_model():
    """测试六维模型创建"""
    model = SixDimensionModel()
    assert len(model.dimensions) == 0
    assert model.name == "六维模型"


def test_six_dimension_model_with_dims():
    """测试带维度的六维模型"""
    dims = [
        Dimension(id=1, name="D1", description="", weight=0.2),
        Dimension(id=2, name="D2", description="", weight=0.2),
    ]
    model = SixDimensionModel(dimensions=dims)
    assert len(model.dimensions) == 2
    assert model.get_dimension(1).name == "D1"
    assert model.get_dimension(3) is None


def test_get_opportunity_score():
    """测试机会评分计算"""
    dims = [
        Dimension(
            id=1,
            name="D1",
            description="",
            weight=0.5,
            indicators=[Indicator(name="i1", description="", normalized_score=4.0, weight=1.0)],
        ),
        Dimension(
            id=2,
            name="D2",
            description="",
            weight=0.5,
            indicators=[Indicator(name="i2", description="", normalized_score=2.0, weight=1.0)],
        ),
    ]
    model = SixDimensionModel(dimensions=dims)
    score = model.get_opportunity_score()
    assert score == 3.0  # (4*0.5 + 2*0.5) / (0.5+0.5) = 3.0


def test_opportunity_level():
    """测试机会等级判定"""
    assert SixDimensionModel.get_opportunity_level(4.0) == "高机会"
    assert SixDimensionModel.get_opportunity_level(3.0) == "中机会"
    assert SixDimensionModel.get_opportunity_level(1.0) == "低机会"


def test_summary():
    """测试模型摘要"""
    dims = [
        Dimension(
            id=1,
            name="D1",
            description="",
            weight=1.0,
            indicators=[Indicator(name="i1", description="", normalized_score=4.0, weight=1.0)],
        ),
    ]
    model = SixDimensionModel(dimensions=dims)
    summary = model.summary()
    assert summary["model_name"] == "六维模型"
    assert summary["opportunity_score"] == 4.0
    assert summary["opportunity_level"] == "高机会"
    assert len(summary["dimensions"]) == 1


def test_summary_output_format():
    """测试摘要输出格式"""
    dims = [
        Dimension(
            id=1,
            name="D1",
            description="",
            weight=1.0,
            indicators=[Indicator(name="i1", description="", normalized_score=4.0, weight=1.0)],
        ),
    ]
    model = SixDimensionModel(dimensions=dims)
    s = model.summary()
    assert "model_name" in s
    assert "opportunity_score" in s
    assert "opportunity_level" in s
    assert "dimensions" in s
    d = s["dimensions"][0]
    assert "id" in d and "name" in d and "score" in d and "level" in d and "weight" in d


def test_indicator_weight_validation():
    """测试指标权重校验"""
    try:
        Indicator(name="bad", description="", weight=1.5)
        raise AssertionError("应抛出 ValueError")
    except ValueError:
        pass


def test_dimension_id_validation():
    """测试维度ID校验"""
    try:
        Dimension(id=7, name="bad", description="").calculate_score()
        raise AssertionError("应抛出 ValueError")
    except ValueError:
        pass


def test_to_dict_indicator():
    """测试 Indicator.to_dict()"""
    ind = Indicator(name="测试", description="", normalized_score=4.0, weight=0.5)
    d = ind.to_dict()
    assert d["name"] == "测试"
    assert d["normalized_score"] == 4.0
    assert d["weight"] == 0.5
    assert d["weighted_score"] == 2.0


def test_to_dict_dimension():
    """测试 Dimension.to_dict()"""
    dim = Dimension(
        id=1,
        name="D1",
        description="",
        weight=0.5,
        indicators=[Indicator(name="i1", description="", normalized_score=4.0, weight=1.0)],
    )
    dim.calculate_score()
    d = dim.to_dict()
    assert d["id"] == 1
    assert d["name"] == "D1"
    assert d["score"] == 4.0
    assert d["level"] == "优秀"
    assert len(d["indicators"]) == 1


def test_empty_indicators_score():
    """测试无指标时维度得分为 0"""
    dim = Dimension(id=1, name="test", description="test")
    score = dim.calculate_score()
    assert score == 0.0


if __name__ == "__main__":
    test_create_dimension()
    test_create_indicator()
    test_indicator_weighted_score()
    test_indicator_weighted_score_none()
    test_dimension_calculate_score()
    test_dimension_calculate_score_weighted()
    test_dimension_get_level()
    test_six_dimension_model()
    test_six_dimension_model_with_dims()
    test_get_opportunity_score()
    test_opportunity_level()
    test_summary()
    test_summary_output_format()
    test_indicator_weight_validation()
    test_dimension_id_validation()
    test_to_dict_indicator()
    test_to_dict_dimension()
    test_empty_indicators_score()
    print("所有测试通过 ✓")
