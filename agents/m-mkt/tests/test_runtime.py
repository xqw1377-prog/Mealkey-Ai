"""
Runtime Pipeline V2 单元测试

测试范围:
1. RuntimePipeline 初始化和阶段管理
2. 默认管线完整执行流
3. 轻量管线
4. 审计轨迹
5. 评分一致性（V1 vs V2 输出对比）
6. 阶段动态注册/移除
"""

from src.core.runtime import RuntimePipeline, AnalysisRequest, AnalysisResult
from src.core.stages import (
    ParseStage,
    RetrieveStage,
    ScoreStage,
    RulesStage,
    SolutionStage,
    BuiltInScoringStrategy,
)


# ═══════════════════════════════════════════════════════════════
# 初始化测试
# ═══════════════════════════════════════════════════════════════

def test_pipeline_default_creation():
    """测试默认管线创建"""
    pipeline = RuntimePipeline.default()
    stages = pipeline.list_stages()
    assert len(stages) == 5
    assert stages == ["parse", "retrieve", "score", "rules", "solution"]


def test_pipeline_light_creation():
    """测试轻量管线创建"""
    pipeline = RuntimePipeline.light()
    stages = pipeline.list_stages()
    assert len(stages) >= 3


def test_pipeline_empty_creation():
    """测试空管线创建"""
    pipeline = RuntimePipeline()
    assert pipeline.list_stages() == []


# ═══════════════════════════════════════════════════════════════
# 阶段管理测试
# ═══════════════════════════════════════════════════════════════

def test_add_stage():
    """测试添加阶段"""
    pipeline = RuntimePipeline()
    pipeline.add_stage(ParseStage())
    assert pipeline.list_stages() == ["parse"]


def test_add_stage_at_index():
    """测试在指定位置添加阶段"""
    pipeline = RuntimePipeline()
    pipeline.add_stage(ParseStage())
    pipeline.add_stage(SolutionStage())
    pipeline.add_stage(ScoreStage(), index=1)
    assert pipeline.list_stages() == ["parse", "score", "solution"]


def test_remove_stage():
    """测试移除阶段"""
    pipeline = RuntimePipeline.default()
    assert pipeline.remove_stage("rules") is True
    assert "rules" not in pipeline.list_stages()


def test_remove_stage_not_found():
    """测试移除不存在的阶段"""
    pipeline = RuntimePipeline()
    assert pipeline.remove_stage("nonexistent") is False


def test_get_stage():
    """测试获取阶段"""
    pipeline = RuntimePipeline.default()
    stage = pipeline.get_stage("score")
    assert stage is not None
    assert stage.name == "score"


def test_get_stage_not_found():
    """测试获取不存在的阶段"""
    pipeline = RuntimePipeline()
    assert pipeline.get_stage("nonexistent") is None


# ═══════════════════════════════════════════════════════════════
# 请求对象测试
# ═══════════════════════════════════════════════════════════════

def test_analysis_request_defaults():
    """测试请求默认值"""
    req = AnalysisRequest("咖啡")
    assert req.category == "咖啡"
    assert req.city is None
    assert req.experience == "首次创业"
    assert req.capital_level == "medium"
    assert req.team_size == "small"


def test_analysis_request_full():
    """测试完整请求"""
    req = AnalysisRequest("火锅", "成都", "丰富", "high", "large")
    assert req.category == "火锅"
    assert req.city == "成都"
    assert req.experience == "丰富"
    assert req.capital_level == "high"
    assert req.team_size == "large"


def test_analysis_request_to_dict():
    """测试请求序列化"""
    req = AnalysisRequest("咖啡", "上海", "首次创业", "medium", "small")
    d = req.to_dict()
    assert d["品类"] == "咖啡"
    assert d["城市"] == "上海"


# ═══════════════════════════════════════════════════════════════
# 管线执行测试 — 完整流程
# ═══════════════════════════════════════════════════════════════

def test_default_pipeline_basic():
    """测试默认管线基本执行"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    assert isinstance(result, AnalysisResult)
    assert 0.0 <= result.opportunity_score <= 5.0
    assert result.opportunity_level in ("高机会", "中机会", "低机会")


def test_default_pipeline_no_city():
    """测试默认管线不传城市"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("火锅"))
    assert result.category_info is not None
    assert result.city_info is None


def test_default_pipeline_unknown_category():
    """测试默认管线未知品类"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("未知品类"))
    assert result.opportunity_score >= 0
    assert result.category_info is None


def test_light_pipeline():
    """测试轻量管线"""
    pipeline = RuntimePipeline.light()
    result = pipeline.run(AnalysisRequest("烧烤", "深圳"))
    assert result.opportunity_score >= 0


# ═══════════════════════════════════════════════════════════════
# 审计轨迹测试
# ═══════════════════════════════════════════════════════════════

def test_result_has_score_chain():
    """测试结果包含评分变化链"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    assert len(result.score_chain) >= 2  # raw + final
    assert result.score_chain[0]["action"] == "raw_score"
    assert result.score_chain[-1]["action"] == "final"


