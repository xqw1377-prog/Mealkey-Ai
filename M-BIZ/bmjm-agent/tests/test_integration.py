"""集成测试 — API 端点 + 全链路 + 边界场景"""

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import Industry, Stage, Scale
from app.models.schemas import (
    JudgeRequest, EnterpriseInfo, BusinessModelData, JudgeConfig,
    ValueProposition, CustomerSegments, Channels, CustomerRelationships,
    RevenueStreams,
)
from app.engine.inference import InferenceEngine
from app.engine.ecc import ECCController
from app.models.ecc_schemas import VerificationResult, VerificationStatus

client = TestClient(app)


# ============================================================
# 1. 健康检查
# ============================================================

def test_health():
    resp = client.get("/api/v1/bmjm/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


# ============================================================
# 2. 判断端点
# ============================================================

def test_judge_basic():
    """基本判断请求"""
    payload = {
        "request_id": "int_test_001",
        "enterprise": {"name": "测试企业", "industry": "saas", "stage": "growth", "scale": "mid"},
        "business_model_data": {
            "value_proposition": {
                "description": "AI 智能客服平台",
                "pain_points": ["客服成本高", "响应效率低"],
                "differentiation": "AI 驱动",
            },
            "revenue_streams": {
                "types": ["monthly_subscription"],
                "mrr": 100000,
                "arpu": 2000,
                "top_revenue_share": 0.9,
            },
        },
    }
    resp = client.post("/api/v1/bmjm/judge", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 0
    assert data["data"] is not None
    result = data["data"]
    assert len(result["dimension_scores"]) == 9
    assert "overall_health" in result
    assert "strategic_suggestions" in result
    # 验证不算死账
    for s in result["strategic_suggestions"]:
        assert s.get("verification_action", ""), f"Suggestion missing verification: {s['action']}"


def test_judge_missing_industry():
    """无效行业值"""
    payload = {
        "request_id": "int_test_bad",
        "enterprise": {"name": "测试", "industry": "invalid_industry", "stage": "growth", "scale": "mid"},
    }
    resp = client.post("/api/v1/bmjm/judge", json=payload)
    # Pydantic 会返回 422
    assert resp.status_code == 422


def test_judge_minimal_data():
    """最小输入 — 只有企业信息"""
    payload = {
        "request_id": "int_test_min",
        "enterprise": {"name": "最小测试", "industry": "saas", "stage": "seed", "scale": "smb"},
    }
    resp = client.post("/api/v1/bmjm/judge", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 0


# ============================================================
# 3. 校验端点
# ============================================================

def test_validate_valid():
    payload = {
        "request": {
            "request_id": "val_test",
            "enterprise": {"name": "测试", "industry": "saas", "stage": "growth", "scale": "mid"},
        }
    }
    resp = client.post("/api/v1/bmjm/validate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # 缺少数据应有 warnings 但 valid=true
    assert data["code"] == 0


# ============================================================
# 4. 画像端点
# ============================================================

def test_list_profiles():
    resp = client.get("/api/v1/bmjm/profiles")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]["profiles"]) >= 8


def test_get_profile():
    resp = client.get("/api/v1/bmjm/profiles/PROF-SAAS-001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["profile_id"] == "PROF-SAAS-001"


def test_get_profile_not_found():
    resp = client.get("/api/v1/bmjm/profiles/NONEXIST")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] != 0  # 业务错误


# ============================================================
# 5. 基准端点
# ============================================================

def test_list_benchmarks():
    resp = client.get("/api/v1/bmjm/benchmarks")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]["benchmarks"]) >= 7


def test_get_benchmark():
    resp = client.get("/api/v1/bmjm/benchmarks/saas")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["industry"] == "saas"


# ============================================================
# 6. 规则端点
# ============================================================

def test_list_rules():
    resp = client.get("/api/v1/bmjm/rules")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]["rules"]) >= 80


# ============================================================
# 7. 批处理端点
# ============================================================

