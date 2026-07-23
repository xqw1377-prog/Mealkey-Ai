from ..category import (
    CategoryKnowledge,
    CategoryLifecycle,
    CompetitionStructure,
    ConsumerStructure,
    EntryAdvice,
    FailureMode,
    LifecycleStage,
)

ALL_CATEGORIES: list[CategoryKnowledge] = []
CATEGORY_MAP: dict[str, CategoryKnowledge] = {}


def _register(cat: CategoryKnowledge) -> CategoryKnowledge:
    ALL_CATEGORIES.append(cat)
    CATEGORY_MAP[cat.name] = cat
    return cat


def get_category(name: str) -> CategoryKnowledge | None:
    return CATEGORY_MAP.get(name)


def list_categories() -> list[str]:
    return [c.name for c in ALL_CATEGORIES]


# ─── 1. 湘菜 ─────────────────────────────────────────────────────
CAT_XIANGCAI = _register(
    CategoryKnowledge(
        name="湘菜",
        category_stage="成熟竞争期",
        market_position="全国化传统大品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="全国覆盖度高，品牌梯队成型"
        ),
        consumer=ConsumerStructure(
            core=["25-45岁家庭用户", "年轻辣味爱好者"],
            secondary=["商务宴请", "朋友社交聚餐"],
            non_target=["不吃辣人群", "高端商务接待"],
        ),
        growth_direction=["年轻化", "小店化", "特色化", "品质升级"],
        competition=CompetitionStructure(
            head_brands=["费大厨", "炊烟时代", "彭厨"],
            regional_brands=["地方湘菜品牌", "社区湘菜馆"],
            small_players="大量夫妻老婆店",
            density="high",
            problem="同质化严重，价格竞争激烈",
        ),
        opportunity=[
            "年轻湘菜（国潮+辣味）",
            "区域特色湘菜（地方菜系细分）",
            "场景升级（品质湘菜）",
            "湘菜快餐化",
        ],
        risk=["价格竞争加剧", "厨师依赖度高", "食材成本波动"],
        failure_modes=[
            FailureMode(
                name="定位模糊", description="无法清晰区分与普通湘菜的差异", severity="high"
            ),
            FailureMode(
                name="厨师依赖", description="核心菜品依赖大厨，难以标准化", severity="high"
            ),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有供应链资源", "能做差异化的团队", "熟悉湖南文化"],
            unsuitable_for=["完全没有餐饮经验", "资金不足50万"],
            recommended_positioning=["社区品质湘菜", "湘菜+场景升级", "年轻化湘菜快餐"],
            key_warnings=["避免直接与头部品牌价格竞争", "重视菜品标准化"],
        ),
        tags=["湘菜", "辣味", "大品类", "全国化"],
    )
)

# ─── 2. 火锅 ─────────────────────────────────────────────────────
CAT_HOTPOT = _register(
    CategoryKnowledge(
        name="火锅",
        category_stage="红海竞争期",
        market_position="餐饮第一大品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.RED_OCEAN, description="竞争极度激烈，头部品牌集中"
        ),
        consumer=ConsumerStructure(
            core=["18-40岁社交消费者", "朋友聚餐"],
            secondary=["家庭聚餐", "情侣约会"],
            non_target=["一人食刚需", "老年人"],
        ),
        growth_direction=["社区化", "品质化", "特色锅底", "一人食"],
        competition=CompetitionStructure(
            head_brands=["海底捞", "呷哺呷哺", "巴奴"],
            regional_brands=["地方火锅品牌", "社区火锅店"],
            small_players="大量街边火锅店",
            density="very_high",
            problem="品牌集中度提高，同质化严重",
        ),
        opportunity=[
            "社区高品质火锅",
            "特色锅底（如糟粕醋、酸汤）",
            "火锅+（火锅+烧烤/酒馆）",
            "下沉市场品质火锅",
        ],
        risk=["头部品牌挤压", "租金成本高", "季节性明显", "食材成本上涨"],
        failure_modes=[
            FailureMode(
                name="无差异进入", description="普通火锅店无差异化难以生存", severity="high"
            ),
            FailureMode(name="过度加盟", description="加盟扩张失控导致品牌崩塌", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有差异化产品能力", "供应链基础好", "社区场景资源"],
            unsuitable_for=["跟风进入", "资金不足100万", "一线城市核心商圈"],
            recommended_positioning=["社区精品火锅", "特色锅底专门店", "下沉市场品质火锅"],
            key_warnings=["不要做普通火锅", "重视锅底差异化", "控制租金成本"],
        ),
        tags=["火锅", "社交", "红海", "大品类"],
    )
)

