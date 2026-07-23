from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .dimension_definitions import register_all as register_dimensions
from .knowledge import CaseStudy, CategoryKnowledge, CityProfile, RuleEngine
from .knowledge.data import (
    ALL_CASES,
    ALL_CATEGORIES,
    ALL_CITIES,
    CATEGORY_MAP,
    CITY_MAP,
    DEFAULT_RULES,
)
from .models import Dimension, Indicator, SixDimensionModel
from .registry import DimensionRegistry


@dataclass
class EntrepreneurProfile:
    experience: str = "首次创业"
    capital_level: str = "medium"
    team_size: str = "small"
    industry_background: str = ""
    risk_tolerance: str = "medium"


@dataclass
class OpportunityDecision:
    opportunity_score: float = 0.0
    opportunity_level: str = "低机会"
    model_summary: dict = field(default_factory=dict)
    category_info: dict | None = None
    city_info: dict | None = None
    related_cases: list[dict] = field(default_factory=list)
    rule_notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    positioning_suggestions: list[str] = field(default_factory=list)
    raw_score: float = 0.0
    dimension_details: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "opportunity_score": self.opportunity_score,
            "opportunity_level": self.opportunity_level,
            "raw_score": self.raw_score,
            "model_summary": self.model_summary,
            "category_info": self.category_info,
            "city_info": self.city_info,
            "related_cases": self.related_cases,
            "rule_notes": self.rule_notes,
            "warnings": self.warnings,
            "positioning_suggestions": self.positioning_suggestions,
            "dimension_details": self.dimension_details,
        }


# ─── 指标评分器 ───────────────────────────────────────────────────