def test_batch_submit_and_query():
    payload = {
        "task_id": "batch_int_test",
        "entries": [
            {
                "request_id": "b001",
                "enterprise": {"name": "企业A", "industry": "saas", "stage": "growth", "scale": "mid"},
                "business_model_data": {
                    "revenue_streams": {"types": ["subscription"], "mrr": 50000},
                },
            },
            {
                "request_id": "b002",
                "enterprise": {"name": "企业B", "industry": "ecommerce", "stage": "mature", "scale": "large"},
            },
        ],
    }
    # 提交
    resp = client.post("/api/v1/bmjm/judge/batch", json=payload)
    assert resp.status_code == 200
    submit_data = resp.json()
    assert submit_data["data"]["status"] == "pending"
    assert submit_data["data"]["total_entries"] == 2

    task_id = submit_data["data"]["task_id"]

    # 查询状态
    import time
    time.sleep(1)
    resp2 = client.get(f"/api/v1/bmjm/judge/batch/{task_id}")
    assert resp2.status_code == 200
    status_data = resp2.json()
    assert status_data["data"]["status"] in ("completed", "processing", "partial")

    # 查询结果
    resp3 = client.get(f"/api/v1/bmjm/judge/batch/{task_id}/results")
    assert resp3.status_code == 200
    result_data = resp3.json()
    if result_data["data"]["status"] == "completed":
        assert len(result_data["data"]["results"]) == 2


# ============================================================
# 8. 认知链对话端点
# ============================================================

