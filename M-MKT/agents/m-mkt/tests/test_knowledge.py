import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.core.knowledge import (
    ActionType,
    CaseStudy,
    CategoryKnowledge,
    CategoryLifecycle,
    CityProfile,
    CompetitionStructure,
    Condition,
    ConsumerStructure,
    DecisionRule,
    EntryAdvice,
    FailureMode,
    LifecycleStage,
    Operator,
    Rule,
    RuleAction,
    RuleEngine,
)
from src.core.knowledge.data import (
    ALL_CASES,
    ALL_CATEGORIES,
    ALL_CITIES,
    DEFAULT_RULES,
    get_case,
    get_category,
    get_city,
    list_categories,
    list_cities,
)

# ─── 品类知识测试 ─────────────────────────────────────────────────


def test_all_categories_loaded():
    assert len(ALL_CATEGORIES) == 10
    assert list_categories() == [
        "湘菜",
        "火锅",
        "烧烤",
        "咖啡",
        "茶饮",
        "快餐",
        "烘焙",
        "面馆",
        "日料",
        "西餐",
    ]


def test_get_category():
    cat = get_category("火锅")
    assert cat is not None
    assert cat.name == "火锅"
    assert cat.category_stage == "红海竞争期"
    assert cat.market_position == "餐饮第一大品类"


def test_get_category_not_found():
    assert get_category("不存在品类") is None


def test_category_consumer():
    cat = get_category("咖啡")
    assert cat is not None
    assert "20-35岁白领" in cat.consumer.core
    assert "商务人群" in cat.consumer.secondary
    assert "老年人" in cat.consumer.non_target


def test_category_competition():
    cat = get_category("茶饮")
    assert cat is not None
    assert "蜜雪冰城" in cat.competition.head_brands
    assert cat.competition.density == "very_high"


def test_category_failure_modes():
    cat = get_category("湘菜")
    assert len(cat.failure_modes) == 2
    assert cat.failure_modes[0].name == "定位模糊"
    assert cat.failure_modes[0].severity == "high"


def test_category_entry_advice():
    cat = get_category("火锅")
    assert "有差异化产品能力" in cat.entry_advice.suitable_for
    assert "跟风进入" in cat.entry_advice.unsuitable_for
    assert len(cat.entry_advice.recommended_positioning) > 0
    assert len(cat.entry_advice.key_warnings) > 0


def test_category_to_dict():
    cat = get_category("烧烤")
    d = cat.to_dict()
    assert d["name"] == "烧烤"
    assert d["category_stage"] == "快速增长期"
    assert len(d["opportunity"]) > 0
    assert len(d["failure_modes"]) > 0
    assert "suitable_for" in d["entry_advice"]


def test_category_lifecycle():
    cat = get_category("烘焙")
    assert cat.lifecycle is not None
    assert cat.lifecycle.stage == LifecycleStage.GROWTH
    assert cat.lifecycle.description != ""


# ─── 案例测试 ─────────────────────────────────────────────────────


def test_all_cases_loaded():
    assert len(ALL_CASES) >= 4


def test_get_case():
    c = get_case("海底捞案例")
    assert c is not None
    assert c.brand == "海底捞"
    assert c.category == "火锅"
    assert len(c.execution) > 0
    assert len(c.reusable_principles) > 0


def test_case_to_dict():
    c = get_case("瑞幸咖啡案例")
    d = c.to_dict()
    assert d["brand"] == "瑞幸咖啡"
    assert d["strategic_choice"] != ""
    assert d["success"] is True


# ─── 城市画像测试 ─────────────────────────────────────────────────


def test_all_cities_loaded():
    assert len(ALL_CITIES) >= 5


def test_get_city():
    c = get_city("长沙")
    assert c is not None
    assert c.population == "约1050万"
    assert any("夜消费极强" in dc for dc in c.dining_characteristics)


def test_get_city_not_found():
    assert get_city("不存在城市") is None


def test_city_to_dict():
    c = get_city("上海")
    d = c.to_dict()
    assert d["city"] == "上海"
    assert d["tier"] == "一线"
    assert "精品餐饮" in d["opportunities"]


def test_list_cities():
    cities = list_cities()
    assert "长沙" in cities
    assert "成都" in cities
    assert "上海" in cities


# ─── 规则引擎测试 ─────────────────────────────────────────────────


def test_default_rules_loaded():
    assert len(DEFAULT_RULES) >= 9


def test_condition_evaluate_eq():
    c = Condition(field="name", operator=Operator.EQ, value="火锅")
    assert c.evaluate({"name": "火锅"}) is True
    assert c.evaluate({"name": "烧烤"}) is False


def test_condition_evaluate_gt():
    c = Condition(field="score", operator=Operator.GT, value=3.0)
    assert c.evaluate({"score": 4.0}) is True
    assert c.evaluate({"score": 2.0}) is False


