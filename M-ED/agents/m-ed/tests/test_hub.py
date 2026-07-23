"""
测试：Agent Hub 核心调度
"""

import pytest
from agent.models.schemas import AgentRequest, AgentAction
from agent.hub import agent_hub
from agent.utils.errors import NonEquityMessageError, InvalidParameterError


class TestAgentHub:
    """测试 Agent Hub 调度"""

    def test_non_equity_message_rejected(self):
        """非股权消息应抛出 NonEquityMessageError"""
        request = AgentRequest(
            user_id="test-user",
            action=AgentAction.DESIGN_EQUITY,
            payload={"text": "你好，今天天气怎么样"},
        )
        with pytest.raises(NonEquityMessageError):
            agent_hub.process(request)

    def test_design_equity_success(self):
        """股权设计请求应成功"""
        request = AgentRequest(
            user_id="test-user",
            action=AgentAction.DESIGN_EQUITY,
            payload={
                "project_name": "TestProject",
                "project_stage": "seed",
                "team_members": [
                    {
                        "role": "创始人",
                        "name": "张三",
                        "contribution_type": "全职",
                        "responsibility": "产品与战略",
                    },
                    {
                        "role": "CTO",
                        "name": "李四",
                        "contribution_type": "全职",
                        "responsibility": "技术研发",
                    },
                ],
            },
        )
        response = agent_hub.process(request)
        assert response.status == "success"
        assert response.data is not None

    def test_invalid_action(self):
        """不支持的 action 应被 Pydantic 拦截"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AgentRequest(
                user_id="test-user",
                action="invalid_action",  # type: ignore
                payload={"text": "股权设计"},
            )

    def test_empty_payload(self):
        """空 payload 应被 Pydantic 拦截"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AgentRequest(
                user_id="test-user",
                action=AgentAction.DESIGN_EQUITY,
                payload={},
            )

    def test_session_management(self):
        """会话上下文管理"""
        request1 = AgentRequest(
            user_id="test-user",
            action=AgentAction.GET_CONTEXT,
            payload={"dummy": True},
        )
        response1 = agent_hub.process(request1)
        assert response1.status == "success"
        assert response1.session_id is not None

        # 第二次请求（使用同一个 session_id）
        request2 = AgentRequest(
            user_id="test-user",
            session_id=response1.session_id,
            action=AgentAction.GET_CONTEXT,
            payload={"dummy": True},
        )
        response2 = agent_hub.process(request2)
        assert response2.status == "success"

        # 重置会话
        request3 = AgentRequest(
            user_id="test-user",
            session_id=response1.session_id,
            action=AgentAction.RESET_CONTEXT,
            payload={"dummy": True},
        )
        response3 = agent_hub.process(request3)
        assert response3.status == "success"


class TestEquityRelatedOnly:
    """确保非股权消息不路由"""

    @pytest.mark.parametrize("message", [
        "你好",
        "在吗",
        "帮我写个代码",
        "今天天气如何",
        "你是AI吗",
        "推荐一首歌",
        "什么是机器学习",
        "帮我算一下1+1",
        "讲个笑话",
        "你会做产品设计吗",
    ])
    def test_non_equity_should_fail(self, message):
        """所有非股权消息都应该抛出 NonEquityMessageError"""
        request = AgentRequest(
            user_id="test",
            action=AgentAction.DESIGN_EQUITY,
            payload={"text": message},
        )
        with pytest.raises(NonEquityMessageError):
            agent_hub.process(request)

    @pytest.mark.parametrize("message", [
        "帮我设计股权分配",
        "股权结构怎么搭",
        "团队股权分配方案",
        "合伙人股权比例",
        "期权池设计",
        "融资稀释计算",
        "股权合规检查",
        "生成股权协议",
        "调整股权比例",
        "模拟融资场景",
    ])
    def test_equity_should_reach_handler(self, message):
        """股权相关消息应到达 handler（因 payload 不完整会抛 InvalidParameterError）"""
        request = AgentRequest(
            user_id="test",
            action=AgentAction.DESIGN_EQUITY,
            payload={"text": message},
        )
        # 非股权消息会抛 NonEquityMessageError；股权消息因 payload 不完整抛 InvalidParameterError
        # 只要不是 NonEquityMessageError 就说明意图分类正确
        with pytest.raises(InvalidParameterError):
            agent_hub.process(request)
