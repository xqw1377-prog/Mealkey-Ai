"""
适配器模块单元测试
"""

from src.adapters import AdapterRegistry
from src.adapters.base import AdapterConfig, BaseAdapter
from src.adapters.case_library import CaseLibraryAdapter
from src.adapters.city_profile import CityProfileAdapter
from src.adapters.platform_data import PlatformDataAdapter


class ConcreteAdapter(BaseAdapter):
    """用于测试的具体适配器"""

    def fetch(self, **kwargs):
        return {"data": "test"}

    def transform(self, raw_data):
        return {"result": raw_data}


def test_adapter_config_defaults():
    """测试适配器配置默认值"""
    config = AdapterConfig(name="测试适配器")
    assert config.name == "测试适配器"
    assert config.version == "1.0.0"
    assert config.enabled is True
    assert config.params == {}


def test_adapter_config_custom():
    """测试自定义适配器配置"""
    config = AdapterConfig(name="自定义", version="2.0", enabled=False, params={"key": "value"})
    assert config.name == "自定义"
    assert config.params["key"] == "value"


def test_concrete_adapter():
    """测试具体适配器实现"""
    config = AdapterConfig(name="concrete")
    adapter = ConcreteAdapter(config)
    assert adapter.fetch() == {"data": "test"}
    assert adapter.transform("x") == {"result": "x"}
    assert adapter.validate() is True


def test_city_profile_adapter():
    """测试城市画像适配器（预留）"""
    adapter = CityProfileAdapter()
    assert adapter.config.name == "城市画像适配器"
    assert adapter.config.enabled is False
    assert adapter.get_info()["name"] == "城市画像适配器"
    try:
        adapter.fetch()
        raise AssertionError()
    except NotImplementedError:
        pass


def test_platform_data_adapter():
    """测试平台数据适配器（预留）"""
    adapter = PlatformDataAdapter()
    assert adapter.config.enabled is False
    try:
        adapter.transform({})
        raise AssertionError()
    except NotImplementedError:
        pass


def test_case_library_adapter():
    """测试案例库适配器（预留）"""
    adapter = CaseLibraryAdapter()
    assert adapter.config.name == "案例库适配器"
    assert adapter.config.params["case_count"] == 0


def test_adapter_registry():
    """测试适配器注册表"""
    AdapterRegistry.clear()
    assert AdapterRegistry.count() == 0

    config = AdapterConfig(name="测试适配器")
    adapter = ConcreteAdapter(config)
    AdapterRegistry.register("test", adapter)

    assert AdapterRegistry.count() == 1
    assert AdapterRegistry.get("test") is adapter
    assert AdapterRegistry.get("nonexistent") is None

    names = AdapterRegistry.list()
    assert "test" in names


def test_adapter_registry_clear():
    """测试清空注册表"""
    AdapterRegistry.clear()
    AdapterRegistry.register("a", ConcreteAdapter(AdapterConfig(name="a")))
    AdapterRegistry.register("b", ConcreteAdapter(AdapterConfig(name="b")))
    assert AdapterRegistry.count() == 2
    AdapterRegistry.clear()
    assert AdapterRegistry.count() == 0