def test_condition_evaluate_in():
    c = Condition(field="stage", operator=Operator.IN, value=["成熟期", "红海期"])
    assert c.evaluate({"stage": "红海期"}) is True
    assert c.evaluate({"stage": "增长期"}) is False


def test_condition_evaluate_contains():
    c = Condition(field="tags", operator=Operator.CONTAINS, value="火锅")
    assert c.evaluate({"tags": ["火锅", "红海"]}) is True
    assert c.evaluate({"tags": ["烧烤"]}) is False


def test_condition_nested_field():
    c = Condition(field="category.stage", operator=Operator.EQ, value="成熟期")
    assert c.evaluate({"category": {"stage": "成熟期"}}) is True
    assert c.evaluate({"category": {"stage": "增长期"}}) is False


def test_rule_engine_add_and_list():
    engine = RuleEngine()
    rule = Rule(
        name="测试规则",
        conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
        actions=[RuleAction(type=ActionType.ADD_NOTE, params={"note": "测试"})],
    )
    engine.add_rule(rule)
    assert len(engine.list_rules()) == 1
    assert engine.get_rule("测试规则") is not None


def test_rule_engine_remove():
    engine = RuleEngine()
    engine.add_rule(Rule(name="r1", conditions=[], actions=[]))
    engine.add_rule(Rule(name="r2", conditions=[], actions=[]))
    assert engine.remove_rule("r1") is True
    assert engine.remove_rule("不存在") is False
    assert len(engine.list_rules()) == 1


def test_rule_engine_evaluate():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="得分高于3则加分",
            conditions=[Condition(field="score", operator=Operator.GT, value=3.0)],
            actions=[RuleAction(type=ActionType.ADJUST_SCORE, params={"delta": 0.5})],
        )
    )
    results = engine.evaluate({"score": 4.0})
    assert len(results) == 1
    assert results[0].triggered is True

    results2 = engine.evaluate({"score": 2.0})
    assert len(results2) == 0


def test_rule_engine_apply_adjustments():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="降分规则",
            conditions=[Condition(field="risk", operator=Operator.EQ, value="high")],
            actions=[
                RuleAction(
                    type=ActionType.ADJUST_SCORE, params={"delta": -0.5, "reason": "高风险降分"}
                )
            ],
        )
    )
    score, notes = engine.apply_score_adjustments({"risk": "high"}, 3.5)
    assert score == 3.0
    assert len(notes) > 0


def test_rule_engine_block_opportunity():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="阻断规则",
            conditions=[Condition(field="block", operator=Operator.EQ, value=True)],
            actions=[
                RuleAction(type=ActionType.BLOCK_OPPORTUNITY, params={"reason": "条件不符合"})
            ],
        )
    )
    score, notes = engine.apply_score_adjustments({"block": True}, 4.0)
    assert score == 0.0
    assert any("条件不符合" in n for n in notes)


def test_rule_engine_priority_order():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="低优先",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[],
            priority=10,
        )
    )
    engine.add_rule(
        Rule(
            name="高优先",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[],
            priority=100,
        )
    )
    rules = engine.list_rules()
    assert rules[0].name == "高优先"


def test_rule_by_category():
    engine = RuleEngine()
    engine.add_rule(Rule(name="品类规则1", conditions=[], actions=[], category="品类"))
    engine.add_rule(Rule(name="创业者规则", conditions=[], actions=[], category="创业者"))
    assert len(engine.list_rules(category="品类")) == 1
    assert len(engine.list_rules(category="创业者")) == 1
    assert len(engine.list_rules(category="不存在")) == 0


def test_condition_evaluate_neq():
    c = Condition(field="name", operator=Operator.NEQ, value="火锅")
    assert c.evaluate({"name": "烧烤"}) is True
    assert c.evaluate({"name": "火锅"}) is False


def test_condition_evaluate_gte():
    c = Condition(field="score", operator=Operator.GTE, value=3.0)
    assert c.evaluate({"score": 4.0}) is True
    assert c.evaluate({"score": 3.0}) is True
    assert c.evaluate({"score": 2.0}) is False


def test_condition_evaluate_lte():
    c = Condition(field="score", operator=Operator.LTE, value=3.0)
    assert c.evaluate({"score": 2.0}) is True
    assert c.evaluate({"score": 3.0}) is True
    assert c.evaluate({"score": 4.0}) is False


def test_condition_evaluate_not_in():
    c = Condition(field="stage", operator=Operator.NOT_IN, value=["衰退期", "创新期"])
    assert c.evaluate({"stage": "增长期"}) is True
    assert c.evaluate({"stage": "衰退期"}) is False


def test_rule_disabled():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="禁用规则",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[RuleAction(type=ActionType.ADJUST_SCORE, params={"delta": 1.0})],
            enabled=False,
        )
    )
    results = engine.evaluate({"x": 1})
    assert len(results) == 0


def test_rule_apply_adjustments_clamp_low():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="大幅降分",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[RuleAction(type=ActionType.ADJUST_SCORE, params={"delta": -10.0})],
        )
    )
    score, notes = engine.apply_score_adjustments({"x": 1}, 3.0)
    assert score == 0.0


