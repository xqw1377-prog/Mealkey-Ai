from ..city import CityProfile

ALL_CITIES: list[CityProfile] = []
CITY_MAP: dict[str, CityProfile] = {}


def _register(c: CityProfile) -> CityProfile:
    ALL_CITIES.append(c)
    CITY_MAP[c.city] = c
    return c


def get_city(name: str) -> CityProfile | None:
    return CITY_MAP.get(name)


def list_cities() -> list[str]:
    return [c.city for c in ALL_CITIES]


# ─── 长沙 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="长沙",
        population="约1050万",
        population_description="年轻人口占比高（平均年龄约35岁），流动人口活跃",
        consumer={
            "price_sensitive": "medium",
            "consumption_willingness": "high",
            "dining_frequency": "very_high",
            "key_trait": "爱消费、敢花钱、夜生活丰富",
        },
        dining_characteristics=[
            "夜消费极强（夜宵文化全国前列）",
            "社交消费为主（聚餐场景多）",
            "辣味偏好明显",
            "网红品牌接受度高",
            "排队文化强（愿意为热门品牌等待）",
        ],
        popular_categories=["湘菜", "小吃", "茶饮", "烧烤", "米粉"],
        opportunities=["年轻化地方菜系", "特色餐饮", "夜宵经济升级", "茶饮创新"],
        risks=["市场竞争激烈", "品牌迭代快", "租金上涨"],
        tier="新一线",
        tags=["夜经济", "辣味", "网红城市", "消费活跃"],
    )
)

# ─── 成都 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="成都",
        population="约2100万",
        population_description="人口基数大，消费文化浓厚，休闲气息强",
        consumer={
            "price_sensitive": "low",
            "consumption_willingness": "very_high",
            "dining_frequency": "very_high",
            "key_trait": "爱吃会吃，追求生活品质",
        },
        dining_characteristics=[
            "餐饮消费频率全国领先",
            "休闲餐饮文化强（茶馆/坝坝宴）",
            "麻辣口味主导但包容性强",
            "新品牌接受度高",
            "社区餐饮生态完善",
        ],
        popular_categories=["火锅", "川菜", "小吃", "茶饮", "串串"],
        opportunities=["社区餐饮升级", "休闲餐饮创新", "川菜品质化", "茶饮+空间"],
        risks=["竞争极度激烈", "品牌迭代快速", "同质化严重"],
        tier="新一线",
        tags=["美食之都", "休闲", "麻辣", "社区餐饮"],
    )
)

# ─── 上海 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="上海",
        population="约2500万",
        population_description="超大城市，消费分层明显，国际化程度高",
        consumer={
            "price_sensitive": "low",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "追求品质、体验、新潮，但也看重性价比",
        },
        dining_characteristics=[
            "餐饮多元化（全国+国际品类齐全）",
            "品质要求高",
            "网红打卡文化强",
            "外卖渗透率高",
            "商务和社交场景丰富",
        ],
        popular_categories=["咖啡", "西餐", "日料", "烘焙", "特色中餐"],
        opportunities=["精品餐饮", "异国料理", "健康轻食", "咖啡文化"],
        risks=["租金极高", "竞争饱和", "人力成本高", "消费者口味变化快"],
        tier="一线",
        tags=["国际化", "高消费", "品质导向", "多元化"],
    )
)

# ─── 深圳 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="深圳",
        population="约1800万",
        population_description="年轻移民城市，平均年龄约33岁，消费力强",
        consumer={
            "price_sensitive": "medium",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "务实消费，追求效率与品质平衡",
        },
        dining_characteristics=[
            "年轻消费为主",
            "快餐和简餐需求大",
            "夜宵文化较强",
            "全国化口味（无单一本地菜系主导）",
            "外卖和数字化接受度极高",
        ],
        popular_categories=["快餐", "茶饮", "湘菜", "烧烤", "咖啡"],
        opportunities=["品质快餐", "社区餐饮", "茶饮创新", "数字化餐饮"],
        risks=["租金高", "竞争激烈", "人员流动性大"],
        tier="一线",
        tags=["年轻城市", "效率导向", "移民城市", "数字化"],
    )
)

# ─── 杭州 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="杭州",
        population="约1250万",
        population_description="互联网之都，年轻人聚集，消费升级趋势明显",
        consumer={
            "price_sensitive": "low-medium",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "注重品质、环境和体验，互联网思维强",
        },
        dining_characteristics=[
            "品质餐饮需求旺盛",
            "网红餐饮和打卡文化强",
            "夜经济逐步发展",
            "互联网+餐饮创新活跃",
            "杭帮菜和融合菜受欢迎",
        ],
        popular_categories=["杭帮菜", "咖啡", "烘焙", "日料", "茶饮"],
        opportunities=["精品杭帮菜", "咖啡文化", "健康轻食", "互联网餐饮"],
        risks=["租金成本高", "消费者口味偏清淡限制品类"],
        tier="新一线",
        tags=["互联网", "品质生活", "杭帮菜", "消费升级"],
    )
)

