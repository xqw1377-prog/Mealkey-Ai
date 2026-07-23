"""
维度注册表单元测试
"""

from src.core.exceptions import ModelError
from src.core.models import SixDimensionModel
from src.core.registry import DimensionRegistry, DimensionTemplate


def setup_module():
    """每个测试前重置注册表"""
    DimensionRegistry.clear()


def test_register_and_get():
    """测试注册与获取"""
    t = DimensionTemplate(dim_id=1, name="市场容量", description="市场规模", weight=0.25)
    DimensionRegistry.register(t)
    assert DimensionRegistry.get(1).name == "市场容量"
    assert DimensionRegistry.get(2) is None


def test_register_duplicate():
    """测试重复注册抛出异常"""
    DimensionRegistry.clear()
    DimensionRegistry.register(DimensionTemplate(dim_id=1, name="D1", description="", weight=0.2))
    try:
        DimensionRegistry.register(
            DimensionTemplate(dim_id=1, name="D1-重复", description="", weight=0.2)
        )
        raise AssertionError("应抛出 ModelError")
    except ModelError:
        pass


def test_register_out_of_range():
    """测试注册超出范围的 ID"""
    DimensionRegistry.clear()
    try:
        DimensionRegistry.register(
            DimensionTemplate(dim_id=0, name="无效", description="", weight=0.2)
        )
        raise AssertionError()
    except ModelError:
        pass
    try:
        DimensionRegistry.register(
            DimensionTemplate(dim_id=7, name="无效", description="", weight=0.2)
        )
        raise AssertionError()
    except ModelError:
        pass


def test_get_by_name():
    """测试按名称查找"""
    DimensionRegistry.clear()
    DimensionRegistry.register(
        DimensionTemplate(dim_id=1, name="市场容量", description="", weight=0.2)
    )
    DimensionRegistry.register(
        DimensionTemplate(dim_id=2, name="竞争格局", description="", weight=0.2)
    )
    assert DimensionRegistry.get_by_name("市场容量").dim_id == 1
    assert DimensionRegistry.get_by_name("竞争格局").dim_id == 2
    assert DimensionRegistry.get_by_name("不存在") is None


def test_list_names():
    """测试列出名称"""
    DimensionRegistry.clear()
    DimensionRegistry.register(DimensionTemplate(dim_id=1, name="D1", description="", weight=0.2))
    DimensionRegistry.register(DimensionTemplate(dim_id=2, name="D2", description="", weight=0.2))
    names = DimensionRegistry.list_names()
    assert names == ["D1", "D2"]


def test_build_dimension():
    """测试从模板构建维度"""
    DimensionRegistry.clear()
    DimensionRegistry.register(
        DimensionTemplate(
            dim_id=1,
            name="市场容量",
            description="test",
            weight=0.25,
            indicators=[
                {"name": "人口规模", "description": "常住人口", "weight": 1.0},
                {"name": "人均餐饮支出", "description": "年人均", "weight": 0.8},
            ],
        )
    )
    dim = DimensionRegistry.build_dimension(1)
    assert dim.id == 1
    assert dim.name == "市场容量"
    assert dim.weight == 0.25
    assert len(dim.indicators) == 2
    assert dim.indicators[0].name == "人口规模"
    assert dim.indicators[1].weight == 0.8


def test_build_dimension_not_registered():
    """测试构建未注册的维度"""
    DimensionRegistry.clear()
    try:
        DimensionRegistry.build_dimension(3)
        raise AssertionError()
    except ModelError:
        pass


def test_build_model_full():
    """测试构建完整六维模型"""
    DimensionRegistry.clear()
    names = ["市场", "竞争", "消费", "品类", "供应链", "政策"]
    for i, name in enumerate(names, 1):
        DimensionRegistry.register(
            DimensionTemplate(dim_id=i, name=name, description="", weight=round(1.0 / 6, 2))
        )
    model = DimensionRegistry.build_model(name="测试模型")
    assert isinstance(model, SixDimensionModel)
    assert model.name == "测试模型"
    assert len(model.dimensions) == 6
    assert [d.name for d in model.dimensions] == names


def test_build_model_not_enough():
    """测试维度不足时构建失败"""
    DimensionRegistry.clear()
    DimensionRegistry.register(DimensionTemplate(dim_id=1, name="D1", description="", weight=1.0))
    try:
        DimensionRegistry.build_model()
        raise AssertionError()
    except ModelError:
        pass


def test_all_sorted():
    """测试 all() 返回按 ID 排序"""
    DimensionRegistry.clear()
    DimensionRegistry.register(DimensionTemplate(dim_id=3, name="D3", description="", weight=0.2))
    DimensionRegistry.register(DimensionTemplate(dim_id=1, name="D1", description="", weight=0.2))
    DimensionRegistry.register(DimensionTemplate(dim_id=2, name="D2", description="", weight=0.2))
    ids = [t.dim_id for t in DimensionRegistry.all()]
    assert ids == [1, 2, 3]


def test_count():
    """测试计数"""
    DimensionRegistry.clear()
    assert DimensionRegistry.count() == 0
    DimensionRegistry.register(DimensionTemplate(dim_id=1, name="D1", description="", weight=1.0))
    assert DimensionRegistry.count() == 1
