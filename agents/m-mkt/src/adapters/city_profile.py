"""
城市画像适配器（预留）

后续接入：城市级别的宏观数据，如人口、经济、消费习惯等。
"""

from typing import Any

from .base import AdapterConfig, BaseAdapter


class CityProfileAdapter(BaseAdapter):
    """
    城市画像适配器

    预留接口，用于接入城市画像数据源。
    """

    def __init__(self, config: AdapterConfig = None):
        if config is None:
            config = AdapterConfig(
                name="城市画像适配器",
                version="0.1.0",
                enabled=False,  # 默认禁用
                params={"data_source": "待配置", "update_frequency": "季度"},
            )
        super().__init__(config)

    def fetch(self, **kwargs) -> Any:
        """预留：从城市画像数据源获取数据"""
        raise NotImplementedError("城市画像数据源尚未接入")

    def transform(self, raw_data: Any) -> dict[str, Any]:
        """预留：转换城市画像数据"""
        raise NotImplementedError("城市画像数据源尚未接入")