# ─── 3. 烧烤 ─────────────────────────────────────────────────────
CAT_BBQ = _register(
    CategoryKnowledge(
        name="烧烤",
        category_stage="快速增长期",
        market_position="年轻化高增长品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.GROWTH, description="品类持续增长，细分机会多"
        ),
        consumer=ConsumerStructure(
            core=["18-35岁年轻消费者", "夜宵场景"],
            secondary=["朋友聚会", "家庭周末"],
            non_target=["健康饮食人群", "老年人"],
        ),
        growth_direction=["品牌化", "室内化", "特色化", "全时段"],
        competition=CompetitionStructure(
            head_brands=["木屋烧烤", "很久以前", "丰茂"],
            regional_brands=["地方烧烤连锁", "露天大排档"],
            small_players="大量街边摊/小店",
            density="high",
            problem="食品安全问题突出，品牌化率低",
        ),
        opportunity=["品牌烧烤连锁", "特色细分烧烤（日式/韩式/东北）", "烧烤+酒馆", "外卖烧烤升级"],
        risk=["环保政策收紧", "季节性波动", "产品同质化"],
        failure_modes=[
            FailureMode(
                name="食品安全事故", description="烧烤品类食品安全风险高", severity="critical"
            ),
            FailureMode(name="季节性亏损", description="冬季客流下降导致亏损", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有品牌运营能力", "年轻化团队", "夜宵场景资源"],
            unsuitable_for=["无法控制食品安全的团队", "资金紧张"],
            recommended_positioning=["特色烧烤专门店", "烧烤+社交场景"],
            key_warnings=["重视食品安全与环保合规", "考虑全时段运营"],
        ),
        tags=["烧烤", "夜宵", "增长期", "年轻化"],
    )
)

# ─── 4. 咖啡 ─────────────────────────────────────────────────────
CAT_COFFEE = _register(
    CategoryKnowledge(
        name="咖啡",
        category_stage="快速增长期",
        market_position="高增长高潜力品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.GROWTH, description="中国市场渗透率持续提升，年增20%+"
        ),
        consumer=ConsumerStructure(
            core=["20-35岁白领", "学生"],
            secondary=["商务人群", "自由职业者"],
            non_target=["传统茶饮消费者", "老年人"],
        ),
        growth_direction=["下沉市场", "平价咖啡", "精品咖啡", "咖啡+简餐"],
        competition=CompetitionStructure(
            head_brands=["瑞幸", "星巴克", "库迪"],
            regional_brands=["地方精品咖啡品牌", "独立咖啡馆"],
            small_players="大量独立咖啡店",
            density="medium",
            problem="头部价格战激烈，独立店生存压力大",
        ),
        opportunity=["下沉市场咖啡", "精品社区咖啡", "咖啡+烘焙/简餐", "中式茶咖创新"],
        risk=["头部品牌价格战", "租金成本高", "人才短缺"],
        failure_modes=[
            FailureMode(name="价格战无力应对", description="面对瑞幸9.9无法竞争", severity="high"),
            FailureMode(name="位置选择失误", description="咖啡高度依赖选址", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["咖啡文化理解者", "有社区资源", "能做差异化产品"],
            unsuitable_for=["纯投资者", "一线城市核心竞争区"],
            recommended_positioning=["社区精品咖啡", "特色主题咖啡", "下沉市场咖啡"],
            key_warnings=["避开与瑞幸星巴克正面竞争", "重视社区运营和复购"],
        ),
        tags=["咖啡", "增长期", "年轻化", "高频"],
    )
)

# ─── 5. 茶饮 ─────────────────────────────────────────────────────
CAT_TEA = _register(
    CategoryKnowledge(
        name="茶饮",
        category_stage="成熟竞争期",
        market_position="高渗透高竞争品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="市场渗透率极高，增速放缓"
        ),
        consumer=ConsumerStructure(
            core=["15-30岁年轻女性", "学生"],
            secondary=["白领下午茶", "社交场景"],
            non_target=["健康养生人群", "中老年男性"],
        ),
        growth_direction=["健康化", "茶底升级", "供应链整合", "出海"],
        competition=CompetitionStructure(
            head_brands=["喜茶", "奈雪", "蜜雪冰城", "古茗"],
            regional_brands=["地方茶饮品牌"],
            small_players="加盟店为主的大量个体店",
            density="very_high",
            problem="产品同质化严重，依赖上新速度",
        ),
        opportunity=["健康茶饮（0糖/养生）", "区域特色茶饮", "茶饮+烘焙", "下沉市场品质升级"],
        risk=["同质化竞争", "原材料成本上涨", "消费者忠诚度低"],
        failure_modes=[
            FailureMode(name="无差异化", description="产品无特色，被市场淘汰", severity="high"),
            FailureMode(name="过度加盟", description="加盟扩张导致品控崩塌", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["产品研发能力强", "供应链资源", "品牌运营经验"],
            unsuitable_for=["无产品差异化的纯加盟模式", "一线城市"],
            recommended_positioning=["健康功能茶饮", "区域特色茶饮", "茶饮+场景体验"],
            key_warnings=["必须有核心产品差异化", "供应链是护城河"],
        ),
        tags=["茶饮", "成熟期", "年轻女性", "高竞争"],
    )
)

