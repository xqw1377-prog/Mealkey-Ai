"""
测试：Handler 单元测试
"""

import pytest
from agent.handlers.design import handle_design_equity
from agent.handlers.adjust import handle_adjust_equity
from agent.handlers.simulate import handle_simulate
from agent.handlers.compliance import handle_compliance_check
from agent.handlers.document import handle_generate_document
from agent.utils.llm import LLMEngine
from agent.utils.errors import InvalidParameterError


@pytest.fixture
def llm():
    return LLMEngine()


class TestDesignEquity:
    """股权结构设计 handler 测试"""

    def test_success(self, llm):
        payload = {
            "project_name": "TestProject",
            "project_stage": "seed",
            "team_members": [
                {
                    "role": "创始人",
                    "name": "张三",
                    "contribution_type": "全职",
                    "responsibility": "产品与战略",
                },
            ],
        }
        result = handle_design_equity(payload, llm)
        assert "scheme" in result or "mock" in result

    def test_missing_required_field(self, llm):
        payload = {"project_name": "TestProject"}
        with pytest.raises(InvalidParameterError):
            handle_design_equity(payload, llm)

    def test_empty_team_members(self, llm):
        payload = {
            "project_name": "TestProject",
            "project_stage": "seed",
            "team_members": [],
        }
        with pytest.raises(InvalidParameterError):
            handle_design_equity(payload, llm)

    def test_equity_range_exceeds_100(self, llm):
        payload = {
            "project_name": "TestProject",
            "project_stage": "seed",
            "team_members": [
                {
                    "role": "创始人",
                    "name": "张三",
                    "contribution_type": "全职",
                    "responsibility": "产品",
                    "expected_equity_range": {"min": 60, "max": 70},
                },
                {
                    "role": "CTO",
                    "name": "李四",
                    "contribution_type": "全职",
                    "responsibility": "技术",
                    "expected_equity_range": {"min": 50, "max": 60},
                },
            ],
        }
        with pytest.raises(InvalidParameterError):
            handle_design_equity(payload, llm)


class TestAdjustEquity:
    """动态调整 handler 测试"""

    def test_success(self, llm):
        payload = {
            "current_scheme": {
                "version": "v1",
                "allocations": [
                    {"member": "张三", "role": "创始人", "equity_percent": 50},
                    {"member": "李四", "role": "CTO", "equity_percent": 30},
                ],
                "reserved_pool": 10,
                "unallocated": 10,
            },
            "trigger_event": {
                "type": "milestone_completion",
                "description": "完成 MVP",
                "completed_by": ["张三"],
            },
            "contributions": [
                {
                    "member": "张三",
                    "period": "2024-Q1",
                    "achievements": ["完成产品设计", "获得首批客户"],
                },
            ],
            "adjustment_type": "milestone",
        }
        result = handle_adjust_equity(payload, llm)
        assert "adjustment_suggestion" in result or "mock" in result

    def test_missing_trigger_event(self, llm):
        payload = {
            "current_scheme": {
                "version": "v1",
                "allocations": [],
            },
        }
        with pytest.raises(InvalidParameterError):
            handle_adjust_equity(payload, llm)


class TestSimulate:
    """场景模拟 handler 测试"""

    def test_success(self, llm):
        payload = {
            "base_scheme": {
                "version": "v1",
                "allocations": [
                    {"member": "张三", "role": "创始人", "equity_percent": 50},
                    {"member": "李四", "role": "CTO", "equity_percent": 30},
                ],
                "reserved_pool": 10,
                "unallocated": 10,
            },
            "scenarios": [
                {
                    "name": "天使轮融资",
                    "events": [
                        {
                            "type": "funding",
                            "dilution_percent": 20,
                            "round": "天使轮",
                        },
                    ],
                },
            ],
        }
        result = handle_simulate(payload, llm)
        assert "scenarios" in result or "mock" in result

    def test_empty_scenarios(self, llm):
        payload = {
            "base_scheme": {
                "version": "v1",
                "allocations": [],
            },
            "scenarios": [],
        }
        with pytest.raises(InvalidParameterError):
            handle_simulate(payload, llm)


class TestComplianceCheck:
    """合规检查 handler 测试"""

    def test_success(self, llm):
        payload = {
            "scheme": {
                "allocations": [
                    {"member": "张三", "role": "创始人", "equity_percent": 50},
                ],
                "reserved_pool": 10,
                "vesting_terms": {"standard": {"total_months": 48, "cliff_months": 12}},
            },
            "jurisdiction": "china",
            "check_items": ["vesting", "ip_transfer", "tax"],
        }
        result = handle_compliance_check(payload, llm)
        assert "checks" in result or "mock" in result

    def test_invalid_jurisdiction(self, llm):
        payload = {
            "scheme": {
                "allocations": [],
                "reserved_pool": 0,
                "vesting_terms": {},
            },
            "jurisdiction": "invalid_country",
            "check_items": ["vesting"],
        }
        with pytest.raises(InvalidParameterError):
            handle_compliance_check(payload, llm)


class TestGenerateDocument:
    """文档生成 handler 测试"""

    def test_success(self, llm):
        payload = {
            "document_type": "equity_agreement_draft",
            "scheme_version": "v1",
            "scheme_data": {
                "project_name": "TestProject",
                "date": "2024-01-01",
                "parties": [
                    {"name": "张三", "role": "创始人", "equity_percent": 50},
                ],
            },
            "output_format": "markdown",
        }
        result = handle_generate_document(payload, llm)
        assert "document" in result or "mock" in result
        # 检查免责声明
        if "document" in result:
            assert "disclaimer" in result["document"]

    def test_invalid_document_type(self, llm):
        payload = {
            "document_type": "invalid_type",
            "scheme_version": "v1",
            "scheme_data": {},
        }
        with pytest.raises(InvalidParameterError):
            handle_generate_document(payload, llm)
