"""
CLI 单元测试
"""

import json

import pytest

from src.core.cli import build_parser, main, print_result
from src.core.engine import OpportunityDecision


def test_parser_defaults():
    parser = build_parser()
    args = parser.parse_args(["咖啡", "上海"])
    assert args.category == "咖啡"
    assert args.city == "上海"
    assert args.experience == "首次创业"
    assert args.capital_level == "medium"
    assert args.team_size == "small"
    assert args.json is False
    assert args.list_categories is False
    assert args.list_cities is False


def test_parser_full_options():
    parser = build_parser()
    args = parser.parse_args(
        [
            "湘菜",
            "长沙",
            "--experience",
            "丰富",
            "--capital",
            "high",
            "--team",
            "large",
            "--json",
        ]
    )
    assert args.category == "湘菜"
    assert args.city == "长沙"
    assert args.experience == "丰富"
    assert args.capital_level == "high"
    assert args.team_size == "large"
    assert args.json is True


def test_parser_list_categories():
    parser = build_parser()
    args = parser.parse_args(["--list-categories"])
    assert args.list_categories is True


def test_parser_list_cities():
    parser = build_parser()
    args = parser.parse_args(["--list-cities"])
    assert args.list_cities is True


def test_main_mutual_exclusion():
    with pytest.raises(SystemExit):
        main(["--list-categories", "--list-cities"])


def test_main_list_categories(capsys):
    main(["--list-categories"])
    captured = capsys.readouterr()
    assert "咖啡" in captured.out or "火锅" in captured.out
    assert "supported." not in captured.out


def test_main_list_cities(capsys):
    main(["--list-cities"])
    captured = capsys.readouterr()
    assert "上海" in captured.out or "成都" in captured.out


def test_main_basic(capsys):
    main(["咖啡", "上海"])
    captured = capsys.readouterr()
    assert "机会评分" in captured.out
    assert "六维模型得分" in captured.out


def test_main_json_output(capsys):
    main(["湘菜", "--json"])
    captured = capsys.readouterr()
    data = json.loads(captured.out)
    assert "opportunity_score" in data
    assert "opportunity_level" in data
    assert "dimension_details" in data


def test_main_with_options(capsys):
    main(["火锅", "成都", "--experience", "首次创业", "--capital", "low"])
    captured = capsys.readouterr()
    assert "机会评分" in captured.out


def test_main_no_args(capsys):
    main([])
    captured = capsys.readouterr()
    assert "usage" in captured.out.lower() or "M-MKT" in captured.out


def test_main_invalid_experience():
    with pytest.raises(SystemExit):
        main(["咖啡", "--experience", "invalid_experience"])


def test_main_invalid_capital():
    with pytest.raises(SystemExit):
        main(["咖啡", "--capital", "invalid_capital"])


def test_main_invalid_team():
    with pytest.raises(SystemExit):
        main(["咖啡", "--team", "invalid_team"])


def test_print_result_json(capsys):
    decision = OpportunityDecision(
        opportunity_score=3.5,
        opportunity_level="高机会",
        raw_score=3.2,
        model_summary={"dimensions": []},
    )
    print_result(decision, fmt="json")
    captured = capsys.readouterr()
    data = json.loads(captured.out)
    assert data["opportunity_score"] == 3.5
    assert data["opportunity_level"] == "高机会"


def test_print_result_human(capsys):
    decision = OpportunityDecision(
        opportunity_score=3.5,
        opportunity_level="高机会",
        raw_score=3.2,
        model_summary={
            "dimensions": [
                {"id": 1, "name": "市场容量", "score": 3.5, "level": "良好"},
            ]
        },
        category_info={"name": "咖啡", "category_stage": "增长期", "market_position": "测试"},
        city_info={"city": "上海", "tier": "一线"},
        positioning_suggestions=["建议1", "建议2"],
        rule_notes=["备注1"],
        warnings=["风险1"],
        related_cases=[{"name": "瑞幸", "brand": "瑞幸咖啡", "positioning": "高性价比"}],
    )
    print_result(decision, fmt="human")
    captured = capsys.readouterr()
    assert "机会评分" in captured.out
    assert "高机会" in captured.out
    assert "咖啡" in captured.out
    assert "上海" in captured.out
    assert "建议1" in captured.out
    assert "备注1" in captured.out


def test_print_result_human_empty(capsys):
    decision = OpportunityDecision()
    print_result(decision, fmt="human")
    captured = capsys.readouterr()
    assert "机会评分" in captured.out


def test_main_default_help(capsys):
    main([])
    captured = capsys.readouterr()
    assert "M-MKT" in captured.out
