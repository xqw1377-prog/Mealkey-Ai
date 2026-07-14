from ..rules import ActionType, Condition, Operator, Rule, RuleAction

DEFAULT_RULES: list[Rule] = [
    # ─── 品类规则 ────────────────────────────────────────────────
    Rule(
        name="品类成熟度高+竞争密度高+无明显差异→降分",
        description="品类处于成熟/红海期且竞争密度高时，若无明显差异化则降低评分",
        category="品类",
        priority=90,
        conditions=[
            Condition(
                field="category.category_stage",
                operator=Operator.IN,
                value=["成熟竞争期", "红海竞争期"],
            ),
            Condition(
                field="category.competition.density",
                operator=Operator.IN,
                value=["high", "very_high"],
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": -0.5, "reason": "成熟品类高竞争降低评分"},
            ),
            RuleAction(type=ActionType.ADD_NOTE, params={"note": "建议进入细分定位或差异化切入"}),
        ],
    ),
    Rule(
        name="品类增长期→加分",
        description="品类处于增长期时，市场红利存在，适当加分",
        category="品类",
        priority=80,
        conditions=[
            Condition(
                field="category.category_stage",
                operator=Operator.IN,
                value=["快速增长期", "增长期"],
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": 0.3, "reason": "增长期品类享受市场红利"},
            ),
        ],
    ),
    # ─── 创业者规则 ──────────────────────────────────────────────
    Rule(
        name="首次创业+资金低+模型复杂→降分",
        description="创业者经验不足且资金有限时，复杂商业模式风险高",
        category="创业者",
        priority=100,
        conditions=[
            Condition(field="entrepreneur.experience", operator=Operator.EQ, value="首次创业"),
            Condition(
                field="entrepreneur.capital_level", operator=Operator.IN, value=["low", "very_low"]
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": -0.8, "reason": "首次创业资金不足风险溢价"},
            ),
            RuleAction(
                type=ActionType.ADD_WARNING, params={"warning": "建议选择模型简单、投入低的品类"}
            ),
        ],
    ),
    Rule(
        name="经验丰富+资金充足→加分",
        description="有经验的创业者资金充足时，成功概率更高",
        category="创业者",
        priority=80,
        conditions=[
            Condition(
                field="entrepreneur.experience", operator=Operator.IN, value=["丰富", "多次创业"]
            ),
            Condition(
                field="entrepreneur.capital_level",
                operator=Operator.IN,
                value=["high", "very_high"],
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": 0.4, "reason": "成熟创业者+充足资金加分"},
            ),
        ],
    ),
    # ─── 品类+创业者组合规则 ────────────────────────────────────
    Rule(
        name="高频品类+供应链成熟→加分",
        description="消费频次高且供应链成熟的品类，商业基础稳固",
        category="组合",
        priority=70,
        conditions=[
            Condition(
                field="category.category_stage",
                operator=Operator.IN,
                value=["增长期", "成熟竞争期"],
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": 0.2, "reason": "高频成熟品类商业基础好"},
            ),
        ],
    ),
    Rule(
        name="火锅/茶饮高竞争品类+无明显差异→阻断",
        description="在火锅/茶饮等极高竞争品类中无差异化则不建议进入",
        category="品类",
        priority=95,
        conditions=[
            Condition(field="category.name", operator=Operator.IN, value=["火锅", "茶饮"]),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADD_WARNING,
                params={"warning": "火锅/茶饮竞争极烈，需明确差异化定位"},
            ),
        ],
    ),
    # ─── 城市规则 ────────────────────────────────────────────────
    Rule(
        name="一线城市高竞争品类→降分",
        description="一线城市核心竞争领域进入成本高",
        category="城市",
        priority=85,
        conditions=[
            Condition(field="city.tier", operator=Operator.EQ, value="一线"),
            Condition(
                field="category.competition.density",
                operator=Operator.IN,
                value=["high", "very_high"],
            ),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": -0.3, "reason": "一线城市高竞争品类压力大"},
            ),
        ],
    ),
    Rule(
        name="城市消费文化匹配品类→加分",
        description="品类的口味/场景与城市消费文化匹配时加分",
        category="城市",
        priority=75,
        conditions=[
            Condition(field="city_popular_match", operator=Operator.EQ, value=True),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE,
                params={"delta": 0.3, "reason": "城市消费文化与品类匹配"},
            ),
        ],
    ),
    # ─── 案例匹配规则 ────────────────────────────────────────────
    Rule(
        name="有相似成功案例→加分",
        description="存在与当前项目相似的成功案例时加分",
        category="案例",
        priority=70,
        conditions=[
            Condition(field="has_similar_case", operator=Operator.EQ, value=True),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADJUST_SCORE, params={"delta": 0.2, "reason": "有相似成功案例参考"}
            ),
            RuleAction(
                type=ActionType.ADD_NOTE, params={"note": "建议深入研究相似案例的可复用原则"}
            ),
        ],
    ),
    Rule(
        name="品类有明确失败模式→提示",
        description="品类有明确的已知失败模式时给出预警",
        category="品类",
        priority=80,
        conditions=[
            Condition(field="has_failure_modes", operator=Operator.EQ, value=True),
        ],
        actions=[
            RuleAction(
                type=ActionType.ADD_NOTE, params={"note": "该品类有已知失败模式，建议仔细评估风险"}
            ),
        ],
    ),
]
