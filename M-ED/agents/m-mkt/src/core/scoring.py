"""
评分引擎 — 机会评分计算与归一化工具
"""

from .models import Dimension, SixDimensionModel


class ScoringEngine:
    """
    评分引擎

    负责六维模型的机会评分计算、指标归一化等核心逻辑。
    不依赖任何外部数据源，数据通过适配器层注入。
    """

    @staticmethod
    def normalize_score(value: float, min_val: float, max_val: float) -> float:
        """
        将原始值归一化到 0-5 分范围（线性归一化）

        Args:
            value: 原始值
            min_val: 最小值（基准）
            max_val: 最大值（基准）

        Returns:
            float: 归一化得分 (0-5)
        """
        if max_val == min_val:
            return 2.5  # 无法区分时返回中间值
        if value < min_val:
            return 0.0
        if value > max_val:
            return 5.0
        return ((value - min_val) / (max_val - min_val)) * 5.0

    @staticmethod
    def normalize_score_reverse(value: float, min_val: float, max_val: float) -> float:
        """
        反向归一化（值越小得分越高）

        Args:
            value: 原始值
            min_val: 最小值（基准）
            max_val: 最大值（基准）

        Returns:
            float: 归一化得分 (0-5)
        """
        if max_val == min_val:
            return 2.5
        if value < min_val:
            return 5.0
        if value > max_val:
            return 0.0
        return ((max_val - value) / (max_val - min_val)) * 5.0

    @staticmethod
    def evaluate_model(model: SixDimensionModel) -> dict:
        """
        评估六维模型，返回完整评分结果

        Args:
            model: 六维模型实例

        Returns:
            dict: 完整的评分报告
        """
        model.calculate_all()
        opportunity_score = model.get_opportunity_score()
        opportunity_level = SixDimensionModel.get_opportunity_level(opportunity_score)

        return {
            "model_name": model.name,
            "opportunity_score": round(opportunity_score, 2),
            "opportunity_level": opportunity_level,
            "dimensions": [dim.to_dict() for dim in model.dimensions],
        }

    @staticmethod
    def create_empty_model() -> SixDimensionModel:
        """
        创建一个空的六维模型（六个维度占位）

        Returns:
            SixDimensionModel: 包含六个空维度的模型
        """
        dimensions = [
            Dimension(
                id=i + 1,
                name=f"维度_{i + 1}",
                description=f"维度 {i + 1}（待定义）",
                weight=round(1.0 / 6, 4),
            )
            for i in range(6)
        ]
        # 确保权重之和为 1.0
        dimensions[-1].weight = round(1.0 - sum(d.weight for d in dimensions[:-1]), 4)
        return SixDimensionModel(dimensions=dimensions)
