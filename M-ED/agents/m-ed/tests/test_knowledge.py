"""
测试：知识资产模块 — 审计轨迹 + 5 组规则
"""

import pytest
import json
from agent.knowledge.audit import AuditTracker, TraceEvent, ScoreAdjustment
from agent.knowledge.rules.equity_design import (
    design_equity_fallback,
    get_role_weight,
    get_equity_type,
    ROLE_WEIGHTS,
)
from agent.knowledge.rules.equity_adjust import (
    adjust_equity_fallback,
    calculate_adjustment,
)
from agent.knowledge.rules.simulate import simulate_fallback
from agent.knowledge.rules.compliance import compliance_fallback
from agent.knowledge.rules.document import document_fallback

from agent.models.schemas import (
    AdjustEquityPayload,
    SimulatePayload,
    ComplianceCheckPayload,
    ComplianceScheme,
    GenerateDocumentPayload,
    CurrentScheme,
    AllocationItem,
    TriggerEvent,
    Contribution,
    Scenario,
    SimulationEvent,
    VestingTerms,
    CheckItem,
    DocumentType,
    OutputFormat,
    AdjustmentType,
    Jurisdiction,
)


# ============================================================
# 审计轨迹测试
# ============================================================

class TestAuditTracker:
    def test_trace_events(self):
        tracker = AuditTracker("test_action")
        tracker.trace("stage1", "action1", "detail1", key="value")
        tracker.trace("stage2", "action2", "detail2")
        summary = tracker.summary()
        assert summary["events_count"] == 2
        assert summary["adjustments_count"] == 0
        assert summary["action"] == "test_action"

    def test_adjustments(self):
        tracker = AuditTracker("test_adjust")
        tracker.adjust("rule1", 2.0, "reason1", before=50.0)
        tracker.adjust("rule2", -1.0, "reason2", before=52.0)
        summary = tracker.summary()
        assert summary["adjustments_count"] == 2
        assert summary["adjustments"][0]["delta"] == 2.0

    def test_report(self):
        tracker = AuditTracker("test")
        tracker.trace("start", "begin", "started")
        tracker.adjust("rule", 1.5, "adjusted", before=10.0)
        report = tracker.report()
        assert len(report["chain"]) == 2
        assert "adjusted (+1.5)" in report["chain"][1]["detail"]
        assert "11.5" in report["chain"][1]["detail"]

    def test_audit_in_fallback_output(self):
        """规则退路输出中应包含 audit 轨迹"""
        result = design_equity_fallback({
            "project_name": "Test",
            "project_stage": "seed",
            "team_members": [
                {"role": "创始人", "name": "A", "contribution_type": "全职", "responsibility": "R"},
            ],
        })
        assert "metadata" in result
        assert "audit" in result["metadata"]
        assert result["metadata"]["audit"]["events_count"] > 0


# ============================================================
# 规则：股权分配
# ============================================================

class TestEquityDesignRules:
    def test_get_role_weight(self):
        assert get_role_weight("创始人") == 0.40
        assert get_role_weight("CTO") == 0.25
        assert get_role_weight("未知角色") == 0.10  # default

    def test_get_equity_type(self):
        assert get_equity_type("全职") == "普通股"
        assert get_equity_type("兼职") == "受限股"
        assert get_equity_type("顾问") == "受限股"

    def test_design_fallback_basic(self):
        result = design_equity_fallback({
            "project_name": "Startup",
            "project_stage": "seed",
            "team_members": [
                {"role": "创始人", "name": "张三", "contribution_type": "全职", "responsibility": "战略"},
                {"role": "CTO", "name": "李四", "contribution_type": "全职", "responsibility": "技术"},
            ],
        })
        assert "scheme" in result
        assert len(result["scheme"]["allocations"]) == 2
        assert result["scheme"]["reserved_pool"]["equity_percent"] == 12.0
        # 检查比例合计
        total = sum(a["equity_percent"] for a in result["scheme"]["allocations"])
        total += result["scheme"]["reserved_pool"]["equity_percent"]
        total += result["scheme"]["unallocated"]
        assert abs(total - 100.0) < 0.1

    def test_design_single_member(self):
        result = design_equity_fallback({
            "project_name": "Solo",
            "project_stage": "idea",
            "team_members": [
                {"role": "创始人", "name": "A", "contribution_type": "全职", "responsibility": "R"},
            ],
        })
        assert len(result["scheme"]["allocations"]) == 1
        # 单人拿 70% 中的全部
        assert result["scheme"]["allocations"][0]["equity_percent"] == 70.0

    def test_design_unknown_role(self):
        result = design_equity_fallback({
            "project_name": "Test",
            "project_stage": "seed",
            "team_members": [
                {"role": "未知角色", "name": "X", "contribution_type": "兼职", "responsibility": "R"},
            ],
        })
        assert result["scheme"]["allocations"][0]["equity_type"] == "受限股"


