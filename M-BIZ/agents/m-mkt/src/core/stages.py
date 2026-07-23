"""
五阶段实现 — RuntimePipeline 的标准阶段

Stage 1: Parse     — 解析请求参数
Stage 2: Retrieve  — 知识检索（品类/城市/案例/价格带/场景）
Stage 3: Score     — 六维评分（30个指标 → 6个维度 → 综合评分）
Stage 4: Rules     — 规则引擎调整评分
Stage 5: Solution  — 方案生成（建议/案例引用/决策规则）
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .runtime import RuntimeContext, TraceEvent, ScoreAdjustment
from .knowledge.data import CATEGORY_MAP, CITY_MAP, ALL_CASES, DEFAULT_RULES


# ═══════════════════════════════════════════════════════════════
# Stage 1: Parse — 解析请求
# ═══════════════════════════════════════════════════════════════

class ParseStage:
    """
    解析阶段

    职责:
    1. 记录请求摘要到审计轨迹
    2. 验证输入（由入口层统一处理，此处只记录）
    """
    name = "parse"

    def execute(self, ctx: RuntimeContext) -> None:
        req = ctx.request
        detail = (
            f"品类={req.category}, 城市={req.city or '未指定'}, "
            f"经验={req.experience}, 资金={req.capital_level}, "
            f"团队={req.team_size}"
        )
        ctx.trace.append(TraceEvent(
            stage=self.name, action="request", detail=detail,
            meta=req.to_dict(),
        ))


# ═══════════════════════════════════════════════════════════════
# Stage 2: Retrieve — 知识检索
# ═══════════════════════════════════════════════════════════════

@dataclass
class RetrieveConfig:
    """检索阶段配置"""
    enable_case_match: bool = True
    enable_price_band: bool = True
    enable_scene_analysis: bool = True
    max_cases: int = 5
    case_match_strategy: str = "default"  # "default" | "multi_dim"


class RetrieveStage:
    """
    知识检索阶段

    职责:
    1. 查品类知识卡 (CATEGORY_MAP)
    2. 查城市画像 (CITY_MAP)
    3. 案例匹配（支持策略切换）
    4. 价格带推断
    5. 消费场景推断
    """
    name = "retrieve"

    def __init__(self, config: RetrieveConfig | None = None):
        self.config = config or RetrieveConfig()

    def execute(self, ctx: RuntimeContext) -> None:
        # 1. 品类知识卡
        ctx.category = CATEGORY_MAP.get(ctx.request.category)
        ctx.trace.append(TraceEvent(
            stage=self.name, action="category",
            detail=f"品类={ctx.request.category}, 找到={ctx.category is not None}",
        ))

        # 2. 城市画像
        if ctx.request.city:
            ctx.city = CITY_MAP.get(ctx.request.city)
            ctx.trace.append(TraceEvent(
                stage=self.name, action="city",
                detail=f"城市={ctx.request.city}, 找到={ctx.city is not None}",
            ))

        # 3. 案例匹配
        if self.config.enable_case_match:
            ctx.matched_cases = self._match_cases(ctx)
            ctx.trace.append(TraceEvent(
                stage=self.name, action="cases",
                detail=f"匹配到 {len(ctx.matched_cases)} 个相关案例",
            ))

        # 4. 价格带
        if self.config.enable_price_band and ctx.category:
            ctx.price_band = self._estimate_price_band(ctx.category.name)

        # 5. 消费场景
        if self.config.enable_scene_analysis and ctx.category:
            ctx.scenes = self._estimate_scenes(ctx.category.name)

    def _match_cases(self, ctx: RuntimeContext) -> list[tuple[Any, float]]:
        """案例匹配 — 支持策略切换"""
        if self.config.case_match_strategy == "multi_dim":
            return self._multi_dim_match(ctx)
        return self._default_match(ctx)

    @staticmethod
    def _default_match(ctx: RuntimeContext) -> list[tuple[Any, float]]:
        """
        默认匹配策略 — 兼容 V1（仅品类名精确匹配）
        """
        scored: list[tuple[Any, float]] = []
        cat_name = ctx.request.category
        for case in ALL_CASES:
            score = 0.0
            if case.category == cat_name:
                score += 2.0
            elif cat_name and case.category and cat_name in case.category:
                score += 1.0
            if score > 0:
                scored.append((case, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    @staticmethod
    def _multi_dim_match(ctx: RuntimeContext) -> list[tuple[Any, float]]:
        """
        多维匹配策略 — V2 新增

        匹配维度:
        - 品类名精确匹配 (+2.0)
        - 品类名包含匹配 (+1.0)
        - 城市相同 (+1.0)
        - 标签重叠 (+0.5/个)
        - 品类阶段相同 (+0.5)
        """
        cat_name = ctx.request.category
        city_name = ctx.request.city
        stage = ctx.category.category_stage if ctx.category else None
        cat_tags = set(ctx.category.tags) if ctx.category else set()

        scored: list[tuple[Any, float]] = []
        for case in ALL_CASES:
            score = 0.0

            # 品类匹配
            if case.category == cat_name:
                score += 2.0
            elif cat_name and case.category and cat_name in case.category:
                score += 1.0

            # 城市匹配
            if city_name and case.city and city_name in case.city:
                score += 1.0

            # 标签重叠
            tag_overlap = len(cat_tags & set(case.tags))
            if tag_overlap > 0:
                score += 0.5 * tag_overlap

            if score > 0:
                scored.append((case, round(score, 1)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    @staticmethod
    def _estimate_price_band(category_name: str) -> Any | None:
        """价格带推断 — 兼容 V1"""
        from .knowledge.models import find_price_band
        mapping = {
            "火锅": find_price_band(80), "咖啡": find_price_band(25),
            "茶饮": find_price_band(15), "快餐": find_price_band(25),
            "面馆": find_price_band(20), "烘焙": find_price_band(25),
            "烧烤": find_price_band(70), "湘菜": find_price_band(60),
            "日料": find_price_band(120), "西餐": find_price_band(120),
        }
        return mapping.get(category_name)

    @staticmethod
    def _estimate_scenes(category_name: str) -> list:
        """消费场景推断 — 兼容 V1"""
        from .knowledge.models import CONSUMER_SCENES
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


# ═══════════════════════════════════════════════════════════════
# Stage 3: Score — 六维评分
# ═══════════════════════════════════════════════════════════════

class ScoreStage:
    """
    评分阶段

    职责:
    1. 使用评分策略计算30个指标得分
    2. 构建 SixDimensionModel
    3. 计算维度得分和综合评分 (raw_score)
    4. 记录审计轨迹
    """
    name = "score"

    def __init__(self, strategy=None):
        """strategy: ScoringStrategy 实例，默认使用 BuiltInScoringStrategy"""
        self.strategy = strategy or BuiltInScoringStrategy()

    def execute(self, ctx: RuntimeContext) -> None:
        from .dimension_definitions import register_all as reg_dims
        from .registry import DimensionRegistry
        from .models import Dimension, Indicator, SixDimensionModel

        # 确保维度已注册
        if DimensionRegistry.count() != 6:
            reg_dims()

        # 1. 用策略计算30个指标
        ctx.indicator_scores = self.strategy.score_all(
            category=ctx.category,
            city=ctx.city,
            entrepreneur=ctx.request,
        )

        # 2. 构建维度列表
        dims: list[Dimension] = []
        for dim_id in range(1, 7):
            template = DimensionRegistry.get(dim_id)
            if template is None:
                continue
            indicators = [
                Indicator(
                    name=ind["name"],
                    description=ind.get("description", ""),
                    normalized_score=ctx.indicator_scores.get(ind["name"], 2.5),
                    weight=ind.get("weight", 1.0),
                )
                for ind in template.indicators
            ]
            dims.append(Dimension(
                id=dim_id, name=template.name,
                description=template.description,
                weight=template.weight, indicators=indicators,
            ))

        # 3. 计算评分
        model = SixDimensionModel(
            dimensions=dims,
            name=f"{ctx.request.category}市场机会评估",
        )
        model.calculate_all()
        ctx.raw_score = model.get_opportunity_score()
        ctx.adjusted_score = ctx.raw_score  # 初始等同，规则阶段调整

        # 记录维度得分
        ctx.dimension_scores = {d.id: d.score for d in model.dimensions}

        # 审计
        ctx.trace.append(TraceEvent(
            stage=self.name, action="score_set",
            detail=f"原始评分={ctx.raw_score:.2f}",
            meta={
                "raw_score": ctx.raw_score,
                "dimension_scores": {str(k): round(v, 2) for k, v in ctx.dimension_scores.items()},
                "indicator_count": len(ctx.indicator_scores),
            },
        ))


class BuiltInScoringStrategy:
    """
    内置评分策略 — 兼容 V1 IndicatorScorer 逻辑

    将 IndicatorScorer 的6个静态方法封装为策略对象，
    确保 V2 输出与 V1 完全一致。
    """

    def score_all(
        self,
        category: Any,
        city: Any,
        entrepreneur: Any,
    ) -> dict[str, float]:
        """计算全部30个指标"""
        from .engine import IndicatorScorer

        scorer = IndicatorScorer()
        result: dict[str, float] = {}

        # 将 AnalysisRequest 转为 V1 的 EntrepreneurProfile
        ep = self._to_entrepreneur_profile(entrepreneur)

        result.update(scorer.score_dim_1(category, city))
        result.update(scorer.score_dim_2(category, city))
        result.update(scorer.score_dim_3(category, city))
        result.update(scorer.score_dim_4(category, city))
        result.update(scorer.score_dim_5(ep))
        result.update(scorer.score_dim_6(category, city))
        return result

    @staticmethod
    def _to_entrepreneur_profile(request) -> Any:
        """将 AnalysisRequest 转为 V1 EntrepreneurProfile 兼容对象"""
        from .engine import EntrepreneurProfile

        if isinstance(request, EntrepreneurProfile):
            return request
        return EntrepreneurProfile(
            experience=request.experience,
            capital_level=request.capital_level,
            team_size=request.team_size,
        )


# ═══════════════════════════════════════════════════════════════
# Stage 4: Rules — 规则推理
# ═══════════════════════════════════════════════════════════════

class RulesStage:
    """
    规则阶段

    职责:
    1. 统一构建规则上下文（消除 V1 两份重复代码）
    2. 执行规则引擎
    3. 记录每次评分调整到 ScoreAdjustment 列表
    4. 记录审计轨迹
    """
    name = "rules"

    def __init__(self, rule_engine=None):
        from .knowledge.rules import RuleEngine

        self.rule_engine = rule_engine or RuleEngine()
        # 仅在没有规则时加载默认规则
        if len(self.rule_engine.list_rules()) == 0:
            self.rule_engine.add_rules(DEFAULT_RULES)

    def execute(self, ctx: RuntimeContext) -> None:
        from .knowledge.rules import ActionType

        # 1. 统一构建规则上下文
        context = self._build_context(ctx)

        # 2. 应用规则
        results = self.rule_engine.evaluate(context)
        score = ctx.raw_score

        for r in results:
            for action in r.actions:
                before = score

                if action.type == ActionType.ADJUST_SCORE:
                    delta = action.params.get("delta", 0)
                    score += delta
                    reason = action.params.get("reason", "规则评分调整")
                    ctx.adjustments.append(ScoreAdjustment(
                        rule_name=r.rule_name, delta=delta,
                        reason=reason, before=before, after=score,
                    ))
                    ctx.notes.append(f"{reason} ({delta:+.1f})")
                    ctx.trace.append(TraceEvent(
                        stage=self.name, action="score_adjust",
                        detail=f"规则'{r.rule_name}': {reason} ({delta:+.1f})",
                        meta={"rule": r.rule_name, "delta": delta,
                              "before": before, "after": score},
                    ))

                elif action.type == ActionType.BLOCK_OPPORTUNITY:
                    score = 0.0
                    reason = action.params.get("reason", "机会被阻断")
                    ctx.adjustments.append(ScoreAdjustment(
                        rule_name=r.rule_name, delta=-before,
                        reason=reason, before=before, after=0.0,
                    ))
                    ctx.trace.append(TraceEvent(
                        stage=self.name, action="score_block",
                        detail=f"规则'{r.rule_name}': {reason}",
                    ))

                elif action.type == ActionType.ADD_WARNING:
                    w = action.params.get("warning", "")
                    ctx.warnings.append(w)
                    ctx.trace.append(TraceEvent(
                        stage=self.name, action="warning",
                        detail=f"规则'{r.rule_name}': {w}",
                    ))

                elif action.type == ActionType.ADD_NOTE:
                    note = action.params.get("note", "")
                    ctx.notes.append(note)

                elif action.type == ActionType.SUGGEST_POSITIONING:
                    suggestion = action.params.get("suggestion", "")
                    if suggestion:
                        ctx.suggestions.append(suggestion)

        # 限幅
        ctx.adjusted_score = max(0.0, min(5.0, round(score, 2)))

        # 记录品类/城市备注
        if ctx.category:
            ctx.notes.insert(0, f"品类阶段: {ctx.category.category_stage}")
            ctx.notes.insert(1, f"市场定位: {ctx.category.market_position}")
        if ctx.city:
            ctx.notes.insert(0, f"城市: {ctx.city.city}")

        ctx.trace.append(TraceEvent(
            stage=self.name, action="score_final",
            detail=f"最终评分={ctx.adjusted_score:.2f}, 触发{len(ctx.adjustments)}次调整",
            meta={
                "adjusted_score": ctx.adjusted_score,
                "adjustments": len(ctx.adjustments),
            },
        ))

    @staticmethod
    def _build_context(ctx: RuntimeContext) -> dict[str, Any]:
        """
        统一构建规则上下文

        消除 V1 中 engine.py 的 _build_rule_context 和
        inference.py 的 _stage4_rules 两份重复代码
        """
        context: dict[str, Any] = {
            "entrepreneur": {
                "experience": ctx.request.experience,
                "capital_level": ctx.request.capital_level,
                "team_size": ctx.request.team_size,
            },
        }

        if ctx.category:
            context["category"] = ctx.category.to_dict()
            context["has_failure_modes"] = len(ctx.category.failure_modes) > 0

        if ctx.city:
            context["city"] = ctx.city.to_dict()

        context["has_similar_case"] = len(ctx.matched_cases) > 0

        if ctx.city and ctx.category:
            in_popular = ctx.category.name in ctx.city.popular_categories
            culture_match = (
                ctx.city.city in ("成都", "长沙")
                and ctx.category.name in ("火锅", "湘菜", "烧烤")
            ) or in_popular
            context["city_popular_match"] = culture_match
        else:
            context["city_popular_match"] = False

        return context


# ═══════════════════════════════════════════════════════════════
# Stage 5: Solution — 方案生成
# ═══════════════════════════════════════════════════════════════

class SolutionStage:
    """
    方案生成阶段

    职责:
    1. 收集品类/城市建议
    2. 生成战略建议（基于评分等级）
    3. 整合风险警告
    """
    name = "solution"

    def execute(self, ctx: RuntimeContext) -> None:
        # 1. 品类建议
        if ctx.category:
            if ctx.category.opportunity:
                ctx.suggestions.extend(ctx.category.opportunity[:3])
            if ctx.category.entry_advice.key_warnings:
                ctx.risk_warnings.extend(ctx.category.entry_advice.key_warnings)
            if ctx.category.entry_advice.recommended_positioning:
                ctx.suggestions.extend(ctx.category.entry_advice.recommended_positioning[:2])

        # 2. 城市建议
        if ctx.city and ctx.city.opportunities:
            ctx.suggestions.extend(ctx.city.opportunities[:2])

        # 3. 评分等级建议
        if ctx.adjusted_score >= 3.5:
            ctx.strategic_recs.append("市场机会较高，建议制定详细进入计划并优先配置资源")
        elif ctx.adjusted_score >= 2.0:
            ctx.strategic_recs.append("市场机会中等，建议细化差异化策略或寻找更优切入点")
        else:
            ctx.strategic_recs.append("市场机会偏低，建议重新评估品类选择或大幅调整策略")

        # 4. 价格带建议
        if ctx.price_band:
            ctx.strategic_recs.append(
                f"目标价格带: {ctx.price_band.name} ({ctx.price_band.range_desc}) — "
                f"{ctx.price_band.competitive_chars}"
            )

        # 5. 案例建议
        for case, _ in ctx.matched_cases[:2]:
            if case.reusable_principles:
                ctx.strategic_recs.extend(case.reusable_principles[:2])

        ctx.trace.append(TraceEvent(
            stage=self.name, action="solution",
            detail=(
                f"生成 {len(ctx.suggestions)} 条定位建议, "
                f"{len(ctx.strategic_recs)} 条战略建议, "
                f"{len(ctx.risk_warnings)} 条风险警告"
            ),
        ))
