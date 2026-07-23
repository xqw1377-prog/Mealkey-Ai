"""
六维模型数据模型定义
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class ScoreLevel(StrEnum):
    """得分等级"""

    EXCELLENT = "优秀"  # 4.0-5.0
    GOOD = "良好"  # 3.0-4.0
    AVERAGE = "一般"  # 2.0-3.0
    WEAK = "较弱"  # 1.0-2.0
    POOR = "差"  # 0.0-1.0


@dataclass
class Indicator:
    """
    评估指标

    Attributes:
        name: 指标名称
        description: 指标说明
        value: 原始值
        normalized_score: 归一化得分 (0-5)
        weight: 在维度内的权重 (0-1)
    """

    name: str
    description: str
    value: float | None = None
    normalized_score: float | None = None
    weight: float = 1.0

    def __post_init__(self) -> None:
        """校验权重范围"""
        if not 0.0 <= self.weight <= 1.0:
            raise ValueError(f"权重必须在 [0, 1] 范围内，当前值: {self.weight}")

    def get_weighted_score(self) -> float:
        """获取加权得分"""
        if self.normalized_score is None:
            return 0.0
        if not 0.0 <= self.normalized_score <= 5.0:
            raise ValueError(f"归一化得分必须在 [0, 5] 范围内，当前值: {self.normalized_score}")
        return self.normalized_score * self.weight

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            "name": self.name,
            "normalized_score": round(self.normalized_score, 2)
            if self.normalized_score is not None
            else None,
            "weight": self.weight,
            "weighted_score": round(self.get_weighted_score(), 2),
        }


@dataclass
class Dimension:
    """
    评估维度

    Attributes:
        id: 维度编号 (1-6)
        name: 维度名称
        description: 维度描述
        weight: 维度权重 (0-1)
        indicators: 指标列表
        score: 维度得分 (0-5)
    """

    id: int
    name: str
    description: str
    weight: float = 1.0
    indicators: list[Indicator] = field(default_factory=list)
    score: float | None = None

    def calculate_score(self) -> float:
        """
        计算维度得分（基于指标的加权平均）

        Returns:
            float: 维度得分 (0-5)

        Raises:
            ValueError: 当 id 不在 [1, 6] 范围时
        """
        if not 1 <= self.id <= 6:
            raise ValueError(f"维度 id 必须在 [1, 6] 范围内，当前值: {self.id}")

        if not self.indicators:
            self.score = 0.0
            return self.score

        valid_indicators = [ind for ind in self.indicators if ind.normalized_score is not None]
        if not valid_indicators:
            self.score = 0.0
            return self.score

        total_weight = sum(ind.weight for ind in valid_indicators)
        if total_weight == 0:
            self.score = 0.0
            return self.score

        weighted_sum = sum(ind.get_weighted_score() for ind in valid_indicators)
        self.score = weighted_sum / total_weight
        return self.score

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "score": round(self.score, 2) if self.score is not None else None,
            "level": self.get_level().value if self.score is not None else None,
            "weight": self.weight,
            "indicators": [ind.to_dict() for ind in self.indicators] if self.indicators else [],
        }

    def get_level(self) -> ScoreLevel:
        """获取得分等级"""
        if self.score is None:
            return ScoreLevel.POOR
        if self.score >= 4.0:
            return ScoreLevel.EXCELLENT
        if self.score >= 3.0:
            return ScoreLevel.GOOD
        if self.score >= 2.0:
            return ScoreLevel.AVERAGE
        if self.score >= 1.0:
            return ScoreLevel.WEAK
        return ScoreLevel.POOR


@dataclass
class SixDimensionModel:
    """
    六维模型

    包含六个标准化评估维度，是专业判断结构的核心。

    Attributes:
        dimensions: 六个维度的列表（按id排序）
        name: 模型名称
        description: 模型描述
    """

    dimensions: list[Dimension] = field(default_factory=list)
    name: str = "六维模型"
    description: str = "餐饮市场机会分析六维评估模型"

    def __post_init__(self):
        """初始化后校验并排序"""
        self.dimensions.sort(key=lambda d: d.id)
        if len(self.dimensions) > 6:
            raise ValueError(f"六维模型最多包含 6 个维度，当前: {len(self.dimensions)}")

    def get_dimension(self, dim_id: int) -> Dimension | None:
        """根据编号获取维度"""
        for dim in self.dimensions:
            if dim.id == dim_id:
                return dim
        return None

    def calculate_all(self) -> None:
        """计算所有维度的得分"""
        for dim in self.dimensions:
            dim.calculate_score()

    def get_opportunity_score(self) -> float:
        """
        计算机会评分（六维加权综合评分）

        Returns:
            float: 机会评分 (0-5)
        """
        self.calculate_all()

        total_weight = sum(dim.weight for dim in self.dimensions if dim.score is not None)
        if total_weight == 0:
            return 0.0

        weighted_sum = sum(
            dim.score * dim.weight for dim in self.dimensions if dim.score is not None
        )
        return weighted_sum / total_weight

    @staticmethod
    def get_opportunity_level(score: float) -> str:
        """
        获取机会等级（静态方法，不依赖实例）

        Args:
            score: 机会评分 (0-5)

        Returns:
            str: 机会等级描述
        """
        if score >= 3.5:
            return "高机会"
        if score >= 2.0:
            return "中机会"
        return "低机会"

    def summary(self) -> dict:
        """
        获取模型摘要

        Returns:
            dict: 包含各维度得分和总评的字典
        """
        self.calculate_all()
        return {
            "model_name": self.name,
            "dimensions": [dim.to_dict() for dim in self.dimensions],
            "opportunity_score": round(self.get_opportunity_score(), 2),
            "opportunity_level": self.get_opportunity_level(self.get_opportunity_score()),
        }