def test_chat_new_session():
    """新会话"""
    resp = client.post("/api/v1/bmjm/chat", json={
        "enterprise_name": "集成测试",
        "industry": "saas",
        "stage": "seed",
        "message": "我们做AI客服，帮电商降低成本",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["session_id"] != ""
    assert data["data"]["current_layer"] in ("L1",)
    assert data["data"]["progress"] > 0


def test_chat_multi_round():
    """多轮对话走完认知链"""
    # 创建会话并发送完整的第一条消息
    resp = client.post("/api/v1/bmjm/chat", json={
        "enterprise_name": "多轮测试",
        "industry": "saas",
        "stage": "growth",
        "message": "我们做AI智能客服，服务中小电商企业，降低客服成本",
    })
    assert resp.status_code == 200
    session_id = resp.json()["data"]["session_id"]

    # 持续补充信息直到走出 L1（最多 10 轮）
    fallback_msgs = [
        "按月订阅收费，月收入20万，客单价2000",
        "通过小红书获客，CAC 8000，月流失率3%",
        "主要竞品Zendesk，核心团队来自大厂",
        "客户是中小电商，痛点客服成本高，AI全渠道智能客服",
        "订阅收费，月收入20万，CAC 8000，月流失3%",
    ]
    final_layer = "L1"
    for i in range(10):
        msg = fallback_msgs[i] if i < len(fallback_msgs) else "客户是中小电商，AI客服降低成本"
        resp = client.post("/api/v1/bmjm/chat", json={
            "session_id": session_id,
            "message": msg,
        })
        assert resp.status_code == 200, f"Round {i} failed"
        final_layer = resp.json()["data"]["current_layer"]
        if final_layer in ("L4", "L5"):
            break

    # 至少到了 L4
    assert final_layer in ("L4", "L5"), f"Only reached {final_layer} after 10 rounds"


def test_chat_quick_scan():
    """快速扫描 L1→L3"""
    resp = client.post("/api/v1/bmjm/chat/scan", json={
        "enterprise_name": "快速扫描",
        "industry": "saas",
        "stage": "growth",
        "message": "我们做AI客服，月收入10万，通过小红书获客",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["dimension_scores"] is not None


def test_chat_directed_analysis():
    """定向推理 L2→L4"""
    resp = client.post("/api/v1/bmjm/chat/analyze/CH", json={
        "enterprise_name": "定向分析",
        "industry": "saas",
        "stage": "growth",
        "message": "我们做AI客服，通过小红书获客，CAC 8000",
    })
    assert resp.status_code == 200
    data = resp.json()
    # 过滤后建议只包含 CH 维度
    if data["data"]["suggestions"]:
        for s in data["data"]["suggestions"]:
            assert s["dimension"] == "CH", f"Expected CH, got {s['dimension']}"


def test_chat_session_query():
    """查询会话状态"""
    # 先创建一个会话
    resp = client.post("/api/v1/bmjm/chat", json={
        "enterprise_name": "状态查询",
        "message": "我们做AI产品",
    })
    session_id = resp.json()["data"]["session_id"]

    # 查询
    resp2 = client.get(f"/api/v1/bmjm/chat/session/{session_id}")
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["data"]["session_id"] == session_id


# ============================================================
# 9. 边界场景
# ============================================================

def test_all_industries():
    """验证所有行业枚举都能正常调用"""
    engine = InferenceEngine()
    for ind in Industry:
        req = JudgeRequest(
            request_id=f"ind_test_{ind.value}",
            enterprise=EnterpriseInfo(name=f"测试{ind.value}", industry=ind, stage=Stage.GROWTH, scale=Scale.MID),
        )
        result = engine.judge(req)
        assert result.overall_health is not None
        assert len(result.dimension_scores) == 9


def test_all_stages_weight():
    """验证所有阶段权重切换正常"""
    engine = InferenceEngine()
    for stage in Stage:
        req = JudgeRequest(
            request_id=f"stage_test_{stage.value}",
            enterprise=EnterpriseInfo(name=f"阶段{stage.value}", industry=Industry.SAAS, stage=stage, scale=Scale.MID),
        )
        result = engine.judge(req)
        assert 0 <= result.overall_health.score <= 1


def test_empty_business_model():
    """空 BusinessModelData 不应崩溃"""
    engine = InferenceEngine()
    req = JudgeRequest(
        request_id="empty_test",
        enterprise=EnterpriseInfo(name="空数据", industry=Industry.SAAS, stage=Stage.SEED, scale=Scale.SMB),
    )
    result = engine.judge(req)
    # 应该有结果，只是分低
    assert result.overall_health is not None
    assert result.overall_health.score < 0.5  # 因为没数据，分数低


def test_extreme_cac():
    """极端 CAC 值"""
    engine = InferenceEngine()
    req = JudgeRequest(
        request_id="cac_extreme",
        enterprise=EnterpriseInfo(name="极端CAC", industry=Industry.SAAS, stage=Stage.GROWTH, scale=Scale.MID),
        business_model_data=BusinessModelData(
            channels=Channels(cac=1000000),
        ),
    )
    result = engine.judge(req)
    assert result is not None


def test_verification_cycle():
    """验证回注全流程"""
    ecc = ECCController()
    session = ecc.create_session("回注测试", "saas", "growth")

    messages = [
        "我们做AI客服，面向中小电商",
        "按月订阅收费，月收入10万",
        "小红书获客，CAC 5000，月流失率3%",
        "主要竞品Zendesk",
    ]
    for msg in messages:
        resp = ecc.process_message(session.session_id, msg)

    # 强制完成到 L5
    s = ecc.get_session(session.session_id)
    if s.current_layer.value != "L5":
        # 补充信息
        ecc.process_message(session.session_id, "核心团队来自大厂，AI算法是优势")

    s = ecc.get_session(session.session_id)

    # 提交各种回注结果
    if s.verification_tasks:
        # pass
        task = s.verification_tasks[0]
        r1 = VerificationResult(result=VerificationStatus.PASS, conclusion="验证通过", new_insights=["客户反馈正面"])
        ecc.submit_verification(s.session_id, task.task_id, r1)

        # 如果有多条，测 partial_pass
        if len(s.verification_tasks) > 1:
            task2 = s.verification_tasks[1]
            r2 = VerificationResult(result=VerificationStatus.PARTIAL_PASS, conclusion="部分通过")
            ecc.submit_verification(s.session_id, task2.task_id, r2)

        # 验证回注后重新推理
        s2 = ecc.get_session(s.session_id)
        assert len(s2.rule_judgments) > 0


# ============================================================
# 10. 并发/快速调用
# ============================================================

def test_concurrent_judge():
    """快速连续调用不崩溃"""
    engine = InferenceEngine()
    for i in range(10):
        req = JudgeRequest(
            request_id=f"stress_{i}",
            enterprise=EnterpriseInfo(name=f"压力{i}", industry=Industry.SAAS, stage=Stage.GROWTH, scale=Scale.MID),
        )
        result = engine.judge(req)
        assert result.overall_health is not None
