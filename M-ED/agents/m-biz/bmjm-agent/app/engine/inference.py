"""推理引擎 - 核心推理流程编排"""

import time
import structlog
from typing import Optional
from app.models.enums import Severity, Priority, DIMENSIONS
from app.models.schemas import (
    JudgeRequest, JudgeResponseData, DimensionScore, OverallHealth,
    BenchmarkingResult, RiskAlert, StrategicSuggestion, EvidenceChainItem, Metadata,
)
from app.models.ecc_schemas import CouncilReport
from app.engine.rules import RuleEngine
from app.engine.scoring import ScoringEngine
from app.engine.benchmarking import BenchmarkingEngine
from app.engine.profiling import ProfilingEngine
from app.engine.verification import VerificationEngine
from app.engine.committee import CouncilChair
from app.engine.knowledge_loader import load_rules, load_benchmarks, load_profiles

logger = structlog.get_logger()


class InferenceEngine:
    """核心推理引擎 - 编排完整的判断流程"""

    def __init__(self):
        # 加载知识资产
        rules = load_rules()
        benchmarks = load_benchmarks()
        profiles = load_profiles()

        # 初始化子引擎
        self.rule_engine = RuleEngine(rules)
        self.scoring_engine = ScoringEngine()
        self.benchmarking_engine = BenchmarkingEngine(benchmarks)
        self.profiling_engine = ProfilingEngine(profiles)
        self.verification_engine = VerificationEngine()
        self.council_chair = CouncilChair()

        self.model_version = "1.0"
        logger.info("inference engine initialized")

    # ---------------------------------------------------------------
    # 公共方法：ECC 只应调用这三个分层方法，不碰私有属性和方法
    # ---------------------------------------------------------------

    def judge_l2(self, bm_data: dict, industry: str, stage: str) -> dict:
        """L2 规则认知 — 返回 {triggered_rules, metrics, rule_ids}"""
        metrics = self.rule_engine.extract_metrics(bm_data, stage=stage)

        # 注入行业对标派生指标
        industry_benchmark = self.benchmarking_engine.get_benchmark(industry)
        if industry_benchmark and metrics.get("cac", 0) > 0:
            bm_cac = industry_benchmark.get("metrics", {}).get("cac", {}).get("avg")
            if bm_cac and bm_cac > 0:
                metrics["cac_vs_industry_ratio"] = metrics["cac"] / bm_cac

        triggered_rules = self.rule_engine.match_rules(metrics)
        rule_ids = [r["id"] for r in triggered_rules]
        return {"triggered_rules": triggered_rules, "metrics": metrics, "rule_ids": rule_ids}

    def judge_l3(self, bm_data: dict, metrics: dict, stage: str = "") -> dict:
        """L3 分析认知 — 返回 {dimension_scores, overall_health, profile_id, match_confidence}"""
        # 按创业阶段调整维度权重
        if stage:
            self.scoring_engine.set_stage_weights(stage)
        scores = self.scoring_engine.score_dimensions(bm_data)
        health = self.scoring_engine.calculate_overall_health(scores)
        profile_id, match_confidence = self.profiling_engine.match_profile(metrics)
        return {
            "dimension_scores": scores,
            "overall_health": health,
            "profile_id": profile_id,
            "match_confidence": match_confidence,
        }

    def judge_l4(self, dimension_scores: dict, overall_health, triggered_rules: list[dict],
                  metrics: dict, profile: Optional[dict], stage: str,
                  require_verification: bool = True) -> list[StrategicSuggestion]:
        """L4 策略认知 — 返回策略建议（已附带验证动作，已过合规检查）"""
        suggestions = self._generate_strategic_suggestions(
            dimension_scores, overall_health, triggered_rules, metrics,
            profile, stage,
        )
        if require_verification:
            suggestions = self._apply_verification(suggestions, triggered_rules)
        return suggestions

    # ---------------------------------------------------------------
    # 完整流程（兼容旧调用方）
    # ---------------------------------------------------------------

    def judge(self, request: JudgeRequest) -> JudgeResponseData:
        """执行完整的商业模式判断流程"""
        start_time = time.time()
        req_data = request.business_model_data.model_dump()
        config = request.config
        industry = request.enterprise.industry.value
        stage = request.enterprise.stage.value

        # L2
        l2_result = self.judge_l2(req_data, industry, stage)
        triggered_rules = l2_result["triggered_rules"]
        metrics = l2_result["metrics"]
        rule_ids = l2_result["rule_ids"]

        # L3
        l3_result = self.judge_l3(req_data, metrics)
        dimension_scores = l3_result["dimension_scores"]
        overall_health = l3_result["overall_health"]
        profile_id = l3_result["profile_id"]
        match_confidence = l3_result["match_confidence"]

        # 行业对标
        benchmarking = None
        if config.include_benchmarking:
            deviations = self.benchmarking_engine.calculate_deviations(industry, metrics)
            if deviations:
                benchmarking = BenchmarkingResult(industry=industry, deviations=deviations)

        # 画像
        profile = self.profiling_engine.get_profile(profile_id) if profile_id else None

        # 风险预警
        risk_alerts = self._generate_risk_alerts(triggered_rules, metrics)

        # L4 策略
        strategic_suggestions = self.judge_l4(
            dimension_scores, overall_health, triggered_rules, metrics,
            profile, stage, require_verification=config.require_verification,
        )

        # 证据链
        evidence_chain = self._build_evidence_chain(triggered_rules)

        # 元信息
        processing_time = int((time.time() - start_time) * 1000)
        metadata = Metadata(
            processing_time_ms=processing_time,
            rules_triggered=rule_ids,
            profiles_matched=[profile_id] if profile_id else [],
            model_version=self.model_version,
        )

        # 构建委员会报告
        council_report_dict = None
        council_report_text = ""
        try:
            from app.models.ecc_schemas import RuleJudgment as ECCRuleJudgment
            ecc_rule_judgments = [
                ECCRuleJudgment(
                    rule_id=r["id"],
                    domain=r.get("domain", ""),
                    conclusion=r.get("conclusion", {}).get("summary", ""),
                    confidence=r.get("conclusion", {}).get("confidence", 0.7),
                    severity=r.get("conclusion", {}).get("type", "info"),
                )
                for r in triggered_rules
            ]
            dim_scores_for_report = {
                k: {"score": v.score, "summary": v.summary}
                for k, v in dimension_scores.items()
            }
            council_report = self.council_chair.generate_report(
                dimension_scores=dim_scores_for_report,
                overall_health={"score": overall_health.score, "level": overall_health.level.value},
                rule_judgments=ecc_rule_judgments,
                cross_analysis=None,
                suggestions=strategic_suggestions,
                stage=stage,
            )
            council_report_dict = council_report.model_dump()
            # 生成可读文本
            council_report_text = self.council_chair.format_report_text(
                council_report, request.enterprise.name
            )
            # 追加策略建议（按专家分组）
            text_parts = [council_report_text, "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 委员会策略建议\n"]
            from app.engine.committee import EXPERT_PROFILES
            expert_suggestions: dict[str, list] = {code: [] for code in EXPERT_PROFILES}
            for s in strategic_suggestions:
                for code, prof in EXPERT_PROFILES.items():
                    if s.dimension in prof.get("concerned_dims", []):
                        expert_suggestions[code].append(s)
                        break
            for code in ["cso", "cpo", "cfo", "coo"]:
                profile = EXPERT_PROFILES.get(code, {})
                suggs = expert_suggestions.get(code, [])
                if suggs:
                    emojis = profile.get("emojis", {})
                    emoji = emojis.get("advice", "📋")
                    text_parts.append(f"\n{emoji} **{profile.get('title','')} {profile.get('name','')} 的建议：**")
                    for s in suggs[:3]:
                        priority_tag = "🔴" if s.priority in ("high", "HIGH") else "🟡"
                        text_parts.append(f"  {priority_tag} {s.action}")
                        if s.verification_action:
                            text_parts.append(f"    验证：{s.verification_action}")
            council_report_text = "\n".join(text_parts)
        except Exception as e:
            logger.warning("council report generation failed", error=str(e))

        return JudgeResponseData(
            model_type=profile["name"] if profile else "",
            match_confidence=match_confidence,
            dimension_scores=dimension_scores,
            overall_health=overall_health,
            benchmarking=benchmarking,
            risk_alerts=risk_alerts,
            strategic_suggestions=strategic_suggestions,
            evidence_chain=evidence_chain,
            metadata=metadata,
            council_report=council_report_dict,
            council_report_text=council_report_text,
        )

    def _generate_risk_alerts(
        self, triggered_rules: list[dict], metrics: dict
    ) -> list[RiskAlert]:
        """从触发的规则中提取风险预警"""
        alerts = []
        for rule in triggered_rules:
            conclusion = rule.get("conclusion", {})
            if conclusion.get("type") in ("risk_warning", "warning", "inconsistency"):
                severity = conclusion.get("severity", "medium")
                alert = RiskAlert(
                    rule_id=rule["id"],
                    severity=Severity(severity),
                    message=conclusion.get("summary", ""),
                    suggestion=rule.get("suggestion", ""),
                    verification_hint=self._generate_verification_hint(rule, metrics),
                )
                alerts.append(alert)
        return alerts

    def _generate_verification_hint(self, rule: dict, metrics: dict) -> str:
        """根据规则生成验证提示"""
        template = rule.get("verification_action_template", "")
        if template:
            params = {
                "months": 3,
                "revenue_type": "主营业务",
                "channel": "主要渠道",
                "n": 3,
            }
            # 尝试从指标中提取具体值
            if metrics.get("cac"):
                params["channel"] = "当前渠道"
            try:
                return template.format(**params)
            except KeyError:
                pass
        return rule.get("suggestion", "")

    def _generate_strategic_suggestions(
        self,
        dimension_scores: dict[str, DimensionScore],
        overall_health: OverallHealth,
        triggered_rules: list[dict],
        metrics: dict,
        profile: Optional[dict],
        stage: str,
    ) -> list[StrategicSuggestion]:
        """基于评估结果生成策略建议"""
        suggestions = []

        # 1. 基于触发的风险规则生成建议
        for rule in triggered_rules:
            conclusion = rule.get("conclusion", {})
            if conclusion.get("type") in ("risk_warning", "warning", "inconsistency"):
                suggestion = rule.get("suggestion", "")
                if suggestion:
                    suggestions.append(
                        StrategicSuggestion(
                            priority=self._determine_priority(rule, overall_health),
                            dimension=rule.get("domain", "VP"),
                            action=suggestion,
                            expected_impact=self._get_expected_impact(rule.get("domain", "")),
                            verification_action="",
                        )
                    )

        # 2. 基于低分维度生成建议
        low_dimensions = [
            (dim, score_obj)
            for dim, score_obj in dimension_scores.items()
            if score_obj.score <= 2
        ]
        for dim, score_obj in low_dimensions:
            suggestions.append(
                StrategicSuggestion(
                    priority=Priority.HIGH,
                    dimension=dim,
                    action=self._get_low_score_action(dim, score_obj, stage),
                    expected_impact=self._get_expected_impact(dim),
                    verification_action="",
                )
            )

        # 3. 中分维度优化建议
        mid_dimensions = [
            (dim, score_obj)
            for dim, score_obj in dimension_scores.items()
            if score_obj.score == 3
        ]
        for dim, score_obj in mid_dimensions[:2]:  # 最多取2个
            suggestions.append(
                StrategicSuggestion(
                    priority=Priority.MEDIUM,
                    dimension=dim,
                    action=self._get_mid_score_action(dim, stage),
                    expected_impact=self._get_expected_impact(dim),
                    verification_action="",
                )
            )

        # 4. 画像建议
        if profile:
            for strength in profile.get("strengths", [])[:1]:
                suggestions.append(
                    StrategicSuggestion(
                        priority=Priority.LOW,
                        dimension="VP",
                        action=f"强化现有优势：{strength}",
                        expected_impact="巩固竞争壁垒",
                        verification_action="",
                    )
                )

        return suggestions

    def _determine_priority(self, rule: dict, health: OverallHealth) -> Priority:
        """确定建议优先级"""
        conclusion = rule.get("conclusion", {})
        severity = conclusion.get("severity", "medium")

        if severity == "high":
            return Priority.HIGH
        elif severity == "medium":
            return Priority.MEDIUM
        return Priority.LOW

    def _get_low_score_action(self, dimension: str, score_obj: DimensionScore, stage: str) -> str:
        """低分维度的行动建议"""
        actions = {
            "VP": "重新定义价值主张，聚焦核心客户的核心痛点",
            "CS": "明确目标客户画像，进行客户细分与优先级排序",
            "CH": "优化获客渠道组合，降低获客成本",
            "CR": "建立客户留存机制，提升客户满意度与复购率",
            "RS": "拓展多元化收入来源，降低单一收入依赖",
            "KR": "识别并构建核心竞争壁垒，强化独特资源",
            "KA": "聚焦核心业务活动，提升运营效率",
            "KP": "拓展关键合作伙伴，降低供应链风险",
            "COST": "优化成本结构，提升毛利率",
        }
        return actions.get(dimension, f"优化 {dimension} 维度")

    def _get_mid_score_action(self, dimension: str, stage: str) -> str:
        """中分维度的优化建议"""
        actions = {
            "VP": "进一步验证价值主张与市场的匹配度，收集客户反馈迭代",
            "CS": "评估是否可扩展至相邻客户细分市场",
            "CH": "实验新的获客渠道，量化各渠道 ROI",
            "CR": "引入客户健康度评分体系，主动管理客户关系",
            "RS": "探索增值服务或新定价模式",
            "KR": "评估核心资源的可持续性与可替代性",
            "KA": "梳理关键业务流程，识别效率提升点",
            "KP": "深化核心合作伙伴关系，探索联合创新机会",
            "COST": "分析成本构成，识别规模效应优化空间",
        }
        return actions.get(dimension, f"优化 {dimension} 维度")

    def _get_expected_impact(self, dimension: str) -> str:
        """获取各维度的预期影响"""
        impacts = {
            "VP": "提升产品市场匹配度",
            "CS": "扩大目标市场规模",
            "CH": "降低获客成本，提升获客效率",
            "CR": "降低流失率，提升客户生命周期价值",
            "RS": "增加营收来源，提升收入稳定性",
            "KR": "构建可持续竞争壁垒",
            "KA": "提升运营效率与业务聚焦度",
            "KP": "增强生态协同效应",
            "COST": "提升盈利能力与成本效率",
        }
        return impacts.get(dimension, "提升商业模式健康度")

    def _apply_verification(
        self, suggestions: list[StrategicSuggestion], triggered_rules: list[dict]
    ) -> list[StrategicSuggestion]:
        """为每条建议附加验证动作 + 合规检查"""
        verified = []

        for suggestion in suggestions:
            # 生成验证动作
            verification_action = self.verification_engine.generate_verification_action(
                suggestion.action, suggestion.dimension
            )
            suggestion.verification_action = verification_action
            suggestion.estimated_verification_period = (
                self.verification_engine.estimate_verification_period(suggestion.action)
            )

            verified.append(suggestion)

        # 合规检查
        suggestion_dicts = [s.model_dump() for s in verified]
        passed = self.verification_engine.compliance_check(suggestion_dicts)
        passed_ids = {s["action"] for s in passed}

        return [s for s in verified if s.action in passed_ids]

    def _build_evidence_chain(self, triggered_rules: list[dict]) -> list[EvidenceChainItem]:
        """构建推理证据链"""
        chain = []
        for i, rule in enumerate(triggered_rules[:10]):  # 最多10条
            conclusion = rule.get("conclusion", {})
            chain.append(
                EvidenceChainItem(
                    step=i + 1,
                    rule_id=rule["id"],
                    input_summary=rule.get("condition", {}).get("and", [{}])[0]
                        .get("metric", rule.get("name", "")),
                    output_summary=conclusion.get("summary", ""),
                    confidence=conclusion.get("confidence", 0.7),
                )
            )
        return chain
