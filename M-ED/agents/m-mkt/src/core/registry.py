"""
维度注册表管理器

管理六维模型中六个维度的定义注册，支持按名称/ID 查询维度模板。
维度注册表是"专业判断结构"中维度定义的权威来源。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .exceptions import ModelError
from .models import Dimension, Indicator, SixDimensionModel


@dataclass
class DimensionTemplate:
    """
    维度模板 — 维度的预定义配置

    Attributes:
        dim_id: 维度编号 (1-6)
        name: 维度名称
        description: 维度描述
        weight: 默认权重
        indicators: 预定义指标列表（名称+描述，不含分值）
    """

    dim_id: int
    name: str
    description: str
    weight: float
    indicators: list[dict] = field(default_factory=list)


class DimensionRegistry:
    """
    维度注册表

    单例模式，管理所有已知维度的定义。
    为 SixDimensionModel 提供维度模板来源。
    """

    _instance: DimensionRegistry | None = None
    _templates: dict[int, DimensionTemplate] = {}

    def __new__(cls) -> DimensionRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._templates = {}
        return cls._instance

    @classmethod
    def clear(cls) -> None:
        """清空注册表（用于测试/重置）"""
        cls._templates = {}

    @classmethod
    def reset(cls) -> None:
        """完全重置注册表（清空模板和实例，用于测试隔离）"""
        cls._templates = {}
        cls._instance = None

    @classmethod
    def register(cls, template: DimensionTemplate) -> None:
        """
        注册维度模板

        Args:
            template: 维度模板

        Raises:
            ModelError: 当 ID 重复或超出范围时
        """
        if not 1 <= template.dim_id <= 6:
            raise ModelError(f"维度 ID 必须在 [1, 6] 范围内: {template.dim_id}")
        if template.dim_id in cls._templates:
            raise ModelError(
                f"维度 ID {template.dim_id} 已注册: {cls._templates[template.dim_id].name}"
            )
        cls._templates[template.dim_id] = template

    @classmethod
    def get(cls, dim_id: int) -> DimensionTemplate | None:
        """根据 ID 获取维度模板"""
        return cls._templates.get(dim_id)

    @classmethod
    def get_by_name(cls, name: str) -> DimensionTemplate | None:
        """根据名称获取维度模板"""
        for t in cls._templates.values():
            if t.name == name:
                return t
        return None

    @classmethod
    def all(cls) -> list[DimensionTemplate]:
        """获取所有已注册的维度模板（按 ID 排序）"""
        return [cls._templates[i] for i in sorted(cls._templates.keys())]

    @classmethod
    def count(cls) -> int:
        """获取已注册的维度数量"""
        return len(cls._templates)

    @classmethod
    def list_names(cls) -> list[str]:
        """列出所有已注册的维度名称"""
        return [t.name for t in cls.all()]

    @classmethod
    def build_dimension(cls, dim_id: int) -> Dimension:
        """
        根据模板构建 Dimension 实例

        Args:
            dim_id: 维度编号

        Returns:
            Dimension: 创建的维度实例（不含分数）

        Raises:
            ModelError: 模板不存在时
        """
        template = cls.get(dim_id)
        if template is None:
            raise ModelError(f"维度 ID {dim_id} 未注册")

        indicators = [
            Indicator(
                name=ind["name"],
                description=ind.get("description", ""),
                weight=ind.get("weight", 1.0),
            )
            for ind in template.indicators
        ]

        return Dimension(
            id=dim_id,
            name=template.name,
            description=template.description,
            weight=template.weight,
            indicators=indicators,
        )

    @classmethod
    def build_model(cls, name: str = "六维模型", description: str = "") -> SixDimensionModel:
        """
        根据所有已注册模板构建完整的六维模型

        Args:
            name: 模型名称
            description: 模型描述

        Returns:
            SixDimensionModel: 完整的六维模型

        Raises:
            ModelError: 当注册的维度数量不为 6 时
        """
        if cls.count() != 6:
            raise ModelError(f"需要注册 6 个维度才能构建模型，当前已注册: {cls.count()}")

        dimensions = [cls.build_dimension(i) for i in range(1, 7)]
        return SixDimensionModel(dimensions=dimensions, name=name, description=description)
