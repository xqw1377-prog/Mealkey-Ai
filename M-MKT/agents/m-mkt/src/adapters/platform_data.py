"""
平台数据适配器（预留）

后续接入：业务平台运营数据，如订单、客流、评价等。
"""

from typing import Any

from .base import AdapterConfig, BaseAdapter


class PlatformDataAdapter(BaseAdapter):
    """
    平台数据适配器

    预留接口，用于接入业务平台运营数据。
    """

    def __init__(self, config: AdapterConfig = None):
        if config is None:
            config = AdapterConfig(
                name="平台数据适配器",
                version="0.1.0",
                enabled=False,  # 默认禁用
                params={"platform": "待配置", "api_endpoint": "待配置"},
            )
        super().__init__(config)

    def fetch(self, **kwargs) -> Any:
        """预留：从平台数据源获取数据"""
        raise NotImplementedError("平台数据源尚未接入")

    def transform(self, raw_data: Any) -> dict[str, Any]:
        """预留：转换平台数据"""
        raise NotImplementedError("平台数据源尚未接入")
