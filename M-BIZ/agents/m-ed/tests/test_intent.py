"""
测试：意图识别模块 — 非股权消息过滤
"""

import pytest
from agent.classifiers.intent import (
    validate_and_classify,
    is_equity_related,
    classify_action,
    IntentType,
)
from agent.utils.errors import NonEquityMessageError


class TestIsEquityRelated:
    """测试 is_equity_related 函数"""

    def test_strong_equity_keywords(self):
        """强信号股权关键词应该被识别"""
        texts = [
            "帮我设计一个股权分配方案",
            "我们团队需要分配股权",
            "这个股权结构需要调整",
            "期权池应该预留多少",
            "天使轮融资股权稀释问题",
        ]
        for text in texts:
            is_related, reason, confidence = is_equity_related(text)
            assert is_related, f"应识别为股权相关: '{text}'"
            assert confidence >= 0.9, f"置信度应 >= 0.9: '{text}'"

    def test_weak_equity_keywords(self):
        """弱信号股权关键词组合应该被识别"""
        texts = [
            "团队三个人怎么分配比例",
            "创始人持股方案",
            "技术合伙人股权设计",
        ]
        for text in texts:
            is_related, reason, confidence = is_equity_related(text)
            assert is_related, f"应识别为股权相关: '{text}'"

    def test_non_equity_messages(self):
        """非股权消息应该被拒绝"""
        texts = [
            "你好",
            "在吗",
            "今天天气怎么样",
            "你是谁",
            "你能做什么",
            "帮我写个PRD",
            "这个bug怎么修",
            "推荐一部电影",
            "什么是区块链",
            "给我讲个笑话",
        ]
        for text in texts:
            is_related, reason, confidence = is_equity_related(text)
            assert not is_related, f"应拒绝非股权消息: '{text}'"


class TestValidateAndClassify:
    """测试 validate_and_classify — 核心入口"""

    def test_non_equity_raises_error(self):
        """非股权消息应抛出 NonEquityMessageError"""
        non_equity_texts = [
            "你好啊",
            "今天天气不错",
            "你会做什么",
            "帮我算个税",
            "推荐一本书",
        ]
        for text in non_equity_texts:
            with pytest.raises(NonEquityMessageError):
                validate_and_classify(text)

    def test_equity_design_intent(self):
        """股权设计意图识别"""
        texts = [
            ("帮我设计股权分配方案", IntentType.DESIGN_EQUITY),
            ("我们三个合伙人怎么分股份", IntentType.DESIGN_EQUITY),
            ("股权结构怎么设计", IntentType.DESIGN_EQUITY),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent == expected_intent, f"'{text}' 应识别为 {expected_intent}，实际: {intent}"

    def test_adjust_intent(self):
        """股权调整意图识别"""
        texts = [
            ("需要调整股权比例", IntentType.ADJUST_EQUITY),
            ("CTO的持股需要修改", IntentType.ADJUST_EQUITY),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent == expected_intent, f"'{text}' 应识别为 {expected_intent}"

    def test_simulate_intent(self):
        """场景模拟意图识别"""
        texts = [
            ("模拟一下融资后的股权变化", IntentType.SIMULATE),
            ("如果天使轮稀释会怎么样", IntentType.SIMULATE),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent == expected_intent, f"'{text}' 应识别为 {expected_intent}"

    def test_compliance_intent(self):
        """合规检查意图识别"""
        texts = [
            ("检查一下这个方案是否合规", IntentType.COMPLIANCE_CHECK),
            ("股权方案的风险审查", IntentType.COMPLIANCE_CHECK),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent == expected_intent, f"'{text}' 应识别为 {expected_intent}"

    def test_document_intent(self):
        """文档生成意图识别"""
        texts = [
            ("生成股权协议", IntentType.GENERATE_DOCUMENT),
            ("帮我生成股东协议", IntentType.GENERATE_DOCUMENT),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent == expected_intent, f"'{text}' 应识别为 {expected_intent}"


class TestEdgeCases:
    """边界情况测试"""

    def test_empty_text(self):
        """空文本应拒绝"""
        with pytest.raises(NonEquityMessageError):
            validate_and_classify("")

    def test_whitespace_text(self):
        """空白文本应拒绝"""
        with pytest.raises(NonEquityMessageError):
            validate_and_classify("   ")

    def test_mixed_equity_and_non_equity(self):
        """混合内容中如果包含强信号词，应识别为股权相关"""
        intent, metadata = validate_and_classify("你好，我想咨询一下股权设计的问题")
        assert intent != IntentType.NON_EQUITY

    def test_english_equity_terms(self):
        """英文股权术语应识别"""
        texts = [
            ("design equity for my startup", IntentType.DESIGN_EQUITY),
            ("equity allocation plan", IntentType.DESIGN_EQUITY),
        ]
        for text, expected_intent in texts:
            intent, metadata = validate_and_classify(text)
            assert intent is not None
