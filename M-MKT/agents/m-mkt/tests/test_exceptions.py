"""
异常体系单元测试
"""

from src.core.exceptions import (
    AdapterConfigError,
    AdapterError,
    AdapterNotImplementedError,
    DimensionError,
    IndicatorError,
    MMTKError,
    ModelError,
    ScoringError,
    SerializationError,
    ValidationError,
)


def test_exception_hierarchy():
    """测试异常继承层次"""
    assert issubclass(ModelError, MMTKError)
    assert issubclass(DimensionError, ModelError)
    assert issubclass(IndicatorError, ModelError)
    assert issubclass(ValidationError, ModelError)
    assert issubclass(AdapterError, MMTKError)
    assert issubclass(AdapterNotImplementedError, AdapterError)
    assert issubclass(AdapterConfigError, AdapterError)
    assert issubclass(ScoringError, MMTKError)
    assert issubclass(SerializationError, MMTKError)


def test_exception_message():
    """测试异常消息"""
    e = ModelError("测试错误")
    assert str(e) == "测试错误"


def test_exception_raise_and_catch_base():
    """测试使用基类捕获"""
    try:
        raise DimensionError("维度错误")
    except ModelError:
        pass
    except MMTKError:
        raise AssertionError("应被 ModelError 捕获")


def test_exception_raise_and_catch_specific():
    """测试使用具体类型捕获"""
    try:
        raise SerializationError("序列化失败")
    except SerializationError:
        pass
    except MMTKError:
        raise AssertionError("应被 SerializationError 直接捕获")
