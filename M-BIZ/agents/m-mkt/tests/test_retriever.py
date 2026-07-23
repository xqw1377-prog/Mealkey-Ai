"""
KnowledgeRetriever 测试
"""

from src.core.knowledge.retriever import KnowledgeRetriever


def test_retriever_initialization():
    retriever = KnowledgeRetriever()
    assert retriever is not None


def test_retriever_category_found():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    assert result.category is not None
    assert result.category.name == "火锅"
    assert result.category.category_stage == "红海竞争期"


def test_retriever_category_not_found():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("不存在的品类")
    assert result.category is None


def test_retriever_with_city():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("咖啡", "上海")
    assert result.city is not None
    assert result.city.city == "上海"


def test_retriever_matched_cases():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    assert len(result.matched_cases) > 0
    # 火锅应有海底捞和巴奴案例
    matched_names = {c.name for c, _ in result.matched_cases}
    assert "海底捞案例" in matched_names
    assert "巴奴毛肚火锅案例" in matched_names


def test_retriever_case_relevance():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    if result.matched_cases:
        best_case, best_score = result.matched_cases[0]
        assert best_score > 0
        assert best_case.category == "火锅"


def test_retriever_no_city_result():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("湘菜")
    assert result.city is None


def test_retriever_market_tags():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅", "上海")
    assert len(result.market_tags) > 0
    assert any("火锅" in t for t in result.market_tags)


def test_retriever_opportunity_tags():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    assert len(result.opportunity_tags) > 0


def test_retriever_top_cases():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    top = result.top_cases
    assert len(top) <= 5


def test_retriever_top_decision_rules():
    retriever = KnowledgeRetriever()
    result = retriever.retrieve("火锅")
    rules = result.top_decision_rules
    assert len(rules) > 0
    assert "judgement" in rules[0]
    assert "recommendation" in rules[0]
