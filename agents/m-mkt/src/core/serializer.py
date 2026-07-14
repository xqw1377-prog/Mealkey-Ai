"""
序列化/反序列化

支持 SixDimensionModel 与 JSON/dict 之间的互相转换。
确保模型的可持久化与跨系统交换。
"""

from __future__ import annotations

import json
from typing import Any

from .exceptions import SerializationError
from .models import Dimension, Indicator, SixDimensionModel


class ModelSerializer:
    """
    模型序列化器

    负责 SixDimensionModel 的 JSON 导入导出。
    输出格式符合 技术接口规范 v1.0.0。
    """

    @staticmethod
    def to_dict(model: SixDimensionModel, include_indicators: bool = True) -> dict:
        """
        将模型序列化为字典

        Args:
            model: 六维模型实例
            include_indicators: 是否包含指标级明细

        Returns:
            dict: 序列化后的字典
        """
        # 先计算所有分数
        model.calculate_all()

        dims = []
        for dim in model.dimensions:
            dim_dict = {
                "id": dim.id,
                "name": dim.name,
                "description": dim.description,
                "weight": dim.weight,
            }
            if dim.score is not None:
                dim_dict["score"] = round(dim.score, 2)
                dim_dict["level"] = dim.get_level().value

            if include_indicators and dim.indicators:
                dim_dict["indicators"] = [
                    {
                        "name": ind.name,
                        "description": ind.description,
                        "normalized_score": round(ind.normalized_score, 2)
                        if ind.normalized_score is not None
                        else None,
                        "weight": ind.weight,
                    }
                    for ind in dim.indicators
                ]

            dims.append(dim_dict)

        return {
            "name": model.name,
            "description": model.description,
            "opportunity_score": round(model.get_opportunity_score(), 2),
            "opportunity_level": SixDimensionModel.get_opportunity_level(
                model.get_opportunity_score()
            ),
            "dimensions": dims,
        }

    @staticmethod
    def from_dict(data: dict) -> SixDimensionModel:
        """
        从字典反序列化为模型

        Args:
            data: 字典数据

        Returns:
            SixDimensionModel: 六维模型实例

        Raises:
            SerializationError: 数据格式错误时
        """
        try:
            name = data.get("name", "六维模型")
            description = data.get("description", "")
            dims_data = data.get("dimensions", [])

            if not dims_data:
                raise SerializationError("缺少 dimensions 字段")

            dimensions = []
            for d in dims_data:
                indicators = []
                for ind in d.get("indicators", []):
                    indicators.append(
                        Indicator(
                            name=ind["name"],
                            description=ind.get("description", ""),
                            value=ind.get("value"),
                            normalized_score=ind.get("normalized_score"),
                            weight=ind.get("weight", 1.0),
                        )
                    )

                dim_id = d["id"]
                if not isinstance(dim_id, int) or not 1 <= dim_id <= 6:
                    raise SerializationError(f"维度 ID 必须在 [1, 6] 范围内: {dim_id}")

                dimensions.append(
                    Dimension(
                        id=dim_id,
                        name=d["name"],
                        description=d.get("description", ""),
                        weight=d.get("weight", 1.0 / 6),
                        indicators=indicators,
                    )
                )

            return SixDimensionModel(dimensions=dimensions, name=name, description=description)

        except (KeyError, TypeError, ValueError) as e:
            raise SerializationError(f"数据格式错误: {e}") from e

    @staticmethod
    def to_json(model: SixDimensionModel, indent: int = 2, **kwargs: Any) -> str:
        """
        将模型序列化为 JSON 字符串

        Args:
            model: 六维模型实例
            indent: 缩进空格数
            **kwargs: 传递给 json.dumps 的额外参数

        Returns:
            str: JSON 字符串
        """
        return json.dumps(
            ModelSerializer.to_dict(model), ensure_ascii=False, indent=indent, **kwargs
        )

    @staticmethod
    def from_json(json_str: str) -> SixDimensionModel:
        """
        从 JSON 字符串反序列化为模型

        Args:
            json_str: JSON 字符串

        Returns:
            SixDimensionModel: 六维模型实例

        Raises:
            SerializationError: JSON 解析失败时
        """
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise SerializationError(f"JSON 解析失败: {e}") from e

        return ModelSerializer.from_dict(data)
