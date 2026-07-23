"""
Runtime Pipeline — M-MKT 统一运行时管线

消除 V1 中 OpportunityEngine 与 MKTInferencePipeline 的重复逻辑，
统一评分流程，增加审计轨迹和策略化评分。

Usage:
    from .runtime import RuntimePipeline, AnalysisRequest, PipelineConfig

    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海", experience="丰富"))
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol
import time


# ═══════════════════════════════════════════════════════════════
# 输入/输出
# ═══════════════════════════════════════════════════════════════

@dataclass
class AnalysisRequest:
    """统一分析请求 — 替代 V1 中分散的参数传递"""
    category: str
    city: str | None = None
    experience: str = "首次创业"
    capital_level: str = "medium"
    team_size: str = "small"

    def to_dict(self) -> dict[str, str | None]:
        return {
            "品类": self.category,
            "城市": self.city or "未指定",
            "创业经验": self.experience,
            "资金水平": self.capital_level,
            "团队规模": self.team_size,
        }


@dataclass
class ScoreAdjustment:
    """单次评分调整记录 — 用于审计轨迹"""
    rule_name: str
    delta: float
    reason: str
    before: float
    after: float
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        return {
            "rule": self.rule_name,
            "delta": round(self.delta, 2),
            "reason": self.reason,
            "before": round(self.before, 2),
            "after": round(self.after, 2),
        }


@dataclass
class AnalysisResult:
    """
    统一分析结果 — 合并 V1 的 OpportunityDecision + InferenceResult

    包含：
    - 评分：机会评分 + 等级 + 原始分 + 六维明细 + 30指标明细
    - 知识：品类 + 城市 + 匹配案例 + 价格带 + 场景
    - 建议：定位建议 + 战略建议 + 评估备注 + 风险警告
    - 审计：评分变化链（每次调整都记录）
    """
    # ── 评分 ──
    opportunity_score: float = 0.0
    opportunity_level: str = "低机会"
    raw_score: float = 0.0
    dimension_scores: list[dict] = field(default_factory=list)
    indicator_scores: dict[str, float] = field(default_factory=dict)

    # ── 知识资产 ──
    category_info: dict | None = None
    city_info: dict | None = None
    matched_cases: list[dict] = field(default_factory=list)
    price_band: dict | None = None
    scene_analysis: list[dict] = field(default_factory=list)

    # ── 建议与警告 ──
    positioning_suggestions: list[str] = field(default_factory=list)
    strategic_recommendations: list[str] = field(default_factory=list)
    rule_notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    risk_warnings: list[str] = field(default_factory=list)

    # ── 案例知识 ──
    case_references: list[dict] = field(default_factory=list)
    decision_rules_extracted: list[dict] = field(default_factory=list)

    # ── 审计轨迹 ──
    score_chain: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "opportunity_score": round(self.opportunity_score, 2),
            "opportunity_level": self.opportunity_level,
            "raw_score": round(self.raw_score, 2),
            "dimension_scores": self.dimension_scores,
            "category_info": self.category_info,
            "city_info": self.city_info,
            "matched_cases": self.matched_cases,
            "price_band": self.price_band,
            "scene_analysis": self.scene_analysis,
            "positioning_suggestions": self.positioning_suggestions,
            "strategic_recommendations": self.strategic_recommendations,
            "rule_notes": self.rule_notes,
            "warnings": self.warnings,
            "risk_warnings": self.risk_warnings,
            "case_references": self.case_references,
            "decision_rules_extracted": self.decision_rules_extracted,
            "score_chain": self.score_chain,
        }


# ═══════════════════════════════════════════════════════════════
# 管线上下文（阶段间共享）
# ═══════════════════════════════════════════════════════════════

@dataclass
class RuntimeContext:
    """贯穿管线全生命周期的共享上下文"""
    request: AnalysisRequest

    # Stage 2: 知识检索结果
    category: Any = None
    city: Any = None
    matched_cases: list = field(default_factory=list)
    price_band: Any = None
    scenes: list = field(default_factory=list)

    # Stage 3: 评分结果
    indicator_scores: dict = field(default_factory=dict)
    dimension_scores: dict = field(default_factory=dict)
    raw_score: float = 0.0
    adjusted_score: float = 0.0

    # Stage 4: 规则结果
    adjustments: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    notes: list = field(default_factory=list)

    # Stage 5: 方案
    suggestions: list = field(default_factory=list)
    strategic_recs: list = field(default_factory=list)
    risk_warnings: list = field(default_factory=list)

    # 全流程审计
    trace: list = field(default_factory=list)


@dataclass
class TraceEvent:
    """审计事件"""
    stage: str
    action: str
    detail: str
    meta: dict = field(default_factory=dict)
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# ═══════════════════════════════════════════════════════════════
# 阶段协议
# ═══════════════════════════════════════════════════════════════

class PipelineStage(Protocol):
    """管线阶段协议 — 每个阶段实现 execute(ctx)"""
    name: str

    def execute(self, ctx: RuntimeContext) -> None:
        ...


class PipelineObserver(Protocol):
    """管线观察者 — 用于日志/指标采集/调试"""
    def on_event(self, event: str, **data: Any) -> None:
        ...


# ═══════════════════════════════════════════════════════════════
# 管线编排器
# ═══════════════════════════════════════════════════════════════

class RuntimePipeline:
    """
    统一运行时管线

    注册式阶段管理，支持：
    - 按顺序执行阶段
    - 动态增删阶段
    - 观察者模式（日志/指标/调试）
    - 审计轨迹自动收集

    Usage:
        pipeline = RuntimePipeline()
        pipeline.add_stage(MyStage())
        result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    """

    def __init__(self):
        self._stages: list[PipelineStage] = []
        self._observers: list[PipelineObserver] = []

    # ── 阶段管理 ──

    def add_stage(self, stage: PipelineStage, index: int | None = None) -> None:
        """注册阶段，index=None 则追加到末尾"""
        if index is None:
            self._stages.append(stage)
        else:
            self._stages.insert(index, stage)

    def remove_stage(self, name: str) -> bool:
        """按名称移除已注册的阶段"""
        for i, s in enumerate(self._stages):
            if s.name == name:
                self._stages.pop(i)
                return True
        return False

    def get_stage(self, name: str) -> PipelineStage | None:
        """按名称查找阶段"""
        for s in self._stages:
            if s.name == name:
                return s
        return None

    def list_stages(self) -> list[str]:
        """列出所有已注册的阶段名"""
        return [s.name for s in self._stages]

    # ── 观察者管理 ──

    def add_observer(self, observer: PipelineObserver) -> None:
        self._observers.append(observer)

    def remove_observer(self, observer: PipelineObserver) -> None:
        self._observers.remove(observer)

    # ── 执行 ──

    def run(self, request: AnalysisRequest) -> AnalysisResult:
        """
        串行执行所有注册的阶段

        流程:
        1. 创建共享上下文
        2. 依次执行每个阶段
        3. 从上下文组装结果
        4. 返回 AnalysisResult
        """
        ctx = RuntimeContext(request=request)

        for stage in self._stages:
            self._notify("before_stage", stage=stage.name)
            try:
                stage.execute(ctx)
            except Exception as e:
                ctx.trace.append(TraceEvent(
                    stage=stage.name, action="error",
                    detail=f"阶段执行异常: {e}"
                ))
                raise
            self._notify("after_stage", stage=stage.name)

        return self._build_result(ctx)

    # ── 默认配置 ──

    @classmethod
    def default(cls) -> RuntimePipeline:
        """
        创建默认管线（兼容 V1 经典模式）

        阶段顺序: parse → retrieve → score → rules → solution
        """
        from .stages import (
            ParseStage,
            RetrieveStage,
            ScoreStage,
            RulesStage,
            SolutionStage,
        )
        pipeline = cls()
        pipeline.add_stage(ParseStage())
        pipeline.add_stage(RetrieveStage())
        pipeline.add_stage(ScoreStage())
        pipeline.add_stage(RulesStage())
        pipeline.add_stage(SolutionStage())
        return pipeline

    @classmethod
    def light(cls) -> RuntimePipeline:
        """
        轻量管线（仅评分+规则，无检索阶段）

        用于批量分析或不需要知识检索的场景
        """
        from .stages import (
            ParseStage,
            RetrieveStage,
            RetrieveConfig,
            ScoreStage,
            SolutionStage,
        )
        pipeline = cls()
        pipeline.add_stage(ParseStage())
        config = RetrieveConfig(enable_case_match=False)
        pipeline.add_stage(RetrieveStage(config=config))
        pipeline.add_stage(ScoreStage())
        pipeline.add_stage(SolutionStage())
        return pipeline

    # ── 内部方法 ──

    def _build_result(self, ctx: RuntimeContext) -> AnalysisResult:
        """从上下文组装 AnalysisResult"""
        # 构建评分变化链 — 统一格式：每条都有 action/value/reason
        score_chain: list[dict] = [
            {
                "action": "raw_score",
                "value": round(ctx.raw_score, 2),
                "reason": "六维加权计算",
            }
        ]
        for adj in ctx.adjustments:
            score_chain.append({
                "action": "adjust",
                "value": round(adj.after, 2),
                "reason": adj.reason,
                "rule": adj.rule_name,
                "delta": round(adj.delta, 2),
                "before": round(adj.before, 2),
                "after": round(adj.after, 2),
            })
        score_chain.append({
            "action": "final",
            "value": round(ctx.adjusted_score, 2),
            "reason": "规则调整完成",
        })

        result = AnalysisResult(
            opportunity_score=round(ctx.adjusted_score, 2),
            opportunity_level=self._get_level(ctx.adjusted_score),
            raw_score=round(ctx.raw_score, 2),
            dimension_scores=[
                {
                    "id": dim_id,
                    "name": self._dim_name(dim_id),
                    "score": round(score, 2),
                }
                for dim_id, score in sorted(ctx.dimension_scores.items())
            ],
            indicator_scores=ctx.indicator_scores,
            positioning_suggestions=ctx.suggestions,
            strategic_recommendations=ctx.strategic_recs,
            rule_notes=ctx.notes,
            warnings=ctx.warnings,
            risk_warnings=ctx.risk_warnings,
            score_chain=score_chain,
        )

        # 品类信息
        if ctx.category:
            result.category_info = ctx.category.to_dict()

        # 城市信息
        if ctx.city:
            result.city_info = ctx.city.to_dict()

        # 匹配案例
        for case, score in ctx.matched_cases[:3]:
            result.matched_cases.append({
                "name": case.name,
                "brand": case.brand,
                "category": case.category,
                "relevance": round(score, 1),
            })

        # 价格带
        if ctx.price_band:
            result.price_band = {
                "name": ctx.price_band.name,
                "range": ctx.price_band.range_desc,
                "chars": ctx.price_band.competitive_chars,
            }

        # 场景分析
        if ctx.scenes:
            result.scene_analysis = [
                {
                    "scene": s.scene_type,
                    "purpose": s.purpose,
                    "key_demand": s.key_demand,
                    "decision_factors": s.decision_factors,
                    "group_size": s.avg_group_size,
                }
                for s in ctx.scenes
            ]

        # 案例引用和决策规则
        seen_rules: set[str] = set()
        for case, _ in ctx.matched_cases[:5]:
            result.case_references.append({
                "name": case.name,
                "brand": case.brand,
                "category": case.category,
                "positioning": case.positioning,
                "principles": case.reusable_principles[:3],
            })
            for dr in case.decision_rules:
                key = dr.judgement + dr.recommendation
                if key not in seen_rules:
                    seen_rules.add(key)
                    result.decision_rules_extracted.append({
                        "conditions": str(dr.conditions),
                        "judgement": dr.judgement,
                        "recommendation": dr.recommendation,
                    })

        return result

    @staticmethod
    def _get_level(score: float) -> str:
        if score >= 3.5:
            return "高机会"
        if score >= 2.0:
            return "中机会"
        return "低机会"

    @staticmethod
    def _dim_name(dim_id: int) -> str:
        names = {1: "市场容量", 2: "竞争格局", 3: "消费适配",
                 4: "运营可行性", 5: "品牌势能", 6: "环境适配"}
        return names.get(dim_id, f"维度_{dim_id}")

    def _notify(self, event: str, **data: Any) -> None:
        for obs in self._observers:
            try:
                obs.on_event(event, **data)
            except Exception:
                pass  # 观察者异常不中断管线