# ============================================================
# 规则：动态调整
# ============================================================

class TestEquityAdjustRules:
    def test_calculate_adjustment(self):
        assert calculate_adjustment(1) == 0.5
        assert calculate_adjustment(10) == 5.0  # 上限
        assert calculate_adjustment(0) == 0.0

    def test_adjust_fallback_basic(self):
        payload = _make_adjust_payload()
        result = adjust_equity_fallback(payload)
        assert "adjustment_suggestion" in result
        assert len(result["adjustment_suggestion"]["changes"]) > 0

    def test_adjust_version_bump(self):
        payload = _make_adjust_payload(version="v2")
        result = adjust_equity_fallback(payload)
        assert result["adjustment_suggestion"]["suggested_version"] == "v2.1"

    def test_adjust_has_audit(self):
        payload = _make_adjust_payload()
        result = adjust_equity_fallback(payload)
        assert "audit" in result["metadata"]


# ============================================================
# 规则：场景模拟
# ============================================================

class TestSimulateRules:
    def test_simulate_basic(self):
        payload = _make_simulate_payload()
        result = simulate_fallback(payload)
        assert "scenarios" in result
        assert len(result["scenarios"]) > 0

    def test_simulate_dilution_single_round(self):
        payload = _make_simulate_payload(dilution=20)
        result = simulate_fallback(payload)
        scenario = result["scenarios"][0]
        # 45% × 0.8 = 36%
        zhang = [r for r in scenario["result"] if r["member"] == "张三"][0]
        assert zhang["after"] == 36.0

    def test_simulate_multi_round(self):
        payload = _make_simulate_payload(dilution=15, multi_round=True)
        result = simulate_fallback(payload)
        scenario = result["scenarios"][0]
        # 第一轮 15%: 45 × 0.85 = 38.25
        # 第二轮 20%: 38.25 × 0.80 = 30.6
        zhang = [r for r in scenario["result"] if r["member"] == "张三"][0]
        assert zhang["after"] == 30.6

    def test_simulate_has_audit(self):
        payload = _make_simulate_payload()
        result = simulate_fallback(payload)
        assert "audit" in result["metadata"]


# ============================================================
# 规则：合规检查
# ============================================================

