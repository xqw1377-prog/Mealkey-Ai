"""
测试：API 端点集成测试
"""

import pytest
from httpx import AsyncClient, ASGITransport
from agent.main import app


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.fixture
async def client(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.anyio
async def test_health(client):
    resp = await client.get("/v1/agent/equity/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "capabilities" in data


@pytest.mark.anyio
async def test_design_equity_success(client):
    resp = await client.post("/v1/agent/equity", json={
        "user_id": "test-user",
        "action": "design_equity",
        "payload": {
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
        },
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.anyio
async def test_non_equity_returns_400(client):
    resp = await client.post("/v1/agent/equity", json={
        "user_id": "test-user",
        "action": "design_equity",
        "payload": {"text": "你好，今天天气怎么样"},
    })
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "NON_EQUITY_MESSAGE"


@pytest.mark.anyio
async def test_invalid_payload_returns_400(client):
    resp = await client.post("/v1/agent/equity", json={
        "user_id": "test-user",
        "action": "design_equity",
        "payload": {"text": "帮我设计股权分配"},
    })
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "INVALID_PARAMETER"


@pytest.mark.anyio
async def test_missing_user_id_returns_422(client):
    """缺少必填字段 user_id 应返回 422"""
    resp = await client.post("/v1/agent/equity", json={
        "action": "design_equity",
        "payload": {"project_name": "test"},
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_get_context(client):
    resp = await client.post("/v1/agent/equity", json={
        "user_id": "test-user",
        "action": "get_context",
        "payload": {"dummy": True},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"


@pytest.mark.anyio
async def test_reset_context(client):
    resp = await client.post("/v1/agent/equity", json={
        "user_id": "test-user",
        "action": "reset_context",
        "payload": {"dummy": True},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
