"""
序列化/反序列化单元测试
"""

from src.core.exceptions import SerializationError
from src.core.models import Dimension, Indicator, SixDimensionModel
from src.core.serializer import ModelSerializer


def make_test_model() -> SixDimensionModel:
    """创建测试模型"""
    dims = [
        Dimension(
            id=1,
            name="市场容量",
            description="市场规模",
            weight=0.3,
            indicators=[
                Indicator(name="人口", description="常住人口", normalized_score=4.0, weight=1.0),
                Indicator(
                    name="餐饮支出", description="人均年支出", normalized_score=3.5, weight=0.8
                ),
            ],
        ),
        Dimension(
            id=2,
            name="竞争格局",
            description="竞争强度",
            weight=0.2,
            indicators=[
                Indicator(name="品牌集中度", description="CR5", normalized_score=3.0, weight=1.0),
            ],
        ),
    ]
    return SixDimensionModel(dimensions=dims, name="测试模型", description="用于测试的模型")


def test_to_dict():
    """测试序列化为字典"""
    model = make_test_model()
    d = ModelSerializer.to_dict(model)
    assert d["name"] == "测试模型"
    assert d["description"] == "用于测试的模型"
    assert "opportunity_score" in d
    assert "opportunity_level" in d
    assert len(d["dimensions"]) == 2

    dim1 = d["dimensions"][0]
    assert dim1["id"] == 1
    assert dim1["name"] == "市场容量"
    assert "score" in dim1
    assert "level" in dim1
    assert len(dim1["indicators"]) == 2


def test_to_dict_without_indicators():
    """测试不包含指标明细的序列化"""
    model = make_test_model()
    d = ModelSerializer.to_dict(model, include_indicators=False)
    assert "indicators" not in d["dimensions"][0]


def test_from_dict():
    """测试反序列化"""
    original = make_test_model()
    original.calculate_all()
    data = ModelSerializer.to_dict(original)
    restored = ModelSerializer.from_dict(data)

    assert restored.name == "测试模型"
    assert len(restored.dimensions) == 2
    assert restored.dimensions[0].name == "市场容量"
    assert restored.dimensions[0].weight == 0.3
    assert len(restored.dimensions[0].indicators) == 2
    assert restored.dimensions[0].indicators[0].name == "人口"
    assert restored.dimensions[0].indicators[0].normalized_score == 4.0


def test_roundtrip():
    """测试往返一致性"""
    original = make_test_model()
    original.calculate_all()
    original_score = original.get_opportunity_score()

    data = ModelSerializer.to_dict(original)
    restored = ModelSerializer.from_dict(data)
    restored.calculate_all()
    restored_score = restored.get_opportunity_score()

    assert abs(original_score - restored_score) < 0.001


def test_to_json():
    """测试序列化为 JSON"""
    model = make_test_model()
    json_str = ModelSerializer.to_json(model)
    assert isinstance(json_str, str)
    assert "测试模型" in json_str
    assert "市场容量" in json_str


def test_from_json():
    """测试从 JSON 反序列化"""
    model = make_test_model()
    json_str = ModelSerializer.to_json(model)
    restored = ModelSerializer.from_json(json_str)
    assert restored.name == "测试模型"
    assert len(restored.dimensions) == 2


def test_from_dict_empty_dimensions():
    """测试空 dimensions 时抛出异常"""
    try:
        ModelSerializer.from_dict({"name": "test", "dimensions": []})
        raise AssertionError()
    except SerializationError:
        pass


def test_from_dict_missing_fields():
    """测试缺少关键字段时抛出异常"""
    try:
        ModelSerializer.from_dict({"name": "test"})
        raise AssertionError()
    except SerializationError:
        pass


def test_from_invalid_json():
    """测试无效 JSON"""
    try:
        ModelSerializer.from_json("{invalid json}")
        raise AssertionError()
    except SerializationError:
        pass


def test_from_dict_with_no_indicators():
    """测试反序列化无指标的维度"""
    data = {
        "name": "测试",
        "dimensions": [{"id": 1, "name": "D1", "description": "", "weight": 1.0}],
    }
    model = ModelSerializer.from_dict(data)
    assert len(model.dimensions) == 1
    assert len(model.dimensions[0].indicators) == 0
