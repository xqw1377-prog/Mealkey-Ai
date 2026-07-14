"""
批量评估工具单元测试
"""

from src.core.batch import BatchAnalyzer, BatchResult


def test_batch_analyze_basic():
    """测试基本批量评估"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["咖啡", "火锅"], cities=["上海", "成都"])
    assert len(result.items) == 4  # 2品类 × 2城市
    # 按评分降序排列
    for i in range(len(result.items) - 1):
        assert result.items[i]["opportunity_score"] >= result.items[i + 1]["opportunity_score"]


def test_batch_analyze_single():
    """测试单品类单城市"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["湘菜"], cities=["长沙"])
    assert len(result.items) == 1
    assert result.items[0]["category"] == "湘菜"
    assert result.items[0]["city"] == "长沙"


def test_batch_to_json():
    """测试 JSON 输出"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["烧烤"], cities=["深圳"])
    json_str = result.to_json()
    assert "烧烤" in json_str
    assert "opportunity_score" in json_str


def test_batch_to_csv():
    """测试 CSV 输出"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["咖啡"], cities=["上海"])
    csv_str = result.to_csv()
    assert "品类" in csv_str
    assert "咖啡" in csv_str
    assert "机会评分" in csv_str


def test_analyze_all_cities():
    """测试全城市评估"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze_all_cities(category="咖啡")
    assert len(result.items) >= 5  # 至少5个城市
    for item in result.items:
        assert item["category"] == "咖啡"


def test_analyze_all_categories():
    """测试全品类评估"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze_all_categories(city="上海")
    assert len(result.items) == 10  # 10个品类
    for item in result.items:
        assert item["city"] == "上海"


def test_analyze_all_categories_no_city():
    """测试全品类不限城市"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze_all_categories()
    assert len(result.items) == 10  # 10个品类
    for item in result.items:
        assert item["city"] == "不限"


def test_compare():
    """测试城市对比"""
    analyzer = BatchAnalyzer()
    result = analyzer.compare(category="咖啡", cities=["上海", "成都", "长沙"])
    assert len(result.items) == 3
    for item in result.items:
        assert item["category"] == "咖啡"


def test_batch_result_empty():
    """测试空结果"""
    result = BatchResult(items=[])
    assert result.to_dict() == []
    assert result.to_json() == "[]"
    assert result.to_csv() == ""


def test_batch_result_with_dimensions():
    """测试结果包含维度得分"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["咖啡"], cities=["上海"])
    item = result.items[0]
    assert len(item["dimensions"]) == 6
    dim_names = [d["name"] for d in item["dimensions"]]
    assert "市场容量" in dim_names
    assert "竞争格局" in dim_names


def test_batch_result_has_suggestions():
    """测试结果包含建议"""
    analyzer = BatchAnalyzer()
    result = analyzer.analyze(categories=["咖啡"], cities=["上海"])
    for item in result.items:
        assert "suggestions" in item
        assert "notes" in item
        assert "warnings" in item