class IndicatorScorer:
    """将知识资产映射到六维模型的 30 个指标评分"""

    @staticmethod
    def score_dim_1(cat: CategoryKnowledge | None, city: CityProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if cat is None:
            return {
                k: 2.5
                for k in [
                    "目标人口规模",
                    "品类市场渗透率",
                    "品类增长率",
                    "人均餐饮消费支出",
                    "市场规模天花板",
                ]
            }

        stage_map = {
            "创新期": (2.0, 2.5, 4.0),
            "增长期": (3.0, 3.0, 4.5),
            "快速增长期": (3.5, 3.0, 4.5),
            "成熟竞争期": (3.5, 4.0, 2.5),
            "红海竞争期": (4.0, 4.5, 1.5),
            "衰退期": (3.0, 3.5, 1.0),
        }
        pop, pen, growth = stage_map.get(cat.category_stage, (2.5, 3.0, 3.0))
        ind["目标人口规模"] = pop + (0.5 if city and city.tier in ("一线", "新一线") else 0)
        ind["品类市场渗透率"] = pen
        ind["品类增长率"] = growth

        tier_spend = {"一线": 4.0, "新一线": 3.5, "二线": 3.0, "三线": 2.5, "四线": 2.0}
        ind["人均餐饮消费支出"] = tier_spend.get(city.tier if city else "", 2.5)

        pos_map = {
            "全国化传统大品类": 3.0,
            "全国化高增长品类": 4.0,
            "餐饮第一大品类": 3.5,
            "年轻化高增长品类": 4.0,
            "上升期高潜力品类": 4.5,
            "刚需高频最大品类": 3.5,
            "高增长高潜力品类": 4.5,
            "高渗透高竞争品类": 3.0,
            "传统刚需大品类": 3.5,
        }
        ind["市场规模天花板"] = pos_map.get(cat.market_position, 2.5)
        return ind

    @staticmethod
    def score_dim_2(cat: CategoryKnowledge | None, city: CityProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if cat is None:
            return {
                k: 2.5
                for k in [
                    "品牌集中度 (CR5)",
                    "每万人餐厅保有量",
                    "品类同质化程度",
                    "头部品牌健康度",
                    "替代品类威胁度",
                ]
            }

        den_map = {"very_low": 4.5, "low": 4.0, "medium": 3.0, "high": 2.5, "very_high": 2.0}
        base_density = den_map.get(cat.competition.density, 3.0)
        ind["品牌集中度 (CR5)"] = (
            base_density - 0.3 if len(cat.competition.head_brands) >= 3 else base_density + 0.3
        )

        tier_density = {"一线": 2.0, "新一线": 2.5, "二线": 3.0, "三线": 3.5}
        ind["每万人餐厅保有量"] = tier_density.get(city.tier if city else "", 3.0)

        if "同质化" in cat.competition.problem:
            ind["品类同质化程度"] = 2.0
        else:
            ind["品类同质化程度"] = 3.5

        ind["头部品牌健康度"] = 3.0

        if cat.risk:
            threat = 0
            for r in cat.risk:
                if any(kw in r for kw in ["替代", "新品类", "跨界"]):
                    threat += 0.5
            ind["替代品类威胁度"] = max(1.0, 3.5 - threat)
        else:
            ind["替代品类威胁度"] = 3.5
        return ind

    @staticmethod
    def score_dim_3(cat: CategoryKnowledge | None, city: CityProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if cat is None:
            return {
                k: 2.5
                for k in [
                    "客群画像吻合度",
                    "客单价适配度",
                    "消费频次潜力",
                    "口味与偏好匹配",
                    "生活方式适配度",
                ]
            }

        ind["客群画像吻合度"] = 3.5
        if city:
            ps = city.consumer.get("price_sensitive", "medium")
            ps_map = {"very_low": 4.0, "low": 3.5, "medium": 3.0, "high": 2.5, "very_high": 2.0}
            ind["客单价适配度"] = ps_map.get(ps, 3.0)
        else:
            ind["客单价适配度"] = 3.0

        freq_stage = {
            "创新期": 2.0,
            "增长期": 3.0,
            "快速增长期": 3.5,
            "成熟竞争期": 4.0,
            "红海竞争期": 3.5,
            "衰退期": 2.0,
        }
        ind["消费频次潜力"] = freq_stage.get(cat.category_stage, 3.0)

        if city and cat.name in city.popular_categories:
            ind["口味与偏好匹配"] = 4.0
        else:
            ind["口味与偏好匹配"] = 2.5

        ind["生活方式适配度"] = 3.0
        return ind

    @staticmethod
    def score_dim_4(cat: CategoryKnowledge | None, city: CityProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if cat is None:
            return {
                k: 2.5
                for k in [
                    "供应链成熟度",
                    "人力资源可得性",
                    "物业租金水平",
                    "产品标准化程度",
                    "证照与合规门槛",
                ]
            }

        if cat.competition.problem and "供应链" in cat.competition.problem:
            ind["供应链成熟度"] = 2.5
        else:
            ind["供应链成熟度"] = 3.5

        tier_hr = {"一线": 2.5, "新一线": 3.0, "二线": 3.5, "三线": 4.0}
        ind["人力资源可得性"] = tier_hr.get(city.tier if city else "", 3.0)

        tier_rent = {"一线": 2.0, "新一线": 2.5, "二线": 3.0, "三线": 3.5}
        ind["物业租金水平"] = tier_rent.get(city.tier if city else "", 3.0)

        has_chef_dep = any("厨师依赖" in (f.name + f.description) for f in cat.failure_modes)
        ind["产品标准化程度"] = 2.5 if has_chef_dep else 3.5

        tier_reg = {"一线": 2.5, "新一线": 3.0, "二线": 3.5, "三线": 4.0}
        ind["证照与合规门槛"] = tier_reg.get(city.tier if city else "", 3.0)
        return ind

    @staticmethod
    def score_dim_5(e: EntrepreneurProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if e is None:
            return {
                k: 2.5
                for k in [
                    "品牌知名度与美誉度",
                    "产品力评分",
                    "单店模型成熟度",
                    "组织与人才储备",
                    "资金与资源储备",
                ]
            }

        exp_map = {"丰富": 3.5, "多次创业": 3.5, "首次创业": 2.5, "无经验": 2.0}
        ind["品牌知名度与美誉度"] = exp_map.get(e.experience, 2.5)
        ind["产品力评分"] = exp_map.get(e.experience, 2.5)

        exp_scores = {"丰富": 3.5, "多次创业": 3.0, "首次创业": 2.0, "无经验": 1.5}
        ind["单店模型成熟度"] = exp_scores.get(e.experience, 2.0)

        team_map = {"large": 4.0, "medium": 3.0, "small": 2.5, "solo": 2.0}
        ind["组织与人才储备"] = team_map.get(e.team_size, 2.5)

        cap_map = {"very_high": 4.5, "high": 4.0, "medium": 3.0, "low": 2.0, "very_low": 1.5}
        ind["资金与资源储备"] = cap_map.get(e.capital_level, 3.0)
        return ind

    @staticmethod
    def score_dim_6(cat: CategoryKnowledge | None, city: CityProfile | None) -> dict[str, float]:
        ind: dict[str, float] = {}
        if cat is None:
            return {
                k: 2.5
                for k in [
                    "政策支持度",
                    "消费趋势吻合度",
                    "经济环境韧性",
                    "技术变革影响",
                    "季节与气候适配",
                ]
            }

        tier_policy = {"一线": 3.0, "新一线": 3.5, "二线": 3.0, "三线": 2.5}
        growth_bonus = 0.5 if cat.category_stage in ("增长期", "快速增长期") else 0
        ind["政策支持度"] = tier_policy.get(city.tier if city else "", 2.5) + growth_bonus

        trend_match = 3.5 if cat.growth_direction else 2.5
        ind["消费趋势吻合度"] = trend_match

        staple_cats = ["快餐", "面馆", "小吃"]
        ind["经济环境韧性"] = 4.0 if cat.name in staple_cats else 3.0

        tech_risk = 0
        for r in cat.risk:
            if any(kw in r for kw in ["数字化", "自动化", "技术"]):
                tech_risk += 0.5
        ind["技术变革影响"] = max(1.5, 3.5 - tech_risk)

        season_risk = 0
        for r in cat.risk:
            if any(kw in r for kw in ["季节", "季节性"]):
                season_risk += 0.8
        ind["季节与气候适配"] = max(1.5, 3.5 - season_risk)
        return ind


# ─── V2 管线桥接 ──────────────────────────────────────────────────


@dataclass
class PipelineConfig:
    """管线配置"""
    mode: str = "default"  # "default" | "light"
    enable_case_match: bool = True
    case_match_strategy: str = "default"
    custom_stages: list | None = None


# ─── 引擎 ─────────────────────────────────────────────────────────


class OpportunityEngine:
    def __init__(self):
        register_dimensions()
        self.rule_engine = RuleEngine()
        self.rule_engine.add_rules(DEFAULT_RULES)

    def get_category(self, name: str) -> CategoryKnowledge | None:
        return CATEGORY_MAP.get(name)

    def get_city(self, name: str) -> CityProfile | None:
        return CITY_MAP.get(name)

    def list_categories(self) -> list[str]:
        return [c.name for c in ALL_CATEGORIES]

    def list_cities(self) -> list[str]:
        return [c.city for c in ALL_CITIES]

    def list_cases(self) -> list[str]:
        return [c.name for c in ALL_CASES]

    def get_related_cases(self, category: str, max_results: int = 3) -> list[CaseStudy]:
        matches = [c for c in ALL_CASES if c.category == category]
        return matches[:max_results]

    def _build_scored_model(
        self,
        category_name: str,
        cat: CategoryKnowledge | None,
        city: CityProfile | None,
        e: EntrepreneurProfile | None,
    ) -> SixDimensionModel:
        scorer = IndicatorScorer()
        dim_scores: dict[int, dict[str, float]] = {
            1: scorer.score_dim_1(cat, city),
            2: scorer.score_dim_2(cat, city),
            3: scorer.score_dim_3(cat, city),
            4: scorer.score_dim_4(cat, city),
            5: scorer.score_dim_5(e),
            6: scorer.score_dim_6(cat, city),
        }

        if DimensionRegistry.count() != 6:
            register_dimensions()

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

        model = SixDimensionModel(dimensions=dims, name=f"{category_name}市场机会评估")
        model.calculate_all()
        return model

    def _get_dimension_details(self, model: SixDimensionModel) -> list[dict]:
        details = []
        for dim in model.dimensions:
            indicators = []
            for ind in dim.indicators:
                indicators.append(
                    {
                        "name": ind.name,
                        "score": round(ind.normalized_score, 2)
                        if ind.normalized_score is not None
                        else None,
                        "weight": ind.weight,
                        "weighted_score": round(ind.get_weighted_score(), 2),
                    }
                )
            details.append(
                {
                    "id": dim.id,
                    "name": dim.name,
                    "score": round(dim.score, 2) if dim.score is not None else None,
                    "level": dim.get_level().value if dim.score is not None else None,
                    "weight": dim.weight,
                    "indicators": indicators,
                }
            )
        return details

    def _build_rule_context(
        self,
        cat: CategoryKnowledge | None,
        city: CityProfile | None,
        e: EntrepreneurProfile,
        related: list[CaseStudy],
    ) -> dict[str, Any]:
        context: dict[str, Any] = {
            "entrepreneur": {
                "experience": e.experience,
                "capital_level": e.capital_level,
                "team_size": e.team_size,
            },
        }
        if cat:
            context["category"] = cat.to_dict()
            context["has_failure_modes"] = len(cat.failure_modes) > 0
        if city:
            context["city"] = city.to_dict()
        context["has_similar_case"] = len(related) > 0

        if city and cat:
            in_popular = cat.name in city.popular_categories
            culture_match = (
                city.city in ("成都", "长沙") and cat.name in ("火锅", "湘菜", "烧烤")
            ) or in_popular
            context["city_popular_match"] = culture_match
        else:
            context["city_popular_match"] = False

        return context

    # ── V2 管线模式 ──

    def evaluate_v2(
        self,
        category_name: str,
        city_name: str | None = None,
        entrepreneur: EntrepreneurProfile | None = None,
        config: PipelineConfig | None = None,
    ):
        """
        V2 管线模式 — 使用 RuntimePipeline 替代 _build_scored_model

        输出包含审计轨迹 score_chain，与 V1 evaluate() 结果一致。
        """
        from .runtime import RuntimePipeline, AnalysisRequest

        cfg = config or PipelineConfig()
        if cfg.custom_stages:
            pipeline = RuntimePipeline()
            for stage in cfg.custom_stages:
                pipeline.add_stage(stage)
        elif cfg.mode == "light":
            pipeline = RuntimePipeline.light()
        else:
            pipeline = RuntimePipeline.default()

        request = AnalysisRequest(
            category=category_name,
            city=city_name,
            experience=entrepreneur.experience if entrepreneur else "首次创业",
            capital_level=entrepreneur.capital_level if entrepreneur else "medium",
            team_size=entrepreneur.team_size if entrepreneur else "small",
        )
        result = pipeline.run(request)

        # 转为 V1 兼容输出
        return OpportunityDecision(
            opportunity_score=result.opportunity_score,
            opportunity_level=result.opportunity_level,
            raw_score=result.raw_score,
            model_summary={
                "model_name": f"{category_name}市场机会评估",
                "dimensions": result.dimension_scores,
                "opportunity_score": result.opportunity_score,
                "opportunity_level": result.opportunity_level,
            },
            category_info=result.category_info,
            city_info=result.city_info,
            related_cases=result.matched_cases,
            rule_notes=result.rule_notes,
            warnings=result.warnings,
            positioning_suggestions=result.positioning_suggestions,
            dimension_details=[
                {"id": d.get("id"), "name": d.get("name"),
                 "score": d.get("score"), "indicators": []}
                for d in result.dimension_scores
            ],
        )

    # ── V1 兼容模式 ──

    def evaluate(
        self,
        category_name: str,
        city_name: str | None = None,
        entrepreneur: EntrepreneurProfile | None = None,
    ) -> OpportunityDecision:
        cat = self.get_category(category_name)
        city = self.get_city(city_name) if city_name else None
        if entrepreneur is None:
            entrepreneur = EntrepreneurProfile()

        model = self._build_scored_model(category_name, cat, city, entrepreneur)
        raw_score = model.get_opportunity_score()

        notes: list[str] = []
        warnings: list[str] = []
        suggestions: list[str] = []

        if cat:
            notes.append(f"品类阶段: {cat.category_stage}")
            notes.append(f"市场定位: {cat.market_position}")
            if cat.opportunity:
                suggestions.extend(cat.opportunity[:2])
            if cat.entry_advice.key_warnings:
                warnings.extend(cat.entry_advice.key_warnings)
        if city:
            notes.append(f"城市: {city.city}")
            if city.opportunities:
                suggestions.extend(city.opportunities[:2])

        related = self.get_related_cases(category_name)
        context = self._build_rule_context(cat, city, entrepreneur, related)
        adjusted_score, rule_notes = self.rule_engine.apply_score_adjustments(context, raw_score)

        rule_warnings = [w.replace("⚠ ", "") for w in rule_notes if w.startswith("⚠")]
        rule_notes_clean = [n for n in rule_notes if not n.startswith("⚠")]

        level = SixDimensionModel.get_opportunity_level(adjusted_score)

        return OpportunityDecision(
            opportunity_score=adjusted_score,
            opportunity_level=level,
            model_summary=model.summary(),
            category_info=cat.to_dict() if cat else None,
            city_info=city.to_dict() if city else None,
            related_cases=[c.to_dict() for c in related],
            rule_notes=notes + rule_notes_clean,
            warnings=warnings + rule_warnings,
            positioning_suggestions=suggestions,
            raw_score=round(raw_score, 2),
            dimension_details=self._get_dimension_details(model),
        )