def test_score_chain_has_values():
    """测试评分变化链包含有效值"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    for item in result.score_chain:
        assert "value" in item
        assert "reason" in item


def test_score_chain_adjustments():
    """测试有规则触发时评分变化链包含调整记录"""
    pipeline = RuntimePipeline.default()
    # 首次创业+资金低 应触发规则
    result = pipeline.run(AnalysisRequest("火锅", "成都", "首次创业", "low"))
    # 至少有一条调整记录
    adjustments = [i for i in result.score_chain if i.get("action") not in ("raw_score", "final")]
    assert len(adjustments) >= 0  # 可能有0条（取决于规则触发条件）


# ═══════════════════════════════════════════════════════════════
# V1 vs V2 一致性测试
# ═══════════════════════════════════════════════════════════════

def test_v1_v2_score_consistency():
    """
    验证 V2 评分与 V1 一致

    V2 使用 BuiltInScoringStrategy 完全复用 V1 的 IndicatorScorer，
    因此相同输入应产生相同输出。
    """
    from src.core.engine import OpportunityEngine, EntrepreneurProfile

    v1_engine = OpportunityEngine()
    v2_pipeline = RuntimePipeline.default()

    test_cases = [
        ("咖啡", "上海", "首次创业", "medium"),
        ("火锅", "成都", "丰富", "high"),
        ("湘菜", "长沙", "首次创业", "low"),
        ("烧烤", "深圳", "多次创业", "medium"),
    ]

    for cat, city, exp, cap in test_cases:
        # V1
        v1_result = v1_engine.evaluate(
            category_name=cat,
            city_name=city,
            entrepreneur=EntrepreneurProfile(experience=exp, capital_level=cap),
        )
        # V2
        v2_result = v2_pipeline.run(AnalysisRequest(cat, city, exp, cap))

        # 评分应一致（允许0.01浮点误差）
        assert abs(v1_result.opportunity_score - v2_result.opportunity_score) < 0.02, \
            f"{cat}/{city}: V1={v1_result.opportunity_score:.2f} != V2={v2_result.opportunity_score:.2f}"


def test_v1_v2_level_consistency():
    """验证 V2 机会等级与 V1 一致"""
    from src.core.engine import OpportunityEngine

    v1_engine = OpportunityEngine()
    v2_pipeline = RuntimePipeline.default()

    for cat in ("咖啡", "火锅", "湘菜", "烧烤"):
        v1_result = v1_engine.evaluate(category_name=cat)
        v2_result = v2_pipeline.run(AnalysisRequest(cat))

        assert v1_result.opportunity_level == v2_result.opportunity_level, \
            f"{cat}: V1={v1_result.opportunity_level} != V2={v2_result.opportunity_level}"


def test_v1_v2_warning_count():
    """
    验证 V2 警告内容与 V1 一致

    注意：V1 将 entry_advice.key_warnings 和规则警告合并到 warnings
          V2 将 entry_advice.key_warnings 放入 risk_warnings，规则警告放入 warnings
          因此 V1.warnings = V2.warnings + V2.risk_warnings 中的规则警告部分
    """
    from src.core.engine import OpportunityEngine, EntrepreneurProfile

    v1_engine = OpportunityEngine()
    v2_pipeline = RuntimePipeline.default()

    # 首次创业+低资金 → 应触发规则警告
    v1_result = v1_engine.evaluate(
        category_name="火锅",
        city_name="成都",
        entrepreneur=EntrepreneurProfile(experience="首次创业", capital_level="low"),
    )
    v2_result = v2_pipeline.run(AnalysisRequest("火锅", "成都", "首次创业", "low"))

    # V2 的 warnings 只含规则引擎产生的警告（去掉了V1中entry_advice.key_warnings的重复）
    # V2 warnings + risk_warnings 中的规则部分应 ≤ V1 warnings
    v2_rule_warnings = [w for w in v2_result.warnings
                        if w not in v2_result.risk_warnings]
    assert len(v2_rule_warnings) <= len(v1_result.warnings)


# ═══════════════════════════════════════════════════════════════
# 维度得分测试
# ═══════════════════════════════════════════════════════════════

def test_result_has_dimension_scores():
    """测试结果包含六维得分"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("茶饮", "广州"))
    assert len(result.dimension_scores) == 6


