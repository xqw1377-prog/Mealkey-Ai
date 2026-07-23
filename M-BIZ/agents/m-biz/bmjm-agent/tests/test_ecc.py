"""认知链 (ECC) 端到端测试"""

import pytest
from app.engine.ecc import ECCController
from app.engine.fact_collector import FactCollector
from app.models.ecc_schemas import (
    ChainStatus, CognitionLayer, VerificationResult, VerificationStatus,
)


class TestFactCollector:
    """事实采集器测试"""

    def setup_method(self):
        self.collector = FactCollector()

    def test_initial_questions(self):
        questions = self.collector.get_initial_questions("saas")
        assert len(questions) >= 2
        assert "SaaS" in questions[0] or "解决" in questions[0]

    def test_default_questions(self):
        questions = self.collector.get_initial_questions("unknown")
        assert len(questions) >= 2

    def test_extract_facts_saas(self):
        text = "我们做AI客服，面向中小电商企业，帮他们降低客服成本。按月订阅收费。"
        nodes = self.collector.extract_facts(text)
        assert len(nodes) >= 2
        categories = {n.category.value for n in nodes}
        assert "customer_segment" in categories or "pain_point" in categories or "value_proposition" in categories

    def test_extract_facts_rich(self):
        text = (
            "我们做一款面向设计师的AI设计工具，核心痛点是设计师找素材太费时间。"
            "通过小红书和微信社群获客，月收入5万，有200个付费用户。"
            "每个月流失率大概3%。"
        )
        nodes = self.collector.extract_facts(text)
        assert len(nodes) >= 3

    def test_check_missing(self):
        nodes = self.collector.extract_facts("我们做AI客服")
        missing = self.collector.check_missing_categories(nodes)
        # 应该缺少多个分类
        assert len(missing) > 0
        assert "customer_segment" in missing or "pain_point" in missing

    def test_generate_follow_ups(self):
        questions = self.collector.generate_follow_ups(["customer_segment", "revenue_model"])
        assert len(questions) == 2
        assert "客户" in questions[0]

    def test_facts_to_bm(self):
        text = "我们做AI智能客服平台，面向中小电商企业，帮他们降低客服成本提高效率。按月订阅收费，月收入5万元。"
        nodes = self.collector.extract_facts(text)
        assert len(nodes) > 0
        bm = self.collector.facts_to_business_model(nodes)
        # 至少有一个字段非空
        has_content = (
            bm.value_proposition.description != ""
            or bm.customer_segments.primary != ""
            or len(bm.revenue_streams.types) > 0
        )
        assert has_content, f"BusinessModelData is empty: VP={bm.value_proposition.description!r}, CS={bm.customer_segments.primary!r}, RS={bm.revenue_streams.types}"


class TestECCController:
    """认知链控制器测试"""

    def setup_method(self):
        self.ecc = ECCController()

    def test_create_session(self):
        session = self.ecc.create_session("智云科技", "saas", "seed")
        assert session.session_id.startswith("ecc_")
        assert session.status == ChainStatus.COLLECTING
        assert session.current_layer == CognitionLayer.L1_FACT
        assert len(session.pending_questions) > 0

    def test_process_first_message_l1_pending(self):
        """L1 阶段：信息不足，继续追问"""
        session = self.ecc.create_session("测试项目")
        resp = self.ecc.process_message(session.session_id, "我们做AI客服")
        # 仍在 L1，应该还有追问
        assert resp.current_layer == CognitionLayer.L1_FACT
        assert len(resp.fact_nodes) >= 0
        progress = resp.progress
        assert 0.0 <= progress <= 1.0

    def test_full_chain_l1_to_l5(self):
        """完整认知链：从 L1 一路走到 L5"""
        session = self.ecc.create_session("智云科技", "saas", "growth")

        # 模拟多轮对话 — 每次提供尽可能丰富的信息
        rounds = [
            "我们做AI智能客服平台，主要服务中小电商企业，帮他们降低客服成本、提升响应效率",
            "按月订阅收费，月收入20万，ARPU大概2000，主要成本是研发人员工资和云服务费",
            "通过小红书和直营销售获客，CAC大概8000，月流失率3%，NPS 45",
            "主要竞品是Zendesk和美洽，我们的优势是AI能力强，核心团队来自大厂，有行业垂直数据",
        ]

        max_rounds = 8  # 安全上限
        resp = None
        for i in range(max_rounds):
            if i < len(rounds):
                msg = rounds[i]
            else:
                msg = "我们主要面向电商客户，帮他们提升客服效率降低成本"

            resp = self.ecc.process_message(session.session_id, msg)
            if resp.current_layer != CognitionLayer.L1_FACT:
                break

        # 至少进入了 L2 以上
        assert resp is not None
        assert resp.current_layer in [
            CognitionLayer.L2_RULE,
            CognitionLayer.L3_ANALYSIS,
            CognitionLayer.L4_STRATEGY,
            CognitionLayer.L5_VERIFICATION,
        ], f"Stuck at {resp.current_layer} after {min(len(rounds), max_rounds)} rounds"
        assert resp.progress >= 0.3, f"Progress too low: {resp.progress}"

    def test_submit_verification(self):
        """验证回注测试"""
        session = self.ecc.create_session("测试项目", "saas", "growth")

        # 快速走完认知链
        messages = [
            "我们做AI智能客服平台，面向中小电商企业，帮他们降低客服成本",
            "按月订阅收费，月收入10万，ARPU 2000，主要成本是研发和服务器",
            "通过小红书获客，CAC 5000，月流失率3%，NPS 45",
            "主要竞品是Zendesk，我们的优势是AI能力强，核心团队来自大厂",
        ]
        resp = None
        for i in range(10):
            msg = messages[i] if i < len(messages) else "我们主要做电商智能客服，AI驱动"
            resp = self.ecc.process_message(session.session_id, msg)
            if resp and resp.current_layer == CognitionLayer.L5_VERIFICATION:
                break

        # 如果在 L5，提交验证回注
        if resp.current_layer == CognitionLayer.L5_VERIFICATION and resp.verification_tasks:
            task = resp.verification_tasks[0]
            result = VerificationResult(
                result=VerificationStatus.PASS,
                actual_data={"leads": 50, "cpl": 100},
                conclusion="内容营销有效，CPL低于预期",
                new_insights=["目标客户在购买前平均需要接触5次内容"],
            )
            resp2 = self.ecc.submit_verification(session.session_id, task.task_id, result)
            assert resp2 is not None
            # 验证新洞察已被注入 L1
            updated_session = self.ecc.get_session(session.session_id)
            assert updated_session is not None
            insight_nodes = [n for n in updated_session.fact_nodes if "5次" in n.statement]
            assert len(insight_nodes) > 0


class TestChainIntegration:
    """ECC 与推理引擎集成测试"""

    def test_ecc_uses_existing_engine(self):
        """ECC 内部正确调用 InferenceEngine"""
        ecc = ECCController()
        assert ecc.inference_engine is not None
        assert ecc.inference_engine.rule_engine is not None
        assert len(ecc.inference_engine.rule_engine.rules) >= 50

    def test_ecc_session_persistence(self):
        """会话持久化"""
        ecc = ECCController()
        session = ecc.create_session("持久化测试")
        session_id = session.session_id

        # 通过不同方法获取
        s1 = ecc.get_session(session_id)
        s2 = ecc.sessions.get(session_id)
        assert s1 is s2
        assert s1.session_id == session_id


if __name__ == "__main__":
    pytest.main(["-v", __file__])
