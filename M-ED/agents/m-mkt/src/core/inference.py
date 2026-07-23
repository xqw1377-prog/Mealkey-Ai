"""
M-MKT 多阶段推理管线

Stage 1: 项目理解 (Parse project profile)
Stage 2: 知识检索 (Retrieve knowledge assets)
Stage 3: 六维评分 (6-dimension scoring)
Stage 4: 规则推理 (Rule engine reasoning)
Stage 5: 方案生成 (Solution generation)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .dimension_definitions import SixDimensionModel
from .dimension_definitions import register_all as _reg_dims
from .engine import EntrepreneurProfile, IndicatorScorer
from .knowledge.data import CATEGORY_MAP, CITY_MAP, DEFAULT_RULES
from .knowledge.models import (
    CONSUMER_SCENES,
    ConsumerScene,
    PriceBand,
    find_price_band,
)
from .knowledge.retriever import KnowledgeRetriever, RetrievalResult
from .knowledge.rules import RuleEngine
from .models import Dimension, Indicator
from .registry import DimensionRegistry


@dataclass
class InferenceConfig:
    enable_retrieval: bool = True
    enable_scoring: bool = True
    enable_rules: bool = True
    enable_scene_analysis: bool = True
    max_cases: int = 5


@dataclass
class InferenceResult:
    # Stage 1: 项目理解
    project_summary: dict[str, str] = field(default_factory=dict)
    # Stage 2: 知识检索
    knowledge: RetrievalResult | None = None
    scene_analysis: list[dict[str, Any]] = field(default_factory=list)
    price_band: PriceBand | None = None
    # Stage 3: 评分
    opportunity_score: float = 0.0
    opportunity_level: str = "低机会"
    dimension_scores: list[dict[str, Any]] = field(default_factory=list)
    # Stage 4: 规则推理
    rule_notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    raw_score: float = 0.0
    # Stage 5: 方案
    strategic_recommendations: list[str] = field(default_factory=list)
    positioning_suggestions: list[str] = field(default_factory=list)
    case_references: list[dict[str, Any]] = field(default_factory=list)
    decision_rules_extracted: list[dict[str, str]] = field(default_factory=list)
    risk_warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "project_summary": self.project_summary,
            "opportunity_score": self.opportunity_score,
            "opportunity_level": self.opportunity_level,
            "raw_score": self.raw_score,
            "dimension_scores": self.dimension_scores,
            "market_tags": self.knowledge.market_tags if self.knowledge else [],
            "opportunity_tags": self.knowledge.opportunity_tags if self.knowledge else [],
            "price_band": {"name": self.price_band.name, "range": self.price_band.range_desc}
            if self.price_band
            else None,
            "scene_analysis": self.scene_analysis,
            "strategic_recommendations": self.strategic_recommendations,
            "positioning_suggestions": self.positioning_suggestions,
            "case_references": self.case_references,
            "decision_rules_extracted": self.decision_rules_extracted,
            "rule_notes": self.rule_notes,
            "warnings": self.warnings,
            "risk_warnings": self.risk_warnings,
        }


def estimate_price_band_for_category(category_name: str) -> PriceBand | None:
    cat = CATEGORY_MAP.get(category_name)
    if cat is None:
        return None
    mapping = {
        "火锅": find_price_band(80),
        "咖啡": find_price_band(25),
        "茶饮": find_price_band(15),
        "快餐": find_price_band(25),
        "面馆": find_price_band(20),
        "烘焙": find_price_band(25),
        "烧烤": find_price_band(70),
        "湘菜": find_price_band(60),
        "日料": find_price_band(120),
        "西餐": find_price_band(120),
    }
    return mapping.get(category_name)


def estimate_scenes_for_category(category_name: str) -> list[ConsumerScene]:
    scene_map: dict[str, list[str]] = {
        "火锅": ["朋友社交", "家庭聚餐"],
        "咖啡": ["一人食", "下午茶", "外卖场景"],
        "茶饮": ["下午茶", "外卖场景", "夜宵"],
        "快餐": ["一人食", "外卖场景"],
        "面馆": ["一人食", "外卖场景"],
        "烘焙": ["下午茶", "早餐"],
        "烧烤": ["朋友社交", "夜宵", "家庭聚餐"],
        "湘菜": ["朋友社交", "家庭聚餐"],
        "日料": ["朋友社交", "商务宴请"],
        "西餐": ["朋友社交", "商务宴请"],
    }
    scenes = scene_map.get(category_name, ["一人食", "朋友社交"])
    return [s for s in CONSUMER_SCENES if s.scene_type in scenes]


class MKTInferencePipeline:
    def __init__(self, config: InferenceConfig | None = None) -> None:
        self.config = config or InferenceConfig()
        _reg_dims()
        self.retriever = KnowledgeRetriever()
        self.rule_engine = RuleEngine()
        self.rule_engine.add_rules(DEFAULT_RULES)

    def run(
        self,
        category: str,
        city: str | None = None,
        *,
        experience: str = "首次创业",
        capital_level: str = "medium",
        team_size: str = "small",
    ) -> InferenceResult:
        entrepreneur = EntrepreneurProfile(
            experience=experience,
            capital_level=capital_level,
            team_size=team_size,
        )
        result = InferenceResult()

        # Stage 1: 项目理解
        result.project_summary = self._stage1_understand(category, city, entrepreneur)

        # Stage 2: 知识检索
        if self.config.enable_retrieval:
            result.knowledge = self._stage2_retrieve(category, city)
            self._stage2_scene_analysis(result)

        # Stage 3: 六维评分
        if self.config.enable_scoring:
            self._stage3_score(result, category, city, entrepreneur)

        # Stage 4: 规则推理
        if self.config.enable_rules and result.knowledge:
            self._stage4_rules(result, entrepreneur)

        # Stage 5: 方案生成
        self._stage5_solution(result)

        return result

    def _stage1_understand(
        self,
        category: str,
        city: str | None,
        entrepreneur: EntrepreneurProfile,
    ) -> dict[str, str]:
        summary: dict[str, str] = {
            "品类": category,
            "城市": city or "未指定",
            "创业经验": entrepreneur.experience,
            "资金水平": entrepreneur.capital_level,
            "团队规模": entrepreneur.team_size,
        }
        return summary

    def _stage2_retrieve(self, category: str, city: str | None) -> RetrievalResult:
        return self.retriever.retrieve(category, city)

    def _stage2_scene_analysis(self, result: InferenceResult) -> None:
        if result.knowledge is None or result.knowledge.category is None:
            return

        cat_name = result.knowledge.category.name
        result.price_band = estimate_price_band_for_category(cat_name)

        if self.config.enable_scene_analysis:
            scenes = estimate_scenes_for_category(cat_name)
            result.scene_analysis = [
                {
                    "scene": s.scene_type,
                    "purpose": s.purpose,
                    "key_demand": s.key_demand,
                    "decision_factors": s.decision_factors,
                    "group_size": s.avg_group_size,
                }
                for s in scenes
            ]

    def _stage3_score(
        self,
        result: InferenceResult,
        category: str,
        city: str | None,
        entrepreneur: EntrepreneurProfile,
    ) -> None:
        cat = CATEGORY_MAP.get(category) if category else None
        city_obj = CITY_MAP.get(city) if city else None

        if DimensionRegistry.count() != 6:
            _reg_dims()

        scorer = IndicatorScorer()
        dim_scores: dict[int, dict[str, float]] = {
            1: scorer.score_dim_1(cat, city_obj),
            2: scorer.score_dim_2(cat, city_obj),
            3: scorer.score_dim_3(cat, city_obj),
            4: scorer.score_dim_4(cat, city_obj),
            5: scorer.score_dim_5(entrepreneur),
            6: scorer.score_dim_6(cat, city_obj),
        }

        dims: list[Dimension] = []
        for dim_id in range(1, 7):
            template = DimensionRegistry.get(dim_id)
            if template is None:
                continue
            scores = dim_scores.get(dim_id, {})
            indicators = [
                Indicator(
                    name=ind["name"],
                    description=ind.get("description", ""),
                    normalized_score=scores.get(ind["name"], 2.5),
                    weight=ind.get("weight", 1.0),
                )
                for ind in template.indicators
            ]
            dims.append(
                Dimension(
                    id=dim_id,
                    name=template.name,
                    description=template.description,
                    weight=template.weight,
                    indicators=indicators,
                )
            )

        model = SixDimensionModel(dimensions=dims, name=f"{category}市场机会评估")
        model.calculate_all()
        raw_score = model.get_opportunity_score()

        result.raw_score = round(raw_score, 2)
        result.opportunity_score = raw_score
        result.opportunity_level = SixDimensionModel.get_opportunity_level(raw_score)

        result.dimension_scores = [
            {
                "id": d.id,
                "name": d.name,
                "score": round(d.score, 2) if d.score is not None else None,
                "level": d.get_level().value if d.score is not None else None,
                "weight": d.weight,
                "indicators": [
                    {
                        "name": ind.name,
                        "score": round(ind.normalized_score, 2)
                        if ind.normalized_score is not None
                        else None,
                        "weight": ind.weight,
                    }
                    for ind in d.indicators
                ],
            }
            for d in model.dimensions
        ]

    def _stage4_rules(
        self,
        result: InferenceResult,
        entrepreneur: EntrepreneurProfile,
    ) -> None:
        cat = result.knowledge.category if result.knowledge else None
        city_obj = result.knowledge.city if result.knowledge else None
        related_cases = result.knowledge.top_cases if result.knowledge else []

        context: dict[str, Any] = {
            "entrepreneur": {
                "experience": entrepreneur.experience,
                "capital_level": entrepreneur.capital_level,
                "team_size": entrepreneur.team_size,
            },
        }
        if cat:
            context["category"] = cat.to_dict()
            context["has_failure_modes"] = len(cat.failure_modes) > 0
        if city_obj:
            context["city"] = city_obj.to_dict()
        context["has_similar_case"] = len(related_cases) > 0

        if city_obj and cat:
            in_popular = cat.name in city_obj.popular_categories
            culture_match = (
                city_obj.city in ("成都", "长沙") and cat.name in ("火锅", "湘菜", "烧烤")
            ) or in_popular
            context["city_popular_match"] = culture_match
        else:
            context["city_popular_match"] = False

        adjusted, notes = self.rule_engine.apply_score_adjustments(context, result.raw_score)
        result.opportunity_score = adjusted
        result.opportunity_level = SixDimensionModel.get_opportunity_level(adjusted)

        rule_warnings = [w.replace("⚠ ", "") for w in notes if w.startswith("⚠")]
        result.rule_notes = [n for n in notes if not n.startswith("⚠")]
        result.warnings = rule_warnings

    def _stage5_solution(self, result: InferenceResult) -> None:
        recs: list[str] = []
        warns: list[str] = []
        suggestions: list[str] = []
        cases_out: list[dict[str, Any]] = []
        rules_out: list[dict[str, str]] = []

        if result.knowledge and result.knowledge.category:
            cat = result.knowledge.category
            if cat.opportunity:
                suggestions.extend(cat.opportunity[:3])
            if cat.entry_advice.key_warnings:
                warns.extend(cat.entry_advice.key_warnings)
            if cat.entry_advice.recommended_positioning:
                suggestions.extend(cat.entry_advice.recommended_positioning[:2])

        if result.knowledge and result.knowledge.city:
            city = result.knowledge.city
            if city.opportunities:
                suggestions.extend(city.opportunities[:2])

        if result.knowledge and result.knowledge.matched_cases:
            seen_names: set[str] = set()
            for case, rel_score in result.knowledge.matched_cases[: self.config.max_cases]:
                if case.name in seen_names:
                    continue
                seen_names.add(case.name)
                cases_out.append(
                    {
                        "name": case.name,
                        "brand": case.brand,
                        "category": case.category,
                        "positioning": case.positioning,
                        "relevance_score": round(rel_score, 1),
                        "principles": case.reusable_principles[:3],
                    }
                )
                for dr in case.decision_rules:
                    rules_out.append(
                        {
                            "conditions": str(dr.conditions),
                            "judgement": dr.judgement,
                            "recommendation": dr.recommendation,
                        }
                    )
                if case.reusable_principles:
                    recs.extend(case.reusable_principles[:2])

        if result.opportunity_score >= 3.5:
            recs.append("市场机会较高，建议制定详细进入计划并优先配置资源")
        elif result.opportunity_score >= 2.0:
            recs.append("市场机会中等，建议细化差异化策略或寻找更优切入点")
        else:
            recs.append("市场机会偏低，建议重新评估品类选择或大幅调整策略")

        if result.price_band:
            recs.append(
                f"目标价格带: {result.price_band.name} ({result.price_band.range_desc}) — {result.price_band.competitive_chars}"
            )

        result.strategic_recommendations = recs
        result.positioning_suggestions = suggestions
        result.case_references = cases_out
        result.decision_rules_extracted = rules_out
        result.risk_warnings = warns
