"""
标签体系测试
"""

from src.core.knowledge.tags import MarketTag, OpportunityTag, StrategyTag, tag_set


def test_market_tags():
    assert MarketTag.CITY_TIER_1.value == "一线城市"
    assert MarketTag.STAGE_GROWTH.value == "增长期"
    assert MarketTag.COMP_FRAGMENTED.value == "分散竞争"


def test_opportunity_tags():
    assert OpportunityTag.CATEGORY.value == "品类机会"
    assert OpportunityTag.DEMOGRAPHIC.value == "人群机会"


def test_strategy_tags():
    assert StrategyTag.POSITIONING.value == "定位"
    assert StrategyTag.DIFFERENTIATION.value == "差异化"


def test_tag_set():
    tags = tag_set("a", "b", "c")
    assert tags == ["a", "b", "c"]
