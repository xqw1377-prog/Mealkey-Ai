"""
M-ED 股权决策引擎 — 验证脚本

Usage:
    python demo.py                        # 运行全部 5 个能力验证
    python demo.py design                 # 仅验证股权设计
    python demo.py adjust                 # 仅验证调整建议
    python demo.py simulate               # 仅验证场景模拟
    python demo.py compliance             # 仅验证合规检查
    python demo.py document               # 仅验证文档生成
    python demo.py non-equity "你好吗"    # 验证非股权过滤
"""

import sys
import os
import json

# 设置控制台编码为 UTF-8
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    os.environ["PYTHONIOENCODING"] = "utf-8"

from agent.models.schemas import AgentRequest, AgentAction
from agent.hub import agent_hub
from agent.utils.errors import NonEquityMessageError, InvalidParameterError


# 检查 LLM 是否可用（有 API Key）
_has_llm = bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))
_model_label = "LLM" if _has_llm else "RuleEngine(退路)"


def run_test(name: str, request: AgentRequest):
    """执行一次请求并打印结果"""
    try:
        response = agent_hub.process(request)
        print(f"  [OK] [{name}] status={response.status}")
        if response.data:
            data_str = json.dumps(response.data, ensure_ascii=False, indent=2)
            if len(data_str) > 1000:
                print(f"       data: {data_str[:500]}...")
            else:
                print(f"       data: {data_str}")
        return True
    except NonEquityMessageError as e:
        print(f"  [REJECTED] [{name}] {e.message}")
        return False
    except InvalidParameterError as e:
        print(f"  [INVALID] [{name}] {e.message}")
        return False
    except Exception as e:
        print(f"  [ERROR] [{name}] {type(e).__name__}: {e}")
        return False


def test_design():
    print("\n" + "=" * 60)
    print("1. 股权结构设计")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.DESIGN_EQUITY,
        payload={
            "project_name": "MyStartup",
            "project_stage": "seed",
            "team_members": [
                {"role": "创始人", "name": "张三", "contribution_type": "全职", "responsibility": "产品与战略"},
                {"role": "CTO", "name": "李四", "contribution_type": "全职", "responsibility": "技术研发"},
            ],
        },
    )
    return run_test("design_equity", request)


def test_adjust():
    print("\n" + "=" * 60)
    print("2. 动态调整建议")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.ADJUST_EQUITY,
        payload={
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
                "description": "完成 MVP 上线，DAU 达到 1000",
                "completed_by": ["张三", "李四"],
            },
            "contributions": [
                {"member": "张三", "period": "2024-Q1", "achievements": ["完成产品设计", "获得首批客户", "搭建团队"]},
                {"member": "李四", "period": "2024-Q1", "achievements": ["完成 MVP 开发", "系统架构设计"]},
            ],
            "adjustment_type": "milestone",
        },
    )
    return run_test("adjust_equity", request)


def test_simulate():
    print("\n" + "=" * 60)
    print("3. 场景模拟")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.SIMULATE,
        payload={
            "base_scheme": {
                "version": "v1",
                "allocations": [
                    {"member": "张三", "role": "创始人", "equity_percent": 45},
                    {"member": "李四", "role": "CTO", "equity_percent": 25},
                ],
                "reserved_pool": 12,
                "unallocated": 10,
            },
            "scenarios": [
                {
                    "name": "天使轮融资 500 万，出让 15%",
                    "events": [{"type": "funding", "amount": 5000000, "dilution_percent": 15, "round": "angel"}],
                },
                {
                    "name": "连续融资：天使轮 15% → A 轮 20%",
                    "events": [
                        {"type": "funding", "amount": 5000000, "dilution_percent": 15, "round": "angel"},
                        {"type": "funding", "amount": 20000000, "dilution_percent": 20, "round": "a"},
                    ],
                },
            ],
        },
    )
    return run_test("simulate", request)


def test_compliance():
    print("\n" + "=" * 60)
    print("4. 合规检查")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.COMPLIANCE_CHECK,
        payload={
            "scheme": {
                "allocations": [
                    {"member": "张三", "role": "创始人", "equity_percent": 51, "equity_type": "普通股"},
                    {"member": "李四", "role": "CTO", "equity_percent": 25, "equity_type": "受限股"},
                ],
                "reserved_pool": 12,
                "vesting_terms": {"standard": {"total_months": 48, "cliff_months": 12}},
            },
            "jurisdiction": "china",
            "check_items": ["vesting", "equity_types", "ip_transfer", "tax", "founder_protection"],
        },
    )
    return run_test("compliance_check", request)


def test_document():
    print("\n" + "=" * 60)
    print("5. 文档生成")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.GENERATE_DOCUMENT,
        payload={
            "document_type": "equity_agreement_draft",
            "scheme_version": "v1",
            "scheme_data": {
                "project_name": "MyStartup",
                "date": "2025-07-01",
                "parties": [
                    {"name": "张三", "role": "创始人", "equity_percent": 51},
                    {"name": "李四", "role": "CTO", "equity_percent": 25},
                ],
                "vesting_terms": {"total_months": 48, "cliff_months": 12},
            },
            "output_format": "markdown",
        },
    )
    return run_test("generate_document", request)


def test_non_equity(text: str):
    print("\n" + "=" * 60)
    print(f"6. 非股权过滤: '{text}'")
    print("=" * 60)
    request = AgentRequest(
        user_id="demo-user",
        action=AgentAction.DESIGN_EQUITY,
        payload={"text": text},
    )
    return run_test("non_equity_filter", request)


def test_session():
    print("\n" + "=" * 60)
    print("7. 会话上下文管理")
    print("=" * 60)
    request1 = AgentRequest(
        user_id="demo-user",
        action=AgentAction.GET_CONTEXT,
        payload={"dummy": True},
    )
    resp1 = agent_hub.process(request1)
    sid = resp1.session_id
    print(f"  ✓ 创建会话: {sid[:8]}...")

    request2 = AgentRequest(
        user_id="demo-user",
        session_id=sid,
        action=AgentAction.GET_CONTEXT,
        payload={"dummy": True},
    )
    resp2 = agent_hub.process(request2)
    print(f"  ✓ 获取上下文: session_id={resp2.session_id[:8]}...")

    request3 = AgentRequest(
        user_id="demo-user",
        session_id=sid,
        action=AgentAction.RESET_CONTEXT,
        payload={"dummy": True},
    )
    resp3 = agent_hub.process(request3)
    print(f"  ✓ 重置上下文: {resp3.data['message']}")
    return True


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] == "all":
        test_design()
        test_adjust()
        test_simulate()
        test_compliance()
        test_document()
        test_session()
    elif args[0] == "design":
        test_design()
    elif args[0] == "adjust":
        test_adjust()
    elif args[0] == "simulate":
        test_simulate()
    elif args[0] == "compliance":
        test_compliance()
    elif args[0] == "document":
        test_document()
    elif args[0] == "non-equity" and len(args) > 1:
        test_non_equity(args[1])
    elif args[0] == "session":
        test_session()
    else:
        print("Usage: python demo.py [design|adjust|simulate|compliance|document|non-equity <text>|session|all]")

    print("\n完成!")
