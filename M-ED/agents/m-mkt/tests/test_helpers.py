"""
工具函数单元测试
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.utils.helpers import clamp_score, format_percentage, round_score, weighted_average


def test_round_score():
    assert round_score(3.14159, 2) == 3.14
    assert round_score(3.14159, 4) == 3.1416
    assert round_score(5.0, 2) == 5.0


def test_clamp_score():
    assert clamp_score(6.0, 0, 5) == 5.0
    assert clamp_score(-1.0, 0, 5) == 0.0
    assert clamp_score(3.0, 0, 5) == 3.0


def test_format_percentage():
    assert format_percentage(0.85) == "85.0%"
    assert format_percentage(1.0) == "100.0%"
    assert format_percentage(0.0) == "0.0%"


def test_weighted_average():
    assert weighted_average([4.0, 2.0], [0.5, 0.5]) == 3.0
    assert weighted_average([5.0, 1.0], [0.8, 0.2]) == 4.2


def test_weighted_average_empty():
    assert weighted_average([]) == 0.0


def test_weighted_average_equal():
    assert weighted_average([3.0, 4.0, 5.0]) == 4.0


if __name__ == "__main__":
    test_round_score()
    test_clamp_score()
    test_format_percentage()
    test_weighted_average()
    test_weighted_average_empty()
    test_weighted_average_equal()
    print("所有测试通过 ✓")
