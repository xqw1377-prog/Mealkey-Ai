"""
M-MKT 标准化标签体系

三级标签: 市场 / 机会 / 战略
"""

from __future__ import annotations

from enum import StrEnum


class MarketTag(StrEnum):
    """市场标签 — 描述市场环境特征"""

    # 城市层级
    CITY_TIER_1 = "一线城市"
    CITY_TIER_2 = "新一线城市"
    CITY_TIER_3 = "二线城市"
    CITY_TIER_4 = "下沉市场"
    # 品类阶段
    STAGE_INNOVATION = "创新期"
    STAGE_GROWTH = "增长期"
    STAGE_MATURE = "成熟期"
    STAGE_RED_OCEAN = "红海期"
    STAGE_DECLINE = "衰退期"
    # 价格带
    PRICE_LOW = "低价位"
    PRICE_MID = "中价位"
    PRICE_HIGH = "高价位"
    PRICE_LUXURY = "奢侈级"
    # 竞争结构
    COMP_FRAGMENTED = "分散竞争"
    COMP_CONCENTRATED = "集中竞争"
    COMP_VERY_HIGH = "极度竞争"


class OpportunityTag(StrEnum):
    """机会标签 — 描述市场机会类型"""

    CATEGORY = "品类机会"
    DEMOGRAPHIC = "人群机会"
    SCENE = "场景机会"
    PRICE = "价格机会"
    REGION = "区域机会"
    CHANNEL = "渠道机会"
    BRAND = "品牌机会"
    TECH = "技术机会"


class StrategyTag(StrEnum):
    """战略标签 — 描述战略类型"""

    POSITIONING = "定位"
    DIFFERENTIATION = "差异化"
    GROWTH = "增长"
    EXPANSION = "扩张"
    FAILURE = "失败"
    FOCUS = "聚焦"
    COST_LEADERSHIP = "成本领先"
    INNOVATION = "创新"
    PARTNERSHIP = "合作"


def tag_set(*tags: str) -> list[str]:
    return list(tags)
