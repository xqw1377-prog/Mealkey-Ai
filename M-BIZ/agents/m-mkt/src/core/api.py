"""
M-MKT 餐饮市场机会分析引擎 — 主入口

提供两种使用方式：
1. 代码调用: from core import MKTEngine
2. 命令行:   python -m core.cli 品类 [城市] [--experience] [--capital]
"""

from __future__ import annotations

import json
from typing import Any

from .engine import EntrepreneurProfile, OpportunityDecision, OpportunityEngine
from .inference import InferenceResult, MKTInferencePipeline
from .knowledge.data import CATEGORY_MAP, CITY_MAP


class MKTEngine:
    """
    M-MKT 餐饮市场机会分析引擎 · 统一入口

    封装完整的六维模型评估流程，提供简洁的 API 接口。
    支持经典评分模式和多阶段知识推理模式。

    Usage:
        engine = MKTEngine()
        result = engine.analyze("咖啡", "上海")
        print(result.opportunity_score, result.opportunity_level)
    """

    def __init__(self) -> None:
        self._engine = OpportunityEngine()
        self._pipeline = MKTInferencePipeline()

    def analyze_v2(
        self,
        category: str,
        city: str | None = None,
        *,
        experience: str = "首次创业",
        capital_level: str = "medium",
        team_size: str = "small",
        mode: str = "default",
    ):
        """
        V2 管线模式 — 使用 RuntimePipeline

        相比 analyze() 增加 audit_trail 审计轨迹。

        Args:
            category: 品类名称
            city: 城市名称
            experience: 创业经验
            capital_level: 资金水平
            team_size: 团队规模
            mode: 管线模式 ("default" | "light")

        Returns:
            AnalysisResult: 包含 score_chain 审计轨迹
        """
        from .runtime import RuntimePipeline, AnalysisRequest

        if mode == "light":
            pipeline = RuntimePipeline.light()
        else:
            pipeline = RuntimePipeline.default()

        request = AnalysisRequest(
            category=category,
            city=city,
            experience=experience,
            capital_level=capital_level,
            team_size=team_size,
        )
        return pipeline.run(request)

    def analyze_v2_json(
        self,
        category: str,
        city: str | None = None,
        **kwargs,
    ) -> str:
        """V2 模式 JSON 输出"""
        import json
        result = self.analyze_v2(category, city, **kwargs)
        return json.dumps(result.to_dict(), ensure_ascii=False, indent=2)

    def analyze(
        self,
        category: str,
        city: str | None = None,
        *,
        experience: str = "首次创业",
        capital_level: str = "medium",
        team_size: str = "small",
    ) -> OpportunityDecision:
        """
        分析指定品类在目标城市的市场机会 (经典评分模式)

        Args:
            category: 品类名称
            city: 城市名称，可选
            experience: 创业经验
            capital_level: 资金水平
            team_size: 团队规模

        Returns:
            OpportunityDecision: 机会决策结果
        """
        entrepreneur = EntrepreneurProfile(
            experience=experience,
            capital_level=capital_level,
            team_size=team_size,
        )
        return self._engine.evaluate(
            category_name=category,
            city_name=city,
            entrepreneur=entrepreneur,
        )

    def analyze_json(
        self,
        category: str,
        city: str | None = None,
        **kwargs: Any,
    ) -> str:
        """分析并返回 JSON 字符串"""
        decision = self.analyze(category, city, **kwargs)
        return json.dumps(decision.to_dict(), ensure_ascii=False, indent=2)

    def analyze_deep(
        self,
        category: str,
        city: str | None = None,
        *,
        experience: str = "首次创业",
        capital_level: str = "medium",
        team_size: str = "small",
    ) -> InferenceResult:
        """
        深度分析 (多阶段知识推理模式)

        比 analyze() 增加:
        - 场景分析 (消费场景/价格带)
        - 案例知识抽取 (Decision Rules)
        - 行业模型匹配
        - 结构化方案生成

        Returns:
            InferenceResult: 完整的推理结果
        """
        return self._pipeline.run(
            category=category,
            city=city,
            experience=experience,
            capital_level=capital_level,
            team_size=team_size,
        )

    def analyze_deep_json(
        self,
        category: str,
        city: str | None = None,
        **kwargs: Any,
    ) -> str:
        """深度分析并返回 JSON 字符串"""
        result = self.analyze_deep(category, city, **kwargs)
        return json.dumps(result.to_dict(), ensure_ascii=False, indent=2)

    def list_categories(self) -> list[str]:
        """列出所有支持的品类"""
        return [c.name for c in CATEGORY_MAP.values()]

    def list_cities(self) -> list[str]:
        """列出所有支持的城市"""
        return [c.city for c in CITY_MAP.values()]

    def get_category_info(self, name: str) -> dict | None:
        """获取品类知识卡"""
        cat = CATEGORY_MAP.get(name)
        return cat.to_dict() if cat else None

    def get_city_info(self, name: str) -> dict | None:
        """获取城市画像"""
        city = CITY_MAP.get(name)
        return city.to_dict() if city else None