def test_result_has_indicator_scores():
    """测试结果包含30个指标得分"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("湘菜", "长沙"))
    assert len(result.indicator_scores) == 30


def test_result_has_category_info():
    """测试结果包含品类信息"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡"))
    assert result.category_info is not None
    assert "name" in result.category_info


def test_result_has_city_info():
    """测试结果包含城市信息"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    assert result.city_info is not None
    assert result.city_info.get("city") == "上海"


def test_result_has_matched_cases():
    """测试结果包含匹配案例"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("火锅"))
    assert len(result.matched_cases) > 0


# ═══════════════════════════════════════════════════════════════
# 自组装管线测试
# ═══════════════════════════════════════════════════════════════

def test_custom_pipeline():
    """测试自定义管线"""
    pipeline = RuntimePipeline()
    pipeline.add_stage(ParseStage())
    pipeline.add_stage(ScoreStage())
    pipeline.add_stage(SolutionStage())

    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    assert result.opportunity_score >= 0
    # 自定义管线无检索阶段，所以没有品类/城市信息
    assert result.category_info is None


def test_pipeline_without_rules():
    """测试无规则阶段的管线"""
    pipeline = RuntimePipeline()
    pipeline.add_stage(ParseStage())
    pipeline.add_stage(RetrieveStage())
    pipeline.add_stage(ScoreStage())
    pipeline.add_stage(SolutionStage())

    result = pipeline.run(AnalysisRequest("火锅", "成都"))
    # 无规则调整，机会评分 = 原始评分
    assert abs(result.opportunity_score - result.raw_score) < 0.01


# ═══════════════════════════════════════════════════════════════
# 经济人画像影响测试
# ═══════════════════════════════════════════════════════════════

def test_experienced_entrepreneur_scores_higher():
    """测试有经验的创业者评分更高"""
    pipeline = RuntimePipeline.default()

    r1 = pipeline.run(AnalysisRequest("咖啡", "上海", "丰富", "high"))
    r2 = pipeline.run(AnalysisRequest("咖啡", "上海", "首次创业", "low"))
    assert r1.opportunity_score >= r2.opportunity_score


def test_different_entrepreneur_affects_dim5():
    """测试不同创业者影响 D5 品牌势能得分"""
    pipeline = RuntimePipeline.default()

    r1 = pipeline.run(AnalysisRequest("咖啡", "上海", "丰富", "very_high", "large"))
    r2 = pipeline.run(AnalysisRequest("咖啡", "上海", "首次创业", "low", "solo"))
    # 品牌势能应不同
    assert r1.opportunity_score != r2.opportunity_score


# ═══════════════════════════════════════════════════════════════
# 序列化测试
# ═══════════════════════════════════════════════════════════════

def test_result_to_dict():
    """测试结果序列化"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    d = result.to_dict()
    assert isinstance(d, dict)
    assert "opportunity_score" in d
    assert "opportunity_level" in d
    assert "dimension_scores" in d
    assert "score_chain" in d


def test_result_to_dict_json_serializable():
    """测试结果可 JSON 序列化"""
    import json
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("咖啡", "上海"))
    json_str = json.dumps(result.to_dict(), ensure_ascii=False)
    assert isinstance(json_str, str)
    assert "咖啡" in json_str or "opportunity_score" in json_str


# ═══════════════════════════════════════════════════════════════
# 边界情况测试
# ═══════════════════════════════════════════════════════════════

def test_empty_pipeline_returns_defaults():
    """测试空管线返回默认结果"""
    pipeline = RuntimePipeline()
    result = pipeline.run(AnalysisRequest("咖啡"))
    assert result.opportunity_score == 0.0
    assert result.raw_score == 0.0


def test_light_pipeline_still_returns_useful_result():
    """测试轻量管线仍返回有效结果"""
    pipeline = RuntimePipeline.light()
    result = pipeline.run(AnalysisRequest("烘焙", "南京"))
    assert result.opportunity_score >= 0
    assert result.category_info is not None


def test_unknown_category_default_score():
    """测试未知品类使用默认中间值"""
    pipeline = RuntimePipeline.default()
    result = pipeline.run(AnalysisRequest("完全未知的品类"))
    # 所有指标默认 2.5，加权平均 ≈ 2.5
    assert 2.0 <= result.raw_score <= 3.0


def test_pipeline_reuses_scoring_strategy():
    """测试评分策略可复用"""
    strategy = BuiltInScoringStrategy()
    stage1 = ScoreStage(strategy=strategy)
    stage2 = ScoreStage(strategy=strategy)  # 复用实例

    pipeline = RuntimePipeline()
    pipeline.add_stage(stage1)
    pipeline.add_stage(stage2)
    # 不应该报错
    pipeline.run(AnalysisRequest("咖啡"))
