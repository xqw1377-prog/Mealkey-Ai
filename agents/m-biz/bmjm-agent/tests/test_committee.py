"""委员会引擎测试"""
import pytest
from app.engine.committee import CouncilChair, EXPERT_PROFILES
from app.models.ecc_schemas import (
    ExpertOpinion, CouncilConsensus, CouncilReport,
    RuleJudgment,
)


class TestCouncilChair:
    """委员会主持人测试"""

    def setup_method(self):
        self.chair = CouncilChair()

    def test_expert_profiles_loaded(self):
        """验证四位专家档案加载正确"""
        assert len(EXPERT_PROFILES) == 4
        assert "cso" in EXPERT_PROFILES
        assert "cpo" in EXPERT_PROFILES
        assert "cfo" in EXPERT_PROFILES
        assert "coo" in EXPERT_PROFILES

    def test_rules_indexed_by_expert(self):
        """验证规则按专家分组"""
        total_indexed = sum(len(v) for v in self.chair.expert_rules.values())
        assert total_indexed > 0
        for expert_code in EXPERT_PROFILES:
            assert expert_code in self.chair.expert_rules
            assert len(self.chair.expert_rules[expert_code]) > 0

    def test_generate_report_basic(self):
        """基础报告生成"""
        report = self.chair.generate_report(
            dimension_scores={
                "VP": {"score": 4, "summary": "好"},
                "CS": {"score": 3, "summary": "中"},
                "RS": {"score": 2, "summary": "差"},
                "COST": {"score": 3, "summary": "中"},
                "CH": {"score": 3, "summary": "中"},
                "CR": {"score": 4, "summary": "好"},
            },
            overall_health={"score": 0.68, "level": "sub_healthy"},
            rule_judgments=[],
            cross_analysis=None,
            suggestions=[],
            stage="growth",
        )
        assert isinstance(report, CouncilReport)
        assert len(report.experts) == 4
        assert report.consensus is not None

    def test_generate_report_with_rules(self):
        """带规则触发的报告生成"""
        rule_judgments = [
            RuleJudgment(
                rule_id="R-BM-001", domain="RS",
                conclusion="收入来源单一", confidence=0.85,
                severity="risk_warning",
            ),
            RuleJudgment(
                rule_id="R-BM-002", domain="CH",
                conclusion="CAC偏高", confidence=0.80,
                severity="risk_warning",
            ),
        ]
        report = self.chair.generate_report(
            dimension_scores={"VP": {"score": 3, "summary": "中"}},
            overall_health={"score": 0.5, "level": "warning"},
            rule_judgments=rule_judgments,
            cross_analysis=None,
            suggestions=[],
            stage="seed",
        )
        assert len(report.experts) == 4
        # 财务官应该提到收入风险
        cfo_opinion = [o for o in report.experts if o.expert_code == "cfo"][0]
        assert len(cfo_opinion.risk_highlights) > 0

    def test_consensus_high_agreement(self):
        """高度一致检测"""
        opinions = [
            ExpertOpinion(expert_code="cso", score=4.0, dim_scores={}, risk_highlights=[], conclusion=""),
            ExpertOpinion(expert_code="cpo", score=3.8, dim_scores={}, risk_highlights=[], conclusion=""),
            ExpertOpinion(expert_code="cfo", score=4.2, dim_scores={}, risk_highlights=[], conclusion=""),
            ExpertOpinion(expert_code="coo", score=3.9, dim_scores={}, risk_highlights=[], conclusion=""),
        ]
        consensus = self.chair._detect_consensus(opinions, {"score": 0.7, "level": "sub_healthy"})
        assert consensus.agreement_level == "高度一致"
        assert consensus.score_gap <= 0.5

    def test_consensus_disagreement(self):
        """存在分歧检测"""
        opinions = [
            ExpertOpinion(expert_code="cso", score=4.5, dim_scores={}, risk_highlights=[], conclusion=""),
            ExpertOpinion(expert_code="cpo", score=4.2, dim_scores={}, risk_highlights=[], conclusion=""),
            ExpertOpinion(expert_code="cfo", score=2.0, dim_scores={}, risk_highlights=["现金流风险"], conclusion=""),
            ExpertOpinion(expert_code="coo", score=2.5, dim_scores={}, risk_highlights=["运营风险"], conclusion=""),
        ]
        consensus = self.chair._detect_consensus(opinions, {"score": 0.5, "level": "warning"})
        assert consensus.agreement_level in ("存在分歧", "明显分歧")
        assert consensus.disagreement_detail != ""
        assert consensus.discussion_summary != ""

    def test_risk_consensus(self):
        """多位专家共同关注的风险"""
        opinions = [
            ExpertOpinion(expert_code="cso", score=3.0, dim_scores={},
                          risk_highlights=["市场规模有限", "增长天花板低"], conclusion=""),
            ExpertOpinion(expert_code="cpo", score=3.0, dim_scores={},
                          risk_highlights=["市场规模有限", "产品差异化不足"], conclusion=""),
            ExpertOpinion(expert_code="cfo", score=3.0, dim_scores={},
                          risk_highlights=["现金流风险"], conclusion=""),
            ExpertOpinion(expert_code="coo", score=3.0, dim_scores={},
                          risk_highlights=["市场规模有限", "渠道单一"], conclusion=""),
        ]
        consensus = self.chair._detect_consensus(opinions, {"score": 0.6, "level": "sub_healthy"})
        # "市场规模有限" 被3位专家提到，应该出现在风险共识中
        has_market_risk = any("市场规模" in r for r in consensus.risk_consensus)
        assert has_market_risk

    def test_format_report_text(self):
        """报告文本格式化"""
        report = self.chair.generate_report(
            dimension_scores={"VP": {"score": 4, "summary": "价值主张清晰"}},
            overall_health={"score": 0.75, "level": "sub_healthy"},
            rule_judgments=[],
            cross_analysis=None,
            suggestions=[],
            stage="growth",
        )
        text = self.chair.format_report_text(report, "测试企业")
        assert "商业委员会评估报告" in text
        assert "测试企业" in text
        # 所有四位专家都应该出现在文本中
        for op in report.experts:
            assert op.expert_name in text
            assert op.expert_title in text

    def test_expert_question_format(self):
        """专家追问格式"""
        q = self.chair.format_expert_question("cso", "你的目标市场有多大？")
        assert "王远" in q or "战略官" in q
        assert "你的目标市场有多大" in q