# ─── 6. 快餐 ─────────────────────────────────────────────────────
CAT_FAST_FOOD = _register(
    CategoryKnowledge(
        name="快餐",
        category_stage="成熟竞争期",
        market_position="刚需高频最大品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="刚需品类，市场成熟，品牌化率提升中"
        ),
        consumer=ConsumerStructure(
            core=["25-40岁上班族", "学生"],
            secondary=["家庭简餐", "外卖场景"],
            non_target=["高端社交消费", "慢食人群"],
        ),
        growth_direction=["品质升级", "数字化", "社区化", "全时段"],
        competition=CompetitionStructure(
            head_brands=["麦当劳", "肯德基", "老乡鸡", "大米先生"],
            regional_brands=["地方快餐连锁"],
            small_players="大量街边快餐店",
            density="high",
            problem="利润薄，依赖效率",
        ),
        opportunity=["社区品质快餐", "地方特色快餐", "健康快餐", "快餐+小酒馆"],
        risk=["人力成本上升", "租金压力", "外卖平台抽成高"],
        failure_modes=[
            FailureMode(name="效率不足", description="出餐速度跟不上导致客流流失", severity="high"),
            FailureMode(name="品质不稳定", description="标准化程度低导致口碑崩塌", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["运营效率高手", "供应链强", "数字化能力"],
            unsuitable_for=["不懂效率管理的团队", "资金不足"],
            recommended_positioning=["地方特色快餐", "健康品质快餐", "社区食堂模式"],
            key_warnings=["效率是快餐的生命线", "重视外卖运营"],
        ),
        tags=["快餐", "刚需", "高频", "效率"],
    )
)

# ─── 7. 烘焙 ─────────────────────────────────────────────────────
CAT_BAKERY = _register(
    CategoryKnowledge(
        name="烘焙",
        category_stage="增长期",
        market_position="上升期高潜力品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.GROWTH, description="消费升级+烘焙文化普及，持续增长"
        ),
        consumer=ConsumerStructure(
            core=["20-35岁女性", "家庭妈妈"],
            secondary=["下午茶消费者", "礼品场景"],
            non_target=["低碳水饮食人群", "价格敏感型刚需"],
        ),
        growth_direction=["精品化", "现烤现做", "国潮糕点", "烘焙+饮品"],
        competition=CompetitionStructure(
            head_brands=["好利来", "鲍师傅", "泸溪河"],
            regional_brands=["地方烘焙品牌", "独立面包店"],
            small_players="大量社区面包店",
            density="medium",
            problem="保质期短，损耗高",
        ),
        opportunity=["国潮中式糕点", "社区精品烘焙", "健康烘焙（低糖/低脂）", "烘焙+下午茶场景"],
        risk=["原材料成本波动", "保质期管理难", "季节性波动"],
        failure_modes=[
            FailureMode(name="损耗失控", description="烘焙损耗率过高导致亏损", severity="high"),
            FailureMode(name="产品无特色", description="与普通面包店无差异", severity="high"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有烘焙技术", "产品创新能力强", "社区资源"],
            unsuitable_for=["不懂损耗管理", "资金不足30万"],
            recommended_positioning=["国潮糕点", "社区精品烘焙", "健康烘焙专门店"],
            key_warnings=["控制损耗是盈利关键", "产品持续创新能力决定寿命"],
        ),
        tags=["烘焙", "增长期", "女性", "精品化"],
    )
)