# ─── 广州 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="广州",
        population="约1900万",
        population_description="老牌一线城市，饮食文化底蕴深厚，务实消费",
        consumer={
            "price_sensitive": "high",
            "consumption_willingness": "medium",
            "dining_frequency": "very_high",
            "key_trait": "务实、懂吃、追求性价比",
        },
        dining_characteristics=[
            "早茶文化深厚",
            "街边饮食文化发达",
            "对价格敏感但要求品质",
            "宵夜文化强",
            "对外来品类接受度中等（偏好粤式口味）",
        ],
        popular_categories=["粤菜", "茶点", "粥底火锅", "糖水", "烧腊"],
        opportunities=["粤菜品质升级", "新派茶点", "社区餐饮", "糖水创新"],
        risks=["口味偏好限制外来品类", "老龄化趋势", "老城区空心化"],
        tier="一线",
        tags=["美食之都", "务实消费", "粤菜", "茶文化"],
    )
)


# ─── 北京 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="北京",
        population="约2200万",
        population_description="超大城市，消费力强，多元化餐饮需求旺盛",
        consumer={
            "price_sensitive": "medium",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "追求品质和新潮，但也看重性价比",
        },
        dining_characteristics=[
            "餐饮品类多元化程度高",
            "社交餐饮需求强",
            "夜经济活跃",
            "老字号和新品牌并存",
            "社区餐饮生态逐步完善",
        ],
        popular_categories=["烤鸭", "火锅", "烧烤", "咖啡", "日料"],
        opportunities=["社区餐饮", "特色小吃升级", "品质快餐", "酒馆+餐饮"],
        risks=["租金极高", "人力成本高", "竞争饱和"],
        tier="一线",
        tags=["首都", "多元化", "社交餐饮", "老字号"],
    )
)


# ─── 重庆 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="重庆",
        population="约3200万",
        population_description="人口最多的直辖市，消费文化浓厚，生活节奏慢",
        consumer={
            "price_sensitive": "high",
            "consumption_willingness": "high",
            "dining_frequency": "very_high",
            "key_trait": "爱吃、爱社交、追求性价比",
        },
        dining_characteristics=[
            "火锅和串串是社交刚需",
            "夜宵文化极强",
            "小餐饮生态发达（社区小店为主）",
            "口味偏好麻辣",
            "对价格敏感但对品质有要求",
        ],
        popular_categories=["火锅", "串串", "烧烤", "小面", "江湖菜"],
        opportunities=["火锅细分", "社区餐饮升级", "烧烤品牌化", "重庆小面品质化"],
        risks=["品类单一化风险", "品牌化难度大", "本地竞争激烈"],
        tier="新一线",
        tags=["火锅之都", "夜宵", "麻辣", "性价比"],
    )
)


# ─── 武汉 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="武汉",
        population="约1400万",
        population_description="中部最大城市，大学生多，消费活力强",
        consumer={
            "price_sensitive": "medium",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "早餐文化强，乐于尝试新品牌",
        },
        dining_characteristics=[
            "早餐文化全国闻名（过早）",
            "小龙虾和烧烤是夜宵主力",
            "高校周边餐饮活跃",
            "新品牌接受度高",
            "口味兼容并包（辣/鲜/咸皆可）",
        ],
        popular_categories=["早餐小吃", "小龙虾", "烧烤", "热干面", "湘菜"],
        opportunities=["早餐品质升级", "小龙虾连锁化", "社区餐饮", "高校餐饮"],
        risks=["品类季节性明显（小龙虾）", "品牌化率低"],
        tier="新一线",
        tags=["早餐之都", "小龙虾", "高校经济", "中部枢纽"],
    )
)


# ─── 南京 ─────────────────────────────────────────────────────────
_register(
    CityProfile(
        city="南京",
        population="约950万",
        population_description="长三角重要城市，历史底蕴深厚，消费力中等偏上",
        consumer={
            "price_sensitive": "medium",
            "consumption_willingness": "high",
            "dining_frequency": "high",
            "key_trait": "偏向品质消费，注重环境和体验",
        },
        dining_characteristics=[
            "鸭类餐饮文化深厚（盐水鸭/烤鸭）",
            "小吃文化丰富",
            "菜品口味偏咸鲜",
            "夜经济逐步发展",
            "品质餐饮需求上升",
        ],
        popular_categories=["鸭类", "小吃", "淮扬菜", "咖啡", "烘焙"],
        opportunities=["鸭类品质升级", "淮扬菜年轻化", "社区餐饮", "咖啡文化"],
        risks=["人口规模限制", "口味偏保守", "租金成本上升"],
        tier="新一线",
        tags=["六朝古都", "鸭类", "淮扬菜", "品质消费"],
    )
)
