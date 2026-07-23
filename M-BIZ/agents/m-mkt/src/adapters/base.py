"""
数据源适配器基类

定义适配器接口标准，所有数据源适配器需继承 BaseAdapter。
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class AdapterConfig:
    """适配器配置"""

    name: str
    version: str = "1.0.0"
    enabled: bool = True
    params: dict[str, Any] = None

    def __post_init__(self):
        if self.params is None:
            self.params = {}


class BaseAdapter(ABC):
    """
    数据源适配器基类

    所有具体数据源适配器（城市画像、平台数据、案例库等）必须继承此类。
    """

    def __init__(self, config: AdapterConfig):
        self.config = config

    @abstractmethod
    def fetch(self, **kwargs) -> Any:
        """
        从数据源获取原始数据

        Returns:
            Any: 原始数据
        """
        pass

    @abstractmethod
    def transform(self, raw_data: Any) -> dict[str, Any]:
        """
        将原始数据转换为标准化的指标数据

        Args:
            raw_data: 原始数据

        Returns:
            Dict: 标准化后的指标数据
        """
        pass

    def validate(self) -> bool:
        """
        验证适配器配置是否有效

        Returns:
            bool: 配置是否有效
        """
        return True

    def get_info(self) -> dict[str, Any]:
        """获取适配器信息"""
        return {
            "name": self.config.name,
            "version": self.config.version,
            "enabled": self.config.enabled,
            "params": self.config.params,
        }