# ─── 8. 面馆 ─────────────────────────────────────────────────────
CAT_NOODLE = _register(
    CategoryKnowledge(
        name="面馆",
        category_stage="成熟竞争期",
        market_position="传统刚需大品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="南北通吃的刚需品类，品牌化进行中"
        ),
        consumer=ConsumerStructure(
            core=["25-50岁工薪阶层", "家庭消费"],
            secondary=["学生", "一人食"],
            non_target=["高端餐饮场景", "低碳水饮食人群"],
        ),
        growth_direction=["品牌化", "地方特色面", "小酒馆模式", "全时段"],
        competition=CompetitionStructure(
            head_brands=["和府捞面", "马记永", "遇见小面"],
            regional_brands=["地方面馆品牌", "老字号面馆"],
            small_players="大量街边面馆",
            density="high",
            problem="品牌化率低，街边店为主",
        ),
        opportunity=["地方特色面升级", "社区品质面馆", "面+小吃/卤味", "快餐化面馆"],
        risk=["同质化竞争", "原材料成本上涨", "手工面标准化难"],
        failure_modes=[
            FailureMode(name="口味不稳定", description="面条口感依赖人工", severity="high"),
            FailureMode(name="场景单一", description="只做午市导致坪效低", severity="medium"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有面食技术积累", "能做标准化", "社区资源"],
            unsuitable_for=["无餐饮经验", "追求高客单价"],
            recommended_positioning=["地方特色面馆", "社区品质面馆", "面+场景升级"],
            key_warnings=["平衡标准化与口感", "考虑全时段运营提升坪效"],
        ),
        tags=["面馆", "刚需", "大品类", "品牌化"],
    )
)

# ─── 9. 日料 ─────────────────────────────────────────────────────
CAT_JAPANESE = _register(
    CategoryKnowledge(
        name="日料",
        category_stage="成熟竞争期",
        market_position="中等规模品质品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="市场成熟，消费者认知度高"
        ),
        consumer=ConsumerStructure(
            core=["20-35岁年轻消费者", "白领"],
            secondary=["情侣约会", "商务轻宴请"],
            non_target=["生食接受度低人群", "中老年传统消费者"],
        ),
        growth_direction=["平价化", "单品类专门店", "外卖化", "国产食材替代"],
        competition=CompetitionStructure(
            head_brands=["元气寿司", "争鲜", "村上一屋"],
            regional_brands=["地方日料品牌", "独立日料店"],
            small_players="大量小型日料店",
            density="medium",
            problem="食材依赖进口，成本高",
        ),
        opportunity=[
            "平价日料（回转/外卖）",
            "单品类专门店（烧鸟/鳗鱼）",
            "日式定食",
            "国产食材日料",
        ],
        risk=["食材成本上涨", "食品安全敏感", "消费者尝鲜后复购不足"],
        failure_modes=[
            FailureMode(name="食材成本失控", description="进口食材价格波动大", severity="high"),
            FailureMode(
                name="食品安全事故", description="生食品类食品安全风险高", severity="critical"
            ),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["食材供应链强", "能做差异化", "了解日料文化"],
            unsuitable_for=["食品安全意识不足", "资金紧张"],
            recommended_positioning=["平价日料专门店", "单品类日料", "日式定食"],
            key_warnings=["食品安全是底线", "控制食材成本"],
        ),
        tags=["日料", "年轻化", "品质感", "中等规模"],
    )
)

# ─── 10. 西餐 ────────────────────────────────────────────────────
CAT_WESTERN = _register(
    CategoryKnowledge(
        name="西餐",
        category_stage="成熟竞争期",
        market_position="中等规模差异化品类",
        lifecycle=CategoryLifecycle(
            stage=LifecycleStage.MATURITY, description="市场成熟，消费者分化明显"
        ),
        consumer=ConsumerStructure(
            core=["25-40岁中高收入人群", "情侣"],
            secondary=["商务宴请", "亲子家庭"],
            non_target=["价格敏感型", "传统中餐偏好者"],
        ),
        growth_direction=["轻量化", "平价化", "西餐+酒吧", "单品专门店"],
        competition=CompetitionStructure(
            head_brands=["必胜客", "萨莉亚", "Wagas"],
            regional_brands=["地方西餐品牌", "独立西餐厅"],
            small_players="大量独立西餐/咖啡厅",
            density="medium",
            problem="消费者基数有限，偏小众",
        ),
        opportunity=["轻西餐（简餐/外卖）", "平价西餐", "西餐+小酒馆", "单品西餐（牛排/意面）"],
        risk=["食材成本高", "目标客群有限", "低频消费"],
        failure_modes=[
            FailureMode(name="定位过高", description="客单价超出目标客群承受力", severity="high"),
            FailureMode(name="场景单一", description="仅晚餐经营，坪效低", severity="medium"),
        ],
        entry_advice=EntryAdvice(
            suitable_for=["有西餐经验", "能做差异化定位", "商圈资源好"],
            unsuitable_for=["纯餐饮新手", "三四线城市"],
            recommended_positioning=["轻西餐简餐", "西餐+酒馆模式", "平价西餐"],
            key_warnings=["客单价要匹配商圈", "全时段运营提升坪效"],
        ),
        tags=["西餐", "品质感", "中等规模", "差异化"],
    )
)
