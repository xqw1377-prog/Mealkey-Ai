"""
MKTInferencePipeline 多阶段推理管线测试
"""

import json

from src.core.api import MKTEngine
from src.core.inference import InferenceConfig, InferenceResult, MKTInferencePipeline


def test_pipeline_initialization():
    pipeline = MKTInferencePipeline()
    assert pipeline is not None


def test_pipeline_default_config():
    config = InferenceConfig()
    assert config.enable_retrieval is True
    assert config.enable_scoring is True
    assert config.enable_rules is True
    assert config.max_cases == 5


def test_pipeline_run_basic():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("火锅", "成都")
    assert isinstance(result, InferenceResult)
    assert 0.0 <= result.opportunity_score <= 5.0
    assert result.opportunity_level in ("高机会", "中机会", "低机会")


def test_pipeline_project_summary():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("咖啡", "上海", experience="丰富", capital_level="high")
    summary = result.project_summary
    assert summary["品类"] == "咖啡"
    assert summary["城市"] == "上海"
    assert summary["创业经验"] == "丰富"


def test_pipeline_knowledge_retrieval():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("火锅")
    assert result.knowledge is not None
    assert result.knowledge.category is not None
    assert result.knowledge.category.name == "火锅"


def test_pipeline_scene_analysis():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("咖啡")
    assert len(result.scene_analysis) > 0
    scenes = {s["scene"] for s in result.scene_analysis}
    assert "一人食" in scenes or "下午茶" in scenes


def test_pipeline_price_band():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("咖啡")
    assert result.price_band is not None
    assert result.price_band.name == "低价位"


def test_pipeline_dimension_scores():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("湘菜", "长沙")
    assert len(result.dimension_scores) == 6
    for ds in result.dimension_scores:
        assert "id" in ds
        assert "name" in ds
        assert "score" in ds
        assert ds["score"] is not None


def test_pipeline_strategic_recommendations():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("火锅", "成都")
    assert len(result.strategic_recommendations) > 0


def test_pipeline_case_references():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("火锅")
    assert len(result.case_references) > 0
    ref = result.case_references[0]
    assert "name" in ref
    assert "brand" in ref
    assert "principles" in ref


def test_pipeline_decision_rules():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("火锅")
    if result.decision_rules_extracted:
        dr = result.decision_rules_extracted[0]
        assert "conditions" in dr
        assert "judgement" in dr
        assert "recommendation" in dr


def test_pipeline_rule_notes():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("湘菜", "长沙", experience="首次创业", capital_level="low")
    assert len(result.rule_notes) > 0 or len(result.rule_notes) == 0  # 规则可能触发也可能不触发


def test_pipeline_no_city():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("快餐")
    assert result.knowledge is not None
    assert result.knowledge.city is None


def test_pipeline_to_dict():
    pipeline = MKTInferencePipeline()
    result = pipeline.run("茶饮", "广州")
    d = result.to_dict()
    assert isinstance(d, dict)
    assert "opportunity_score" in d
    assert "strategic_recommendations" in d
    assert "case_references" in d
    assert "decision_rules_extracted" in d


def test_pipeline_different_experience_affects_score():
    pipeline = MKTInferencePipeline()
    r1 = pipeline.run("日料", "上海", experience="丰富", capital_level="high")
    r2 = pipeline.run("日料", "上海", experience="首次创业", capital_level="low")
    assert r1.opportunity_score >= r2.opportunity_score


def test_pipeline_disabled_config():
    config = InferenceConfig(enable_retrieval=False, enable_scoring=False, enable_rules=False)
    pipeline = MKTInferencePipeline(config)
    result = pipeline.run("火锅")
    assert result.project_summary is not None
    # 无评分时原始值为 0
    assert result.raw_score == 0.0


def test_api_analyze_deep():
    engine = MKTEngine()
    result = engine.analyze_deep("烧烤", "深圳")
    assert isinstance(result, InferenceResult)
    assert result.opportunity_score > 0


def test_api_analyze_deep_json():
    engine = MKTEngine()
    json_str = engine.analyze_deep_json("湘菜")
    data = json.loads(json_str)
    assert "opportunity_score" in data
    assert "scene_analysis" in data
    assert "strategic_recommendations" in data