class TestComplianceRules:
    def test_compliance_all_pass(self):
        payload = ComplianceCheckPayload(
            scheme=ComplianceScheme(
                allocations=[
                    AllocationItem(member="张三", role="创始人", equity_percent=51, equity_type="普通股"),
                    AllocationItem(member="李四", role="CTO", equity_percent=25, equity_type="受限股"),
                ],
                vesting_terms={"standard": {"total_months": 48, "cliff_months": 12}},
            ),
            jurisdiction=Jurisdiction.CHINA,
            check_items=[CheckItem.VESTING, CheckItem.EQUITY_TYPES, CheckItem.FOUNDER_PROTECTION],
        )
        result = compliance_fallback(payload)
        assert result["overall_status"] in ("pass", "caution")

    def test_compliance_no_vesting_fails(self):
        payload = ComplianceCheckPayload(
            scheme=ComplianceScheme(
                allocations=[AllocationItem(member="A", role="创始人", equity_percent=100)],
                vesting_terms={},
            ),
            check_items=[CheckItem.VESTING],
        )
        result = compliance_fallback(payload)
        assert result["checks"][0]["status"] == "fail"

    def test_compliance_low_control_fails(self):
        payload = ComplianceCheckPayload(
            scheme=ComplianceScheme(
                allocations=[AllocationItem(member="A", role="创始人", equity_percent=20)],
                vesting_terms={"standard": {"total_months": 48, "cliff_months": 12}},
            ),
            check_items=[CheckItem.FOUNDER_PROTECTION],
        )
        result = compliance_fallback(payload)
        assert result["checks"][0]["status"] == "fail"

    def test_compliance_has_audit(self):
        payload = ComplianceCheckPayload(
            scheme=ComplianceScheme(
                allocations=[AllocationItem(member="A", role="创始人", equity_percent=51)],
                vesting_terms={"standard": {"total_months": 48, "cliff_months": 12}},
            ),
            check_items=[CheckItem.VESTING],
        )
        result = compliance_fallback(payload)
        assert "audit" in result["metadata"]


# ============================================================
# 规则：文档生成
# ============================================================

class TestDocumentRules:
    def test_document_basic(self):
        payload = GenerateDocumentPayload(
            document_type=DocumentType.EQUITY_AGREEMENT_DRAFT,
            scheme_version="v1",
            scheme_data={
                "project_name": "MyStartup",
                "date": "2025-07-01",
                "parties": [
                    {"name": "张三", "role": "创始人", "equity_percent": 51},
                ],
            },
            output_format=OutputFormat.MARKDOWN,
        )
        result = document_fallback(payload)
        assert "document" in result
        assert "MyStartup" in result["document"]["content"]
        assert "免责声明" in result["document"]["content"]

    def test_document_has_audit(self):
        payload = GenerateDocumentPayload(
            document_type=DocumentType.EQUITY_AGREEMENT_DRAFT,
            scheme_version="v1",
            scheme_data={"project_name": "T", "parties": []},
            output_format=OutputFormat.MARKDOWN,
        )
        result = document_fallback(payload)
        assert "audit" in result["metadata"]


# ============================================================
# 辅助函数
# ============================================================

def _make_adjust_payload(version="v1"):
    return AdjustEquityPayload(
        current_scheme=CurrentScheme(
            version=version,
            allocations=[
                AllocationItem(member="张三", role="创始人", equity_percent=50),
                AllocationItem(member="李四", role="CTO", equity_percent=30),
            ],
            reserved_pool=10,
            unallocated=10,
        ),
        trigger_event=TriggerEvent(
            type="milestone_completion",
            description="完成 MVP",
            completed_by=["张三", "李四"],
        ),
        contributions=[
            Contribution(member="张三", period="Q1", achievements=["完成设计", "获得客户", "搭团队"]),
            Contribution(member="李四", period="Q1", achievements=["完成开发"]),
        ],
        adjustment_type=AdjustmentType.MILESTONE,
    )


def _make_simulate_payload(dilution=15, multi_round=False):
    events = [SimulationEvent(type="funding", dilution_percent=dilution, round="angel")]
    if multi_round:
        events.append(SimulationEvent(type="funding", dilution_percent=20, round="a"))

    return SimulatePayload(
        base_scheme=CurrentScheme(
            version="v1",
            allocations=[
                AllocationItem(member="张三", role="创始人", equity_percent=45),
                AllocationItem(member="李四", role="CTO", equity_percent=25),
            ],
            reserved_pool=12,
            unallocated=10,
        ),
        scenarios=[
            Scenario(name="天使轮融资", events=events),
        ],
    )
