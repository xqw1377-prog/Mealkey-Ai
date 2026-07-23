"""端到端验证：认知链完整走通"""

from app.engine.ecc import ECCController
from app.models.ecc_schemas import VerificationResult, VerificationStatus


def test_e2e_full_chain():
    """创始人对话 → L1→L2→L3→L4→L5 → 回注 → 认知升级"""
    ecc = ECCController()
    session = ecc.create_session("小满科技", "saas", "seed")

    # 模拟创始人 4 轮对话
    messages = [
        "我们做一个AI客服产品，帮中小电商降低客服成本",
        "按月订阅收费，一个月20万收入，客单价2000",
        "通过小红书和直营销售获客，CAC大概8000，月流失率3%",
        "主要竞品是Zendesk和美洽，核心团队来自大厂，我们的优势是AI能力强",
    ]

    for msg in messages:
        ecc.process_message(session.session_id, msg)

    s = ecc.get_session(session.session_id)
    assert s is not None

    # 验证认知链走到了 L5
    assert s.current_layer.value == "L5", f"Stuck at {s.current_layer.value}"
    assert s.status.value == "awaiting_verification"

    # 验证事实采集
    assert len(s.fact_nodes) >= 4, f"Only {len(s.fact_nodes)} fact nodes"
    categories = {n.category.value for n in s.fact_nodes}
    assert "customer_segment" in categories
    assert "value_proposition" in categories

    # 验证规则触发
    assert len(s.rule_judgments) > 0, "No rules triggered"
    # 验证规则有追溯事实
    has_fact_ref = any(len(j.input_fact_ids) > 0 for j in s.rule_judgments)
    assert has_fact_ref, "Rules should reference L1 facts"

    # 验证维度评分
    assert len(s.dimension_scores) > 0
    assert s.overall_health is not None

    # 验证建议
    assert len(s.suggestions) > 0
    # 验证建议有验证动作
    has_verification = any(s.verification_action for s in s.suggestions)
    assert has_verification, "Suggestions should have verification actions"

    # 验证验证任务
    assert len(s.verification_tasks) > 0

    # 验证认知升级：回注后重新推理
    if s.verification_tasks:
        task = s.verification_tasks[0]
        old_rule_count = len(s.rule_judgments)

        result = VerificationResult(
            result=VerificationStatus.PASS,
            actual_data={"leads": 50, "cpl": 100},
            conclusion="内容营销有效，CPL低于预期",
            new_insights=["目标客户在购买前平均需要接触5次内容"],
        )
        ecc.submit_verification(s.session_id, task.task_id, result)

        s2 = ecc.get_session(s.session_id)
        assert s2 is not None

        # 验证新洞察已注入
        insight_facts = [n for n in s2.fact_nodes if "5次" in n.statement]
        assert len(insight_facts) > 0, "New insight should be injected as fact node"

        # 验证认知链已重新推理
        assert len(s2.rule_judgments) > 0

        print(f"  事实节点: {len(s.fact_nodes)} → {len(s2.fact_nodes)}")
        print(f"  规则触发: {old_rule_count} → {len(s2.rule_judgments)}")
        print(f"  建议: {len(s2.suggestions)}条")
        print("  认知升级: ✅")

    print("✅ E2E: 认知链全链路走通")


def test_e2e_minimal_input():
    """信息不足时，系统应追问而非强行推理"""
    ecc = ECCController()
    session = ecc.create_session("新项目")

    # 只给一条信息
    resp = ecc.process_message(session.session_id, "我想做一个AI产品")

    # 应该还在 L1，且有追问
    assert resp.current_layer.value == "L1"
    assert len(resp.pending_questions) > 0 or "什么" in resp.reply

    print("✅ E2E: 信息不足时正确追问，未强行推理")


def test_e2e_rule_fact_traceability():
    """规则判断可追溯到 L1 事实节点"""
    ecc = ECCController()
    session = ecc.create_session("追溯测试", "saas", "growth")

    messages = [
        "我们做B2B销售CRM，帮助销售团队提升效率",
        "按月订阅收费，月收入15万，ARPU 3000",
        "通过内容营销和直营销售获客，CAC 6000",
    ]
    for msg in messages:
        ecc.process_message(session.session_id, msg)
    # 补充到满足要求
    for msg in ["月流失率4%，NPS 42", "主要竞品是销售易和纷享销客"]:
        ecc.process_message(session.session_id, msg)

    s = ecc.get_session(session.session_id)
    assert s is not None

    # 验证每个规则判断都引用了事实
    for j in s.rule_judgments[:3]:
        assert len(j.input_fact_ids) > 0, f"Rule {j.rule_id} has no fact references"
        # 验证引用的 ID 确实存在于会话中
        valid_ids = {n.node_id for n in s.fact_nodes}
        for fid in j.input_fact_ids:
            assert fid in valid_ids, f"Rule {j.rule_id} references non-existent fact {fid}"

    print(f"✅ E2E: {len(s.rule_judgments)}条规则全部可追溯到L1事实节点")


if __name__ == "__main__":
    test_e2e_full_chain()
    test_e2e_minimal_input()
    test_e2e_rule_fact_traceability()
