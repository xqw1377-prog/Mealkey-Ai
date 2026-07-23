"""
数据源适配器层

适配器注册表与管理接口。
后续接入：城市画像、平台数据、案例库
"""

from __future__ import annotations

from .base import AdapterConfig, BaseAdapter


class AdapterRegistry:
    """
    适配器注册表

    管理所有数据源适配器的注册与发现。
    单例模式。
    """

    _instance: AdapterRegistry | None = None
    _adapters: dict[str, BaseAdapter] = {}

    def __new__(cls) -> AdapterRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._adapters = {}
        return cls._instance

    @classmethod
    def register(cls, name: str, adapter: BaseAdapter) -> None:
        """
        注册适配器

        Args:
            name: 适配器名称
            adapter: 适配器实例
        """
        cls._adapters[name] = adapter

    @classmethod
    def get(cls, name: str) -> BaseAdapter | None:
        """获取适配器"""
        return cls._adapters.get(name)

    @classmethod
    def list(cls) -> list[str]:
        """列出所有已注册的适配器名称"""
        return list(cls._adapters.keys())

    @classmethod
    def clear(cls) -> None:
        """清空注册表"""
        cls._adapters = {}

    @classmethod
    def count(cls) -> int:
        """获取适配器数量"""
        return len(cls._adapters)
