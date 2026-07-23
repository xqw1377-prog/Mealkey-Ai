"""
工具函数
"""


def round_score(score: float, decimals: int = 2) -> float:
    """
    标准化评分四舍五入

    Args:
        score: 原始分数
        decimals: 小数位数

    Returns:
        float: 四舍五入后的分数
    """
    return round(score, decimals)


def clamp_score(score: float, min_val: float = 0.0, max_val: float = 5.0) -> float:
    """
    将分数限制在指定范围内

    Args:
        score: 原始分数
        min_val: 最小值
        max_val: 最大值

    Returns:
        float: 限制后的分数
    """
    return max(min_val, min(max_val, score))


def format_percentage(value: float, decimals: int = 1) -> str:
    """
    将小数格式化为百分比字符串

    Args:
        value: 小数值 (0-1)
        decimals: 小数位数

    Returns:
        str: 百分比字符串，如 "85.0%"
    """
    return f"{round(value * 100, decimals)}%"


def weighted_average(values: list[float], weights: list[float] | None = None) -> float:
    """
    计算加权平均

    Args:
        values: 数值列表
        weights: 权重列表（None 则等权重）

    Returns:
        float: 加权平均值
    """
    if not values:
        return 0.0

    n = len(values)
    if weights is None:
        return sum(values) / n

    if len(weights) != n:
        raise ValueError("values 和 weights 长度不一致")

    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0

    return sum(v * w for v, w in zip(values, weights, strict=False)) / total_weight
