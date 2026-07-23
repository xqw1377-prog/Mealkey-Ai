"""BMJM Agent 测试用例"""

import pytest
from app.models.schemas import (
    JudgeRequest, EnterpriseInfo, BusinessModelData, JudgeConfig,
    ValueProposition, CustomerSegments, Channels, CustomerRelationships,
    RevenueStreams, KeyResources, KeyActivities, KeyPartnerships, CostStructure,
)
from app.models.enums import Industry, Stage, Scale
from app.engine.inference import InferenceEngine


@pytest.fixture
def engine():
    return InferenceEngine()


@pytest.fixture
def sample_saas_request():
    """构建 SaaS 示例请求"""
    return JudgeRequest(
        request_id="test_001",
        enterprise=EnterpriseInfo(
            name="智云科技",
            industry=Industry.SAAS,
            stage=Stage.GROWTH,
            scale=Scale.MID,
        ),
        business_model_data=BusinessModelData(
            value_proposition=ValueProposition(
                description="为企业提供智能客服 SaaS 平台",
                pain_points=["客服成本高", "响应效率低", "数据无法沉淀"],
                differentiation="AI 驱动的全渠道智能客服",
            ),
            customer_segments=CustomerSegments(
                primary="中小型电商企业",
                secondary="中型零售企业",
                tam=5000000000,
                sam=500000000,
            ),
            channels=Channels(
                types=["inbound_marketing", "direct_sales", "partner_channel"],
                cac=8000,
            ),
            customer_relationships=CustomerRelationships(
                type="dedicated_cs + self_service",
                monthly_churn_rate=0.04,
                nps=45,
            ),
            revenue_streams=RevenueStreams(
                types=["monthly_subscription", "annual_subscription"],
                mrr=2000000,
                arpu=2000,
                top_revenue_share=0.9,
            ),
            key_resources=KeyResources(
                primary="AI 算法团队 + SaaS 平台",
                unique="行业垂直领域训练数据集",
            ),
            key_activities=KeyActivities(
                primary="产品研发 + 客户成功",
            ),
            key_partnerships=KeyPartnerships(
                main_partners=["云服务提供商", "电商平台"],
                dependence_level="medium",
            ),
            cost_structure=CostStructure(
                major_costs=["研发人员工资", "云服务费用", "销售薪酬"],
                gross_margin=0.72,
            ),
        ),
        config=JudgeConfig(
            include_benchmarking=True,
            require_verification=True,
        ),
    )


class TestInferenceEngine:
    """推理引擎测试"""

    def test_basic_judge(self, engine, sample_saas_request):
        """测试基本判断流程"""
        result = engine.judge(sample_saas_request)

        # 验证结果完整性
        assert result.model_type != ""
        assert result.match_confidence > 0
        assert len(result.dimension_scores) == 9
        assert 0 <= result.overall_health.score <= 1

        # 验证维度
        for dim in ["VP", "CS", "CH", "CR", "RS", "KR", "KA", "KP", "COST"]:
            assert dim in result.dimension_scores, f"Missing dimension: {dim}"
            assert 1 <= result.dimension_scores[dim].score <= 5

    def test_risk_alerts(self, engine, sample_saas_request):
        """测试风险预警生成"""
        result = engine.judge(sample_saas_request)

        assert len(result.risk_alerts) >= 0
        for alert in result.risk_alerts:
            assert alert.rule_id != ""
            assert alert.message != ""
            assert alert.severity in ["high", "medium", "low"]

    def test_strategic_suggestions(self, engine, sample_saas_request):
        """测试策略建议与验证动作"""
        result = engine.judge(sample_saas_request)

        assert len(result.strategic_suggestions) > 0
        for suggestion in result.strategic_suggestions:
            assert suggestion.action != ""
            assert suggestion.verification_action != ""
            assert suggestion.priority in ["high", "medium", "low"]

    def test_benchmarking(self, engine, sample_saas_request):
        """测试行业对标"""
        result = engine.judge(sample_saas_request)

        assert result.benchmarking is not None
        assert result.benchmarking.industry == "saas"
        assert len(result.benchmarking.deviations) > 0

    def test_evidence_chain(self, engine, sample_saas_request):
        """测试证据链"""
        result = engine.judge(sample_saas_request)

        assert len(result.evidence_chain) > 0
        for item in result.evidence_chain:
            assert item.step > 0
            assert item.rule_id != ""

    def test_metadata(self, engine, sample_saas_request):
        """测试元信息"""
        result = engine.judge(sample_saas_request)

        assert result.metadata.processing_time_ms >= 0
        assert len(result.metadata.rules_triggered) > 0
        assert result.metadata.model_version == "1.0"

    def test_verification_compliance(self, engine, sample_saas_request):
        """测试「不算死账」合规"""
        result = engine.judge(sample_saas_request)

        for suggestion in result.strategic_suggestions:
            assert suggestion.verification_action != ""
            assert len(suggestion.verification_action) > 10
            assert suggestion.estimated_verification_period != ""


class TestRuleEngine:
    """规则引擎测试"""

    def test_metric_extraction(self, engine, sample_saas_request):
        """测试指标提取"""
        metrics = engine.rule_engine.extract_metrics(
            sample_saas_request.business_model_data.model_dump()
        )

        assert metrics["vp_description_exists"] is True
        assert metrics["revenue_streams_count"] == 2
        assert metrics["top_revenue_share"] == 0.9

    def test_rule_matching(self, engine, sample_saas_request):
        """测试规则匹配"""
        metrics = engine.rule_engine.extract_metrics(
            sample_saas_request.business_model_data.model_dump()
        )
        triggered = engine.rule_engine.match_rules(metrics)

        assert len(triggered) > 0


class TestScoringEngine:
    """评分引擎测试"""

    def test_dimension_scoring(self, engine, sample_saas_request):
        """测试维度评分"""
        scores = engine.scoring_engine.score_dimensions(
            sample_saas_request.business_model_data.model_dump()
        )

        assert len(scores) == 9
        for dim, score_obj in scores.items():
            assert 1 <= score_obj.score <= 5
            assert score_obj.summary != ""

    def test_overall_health(self, engine, sample_saas_request):
        """测试综合健康度"""
        scores = engine.scoring_engine.score_dimensions(
            sample_saas_request.business_model_data.model_dump()
        )
        health = engine.scoring_engine.calculate_overall_health(scores)

        assert 0 <= health.score <= 1
        assert health.level in ["healthy", "sub_healthy", "warning", "critical"]


if __name__ == "__main__":
    pytest.main(["-v", __file__])
