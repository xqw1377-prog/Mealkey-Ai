"""
案例库适配器（预留）

后续接入：历史案例与标杆对比数据。
"""

from typing import Any

from .base import AdapterConfig, BaseAdapter


class CaseLibraryAdapter(BaseAdapter):
    """
    案例库适配器

    预留接口，用于接入历史案例与标杆对比数据。
    """

    def __init__(self, config: AdapterConfig = None):
        if config is None:
            config = AdapterConfig(
                name="案例库适配器",
                version="0.1.0",
                enabled=False,  # 默认禁用
                params={"case_source": "待配置", "case_count": 0},
            )
        super().__init__(config)

    def fetch(self, **kwargs) -> Any:
        """预留：从案例库获取数据"""
        raise NotImplementedError("案例库数据源尚未接入")

    def transform(self, raw_data: Any) -> dict[str, Any]:
        """预留：转换案例库数据"""
        raise NotImplementedError("案例库数据源尚未接入")
