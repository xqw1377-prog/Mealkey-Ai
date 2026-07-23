"""
M-MKT 行业模型层

行业通用模型: 消费场景 / 价格带 / 品类生命周期
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PriceBand:
    name: str
    range_desc: str
    min_price: float
    max_price: float | None
    competitive_chars: str = ""
    typical_categories: list[str] = field(default_factory=list)
    entry_barrier: str = "low"


PRICE_BANDS: list[PriceBand] = [
    PriceBand(
        "超低价", "0-5元", 0, 5, "流量型产品，走量为主，品牌溢价空间极小", ["茶饮", "小吃", "早餐"]
    ),
    PriceBand(
        "低价位",
        "5-30元",
        5,
        30,
        "大众日常消费，价格敏感度高，连锁化率高",
        ["快餐", "茶饮", "面馆", "烘焙"],
    ),
    PriceBand(
        "中价位",
        "30-80元",
        30,
        80,
        "品质型消费，兼顾性价比与体验，竞争最激烈",
        ["火锅", "湘菜", "烧烤", "日料基本款"],
    ),
    PriceBand(
        "中高价位",
        "80-150元",
        80,
        150,
        "社交型消费，环境/服务权重上升，品牌溢价空间大",
        ["西餐", "日料", "精致中餐"],
    ),
    PriceBand(
        "高价位",
        "150-300元",
        150,
        300,
        "体验型消费，稀缺性和品牌力是关键",
        ["高端日料", "私房菜", "fine dining"],
    ),
    PriceBand(
        "奢侈级", "300元以上", 300, None, "极致体验，竞争不直接但客群极窄", ["高端餐饮", "米其林"]
    ),
]


@dataclass
class ConsumerScene:
    scene_type: str
    purpose: str
    typical_time: str = ""
    decision_factors: list[str] = field(default_factory=list)
    avg_group_size: str = "1-2人"
    key_demand: str = ""


CONSUMER_SCENES: list[ConsumerScene] = [
    ConsumerScene(
        "一人食", "日常果腹", "午市/晚市", ["价格", "出餐速度", "便利性"], "1人", "快+便宜"
    ),
    ConsumerScene(
        "朋友社交",
        "聚餐交流",
        "晚市/周末",
        ["氛围", "口味普适性", "可拍照性"],
        "2-4人",
        "氛围+社交属性",
    ),
    ConsumerScene(
        "家庭聚餐",
        "家庭用餐",
        "晚市/周末午市",
        ["口味均衡", "性价比", "儿童友好", "环境"],
        "3-5人",
        "全家都接受",
    ),
    ConsumerScene(
        "商务宴请", "商务接待", "晚市", ["档次", "私密性", "服务", "排面"], "4-8人", "彰显档次"
    ),
    ConsumerScene(
        "外卖场景", "懒人/加班", "全时段", ["价格", "配送速度", "包装"], "1-2人", "方便+快"
    ),
    ConsumerScene(
        "下午茶", "休闲时光", "14:00-17:00", ["颜值", "性价比", "出片率"], "2-3人", "轻社交+拍照"
    ),
    ConsumerScene(
        "夜宵", "夜间消费", "21:00-02:00", ["口味重", "性价比", "营业时间"], "2-4人", "过瘾+便宜"
    ),
]


def find_price_band(price: float) -> PriceBand | None:
    for band in PRICE_BANDS:
        if band.min_price <= price and (band.max_price is None or price <= band.max_price):
            return band
    return None


def find_scene(scene_type: str) -> ConsumerScene | None:
    for s in CONSUMER_SCENES:
        if s.scene_type == scene_type:
            return s
    return None
