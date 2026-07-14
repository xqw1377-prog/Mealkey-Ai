"""
评分引擎单元测试
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.core.models import Dimension, Indicator, SixDimensionModel
from src.core.scoring import ScoringEngine


def test_normalize_score():
    """测试线性归一化"""
    engine = ScoringEngine()
    assert engine.normalize_score(50, 0, 100) == 2.5
    assert engine.normalize_score(100, 0, 100) == 5.0
    assert engine.normalize_score(0, 0, 100) == 0.0
    assert engine.normalize_score(75, 0, 100) == 3.75


def test_normalize_score_out_of_range():
    """测试归一化边界"""
    engine = ScoringEngine()
    assert engine.normalize_score(-10, 0, 100) == 0.0
    assert engine.normalize_score(200, 0, 100) == 5.0


def test_normalize_score_same_range():
    """测试范围相等时的归一化"""
    engine = ScoringEngine()
    assert engine.normalize_score(50, 50, 50) == 2.5


def test_normalize_score_reverse():
    """测试反向归一化"""
    engine = ScoringEngine()
    assert engine.normalize_score_reverse(50, 0, 100) == 2.5
    assert engine.normalize_score_reverse(0, 0, 100) == 5.0
    assert engine.normalize_score_reverse(100, 0, 100) == 0.0
    assert engine.normalize_score_reverse(25, 0, 100) == 3.75


def test_normalize_score_reverse_out_of_range():
    """测试反向归一化边界"""
    engine = ScoringEngine()
    assert engine.normalize_score_reverse(-10, 0, 100) == 5.0
    assert engine.normalize_score_reverse(200, 0, 100) == 0.0


def test_evaluate_model():
    """测试完整模型评估"""
    dims = [
        Dimension(
            id=1,
            name="市场容量",
            description="test",
            weight=0.3,
            indicators=[Indicator(name="人口", description="", normalized_score=4.0, weight=1.0)],
        ),
        Dimension(
            id=2,
            name="竞争强度",
            description="test",
            weight=0.3,
            indicators=[Indicator(name="密度", description="", normalized_score=3.0, weight=1.0)],
        ),
        Dimension(
            id=3,
            name="消费力",
            description="test",
            weight=0.4,
            indicators=[Indicator(name="收入", description="", normalized_score=5.0, weight=1.0)],
        ),
    ]
    model = SixDimensionModel(dimensions=dims, name="测试评估")
    result = ScoringEngine.evaluate_model(model)

    assert result["model_name"] == "测试评估"
    # (4*0.3 + 3*0.3 + 5*0.4) / (0.3+0.3+0.4) = (1.2+0.9+2.0)/1.0 = 4.1
    assert result["opportunity_score"] == 4.1
    assert result["opportunity_level"] == "高机会"
    assert len(result["dimensions"]) == 3


def test_create_empty_model():
    """测试创建空模型"""
    model = ScoringEngine.create_empty_model()
    assert len(model.dimensions) == 6
    # 前5个维度等权重，最后一个补足到1.0
    for i, dim in enumerate(model.dimensions):
        if i < 5:
            assert dim.weight == round(1.0 / 6, 4), f"维度 {i + 1} 权重错误"
        assert len(dim.indicators) == 0
        assert dim.score is None
    # 检查权重总和约为 1.0
    assert abs(sum(d.weight for d in model.dimensions) - 1.0) < 0.001


def test_evaluate_empty_model():
    """测试评估空模型"""
    model = ScoringEngine.create_empty_model()
    result = ScoringEngine.evaluate_model(model)
    assert result["opportunity_score"] == 0.0
    assert result["opportunity_level"] == "低机会"


def test_model_with_mixed_indicators():
    """测试混合指标（部分有值，部分无值）"""
    dim = Dimension(
        id=1,
        name="test",
        description="test",
        weight=1.0,
        indicators=[
            Indicator(name="i1", description="", normalized_score=4.0, weight=1.0),
            Indicator(name="i2", description="", normalized_score=None, weight=1.0),  # 无值
            Indicator(name="i3", description="", normalized_score=2.0, weight=1.0),
        ],
    )
    model = SixDimensionModel(dimensions=[dim])
    result = ScoringEngine.evaluate_model(model)
    # 只有 i1 和 i3 参与计算: (4+2)/2 = 3.0
    assert result["opportunity_score"] == 3.0


if __name__ == "__main__":
    test_normalize_score()
    test_normalize_score_out_of_range()
    test_normalize_score_same_range()
    test_normalize_score_reverse()
    test_normalize_score_reverse_out_of_range()
    test_evaluate_model()
    test_create_empty_model()
    test_evaluate_empty_model()
    test_model_with_mixed_indicators()
    print("所有测试通过 ✓")