def test_rule_apply_adjustments_clamp_high():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="大幅加分",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[RuleAction(type=ActionType.ADJUST_SCORE, params={"delta": 10.0})],
        )
    )
    score, notes = engine.apply_score_adjustments({"x": 1}, 3.0)
    assert score == 5.0


def test_rule_set_level():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="设置等级",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[RuleAction(type=ActionType.SET_LEVEL, params={"level": "高机会"})],
        )
    )
    results = engine.evaluate({"x": 1})
    assert len(results) == 1


def test_rule_suggest_positioning():
    engine = RuleEngine()
    engine.add_rule(
        Rule(
            name="建议定位",
            conditions=[Condition(field="x", operator=Operator.EQ, value=1)],
            actions=[
                RuleAction(type=ActionType.SUGGEST_POSITIONING, params={"suggestion": "高端路线"})
            ],
        )
    )
    results = engine.evaluate({"x": 1})
    assert len(results) == 1


def test_condition_type_error_returns_false():
    c = Condition(field="score", operator=Operator.GT, value="not_a_number")
    assert c.evaluate({"score": 3.0}) is False


def test_condition_missing_nested_field():
    c = Condition(field="a.b.c", operator=Operator.EQ, value=1)
    assert c.evaluate({"a": {"x": 1}}) is False
    assert c.evaluate({}) is False


# ─── CategoryKnowledge 直接创建测试 ────────────────────────────────


def test_create_category_direct():
    cat = CategoryKnowledge(
        name="测试品类",
        category_stage="增长期",
        market_position="测试",
        lifecycle=CategoryLifecycle(stage=LifecycleStage.GROWTH, description="测试增长期"),
        consumer=ConsumerStructure(core=["测试用户"]),
        growth_direction=["方向1"],
        competition=CompetitionStructure(density="medium"),
        opportunity=["机会1"],
        risk=["风险1"],
        failure_modes=[FailureMode(name="测试失败", description="测试", severity="high")],
        entry_advice=EntryAdvice(suitable_for=["适合的人"], unsuitable_for=["不适合的人"]),
    )
    d = cat.to_dict()
    assert d["name"] == "测试品类"
    assert d["lifecycle"]["stage"] == "增长期"
    assert d["consumer"]["core"] == ["测试用户"]


# ─── CaseStudy 直接创建测试 ───────────────────────────────────────


def test_create_case_direct():
    case = CaseStudy(
        name="测试案例",
        brand="测试品牌",
        category="测试品类",
        background="背景",
        market_environment="市场环境",
        competitive_problem="竞争问题",
        strategic_choice="战略选择",
        positioning="定位",
        execution=["执行1"],
        results="好结果",
        reusable_principles=["原则1"],
        decision_rules=[
            DecisionRule(
                conditions={"stage": "成熟期", "competition": "high"},
                judgement="不建议正面竞争",
                recommendation="寻找场景差异",
            ),
        ],
    )
    d = case.to_dict()
    assert d["name"] == "测试案例"
    assert d["positioning"] == "定位"
    assert "decision_rules" in d
    assert len(d["decision_rules"]) == 1
    assert d["decision_rules"][0]["judgement"] == "不建议正面竞争"
    assert d["decision_rules"][0]["recommendation"] == "寻找场景差异"


# ─── CityProfile 直接创建测试 ─────────────────────────────────────


def test_create_city_direct():
    city = CityProfile(
        city="测试市",
        population="100万",
        consumer={"price_sensitive": "high"},
        dining_characteristics=["测试文化"],
        popular_categories=["测试品类"],
        opportunities=["测试机会"],
        tier="三线",
    )
    d = city.to_dict()
    assert d["city"] == "测试市"
    assert d["tier"] == "三线"


if __name__ == "__main__":
    test_all_categories_loaded()
    test_get_category()
    test_get_category_not_found()
    test_category_consumer()
    test_category_competition()
    test_category_failure_modes()
    test_category_entry_advice()
    test_category_to_dict()
    test_category_lifecycle()
    test_all_cases_loaded()
    test_get_case()
    test_case_to_dict()
    test_all_cities_loaded()
    test_get_city()
    test_get_city_not_found()
    test_city_to_dict()
    test_list_cities()
    test_default_rules_loaded()
    test_condition_evaluate_eq()
    test_condition_evaluate_gt()
    test_condition_evaluate_in()
    test_condition_evaluate_contains()
    test_condition_nested_field()
    test_rule_engine_add_and_list()
    test_rule_engine_remove()
    test_rule_engine_evaluate()
    test_rule_engine_apply_adjustments()
    test_rule_engine_block_opportunity()
    test_rule_engine_priority_order()
    test_rule_by_category()
    test_create_category_direct()
    test_create_case_direct()
    test_create_city_direct()
    print("所有知识资产测试通过 ✓")
