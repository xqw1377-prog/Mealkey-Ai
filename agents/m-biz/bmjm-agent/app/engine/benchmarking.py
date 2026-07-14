"""行业对标引擎 - 偏离度 + 四分位分析"""

import structlog
from app.models.enums import DeviationStatus, QuartilePosition
from app.models.schemas import DeviationItem, BenchmarkingResult

logger = structlog.get_logger()

# 正向指标：值越大越好
POSITIVE_METRICS = {"ltv_cac_ratio", "gross_margin", "nps", "mrr_growth_rate", "arpu"}
# 负向指标：值越小越好
NEGATIVE_METRICS = {"monthly_churn_rate", "cac"}


class BenchmarkingEngine:
    """行业对标引擎"""

    def __init__(self, benchmarks: list[dict]):
        self.benchmarks = benchmarks
        self._index = self._build_index()

    def _build_index(self) -> dict:
        index = {}
        for b in self.benchmarks:
            industry = b.get("industry")
            if industry:
                index[industry] = b
        return index

    def get_benchmark(self, industry: str) -> dict | None:
        return self._index.get(industry)

    def calculate_deviations(
        self, industry: str, metrics: dict
    ) -> dict[str, DeviationItem] | None:
        """计算偏离度 + 四分位定位"""
        benchmark = self.get_benchmark(industry)
        if not benchmark:
            logger.info("benchmark not found for industry", industry=industry)
            return None

        bm_metrics = benchmark.get("metrics", {})
        deviations = {}

        metric_mapping = {
            "monthly_churn_rate": "monthly_churn_rate",
            "cac": "cac",
            "ltv_cac_ratio": "ltv_cac_ratio",
            "gross_margin": "gross_margin",
            "nps": "nps",
            "mrr_growth_rate": "mrr_growth_rate",
            "arpu": "arpu",
        }

        for metric_name, benchmark_key in metric_mapping.items():
            actual = metrics.get(metric_name)
            if actual is None or actual == 0:
                continue

            bm_entry = bm_metrics.get(benchmark_key, {})
            bm_avg = bm_entry.get("avg")
            if bm_avg is None or bm_avg == 0:
                continue

            bm_top = bm_entry.get("top_quartile")
            bm_bottom = bm_entry.get("bottom_quartile")

            # 偏离度（相对均值）
            deviation = (actual - bm_avg) / bm_avg

            # 状态（相对均值）
            is_positive = metric_name in POSITIVE_METRICS
            is_negative = metric_name in NEGATIVE_METRICS

            if is_positive:
                status = (
                    DeviationStatus.ABOVE_AVG if deviation > 0.1
                    else DeviationStatus.BELOW_AVG if deviation < -0.1
                    else DeviationStatus.AT_PAR
                )
            elif is_negative:
                status = (
                    DeviationStatus.ABOVE_AVG if deviation < -0.1
                    else DeviationStatus.BELOW_AVG if deviation > 0.1
                    else DeviationStatus.AT_PAR
                )
            else:
                status = DeviationStatus.AT_PAR

            # 四分位定位
            quartile_pos = self._determine_quartile(
                actual, bm_avg, bm_top, bm_bottom, is_positive
            )

            deviations[metric_name] = DeviationItem(
                value=round(actual, 2),
                benchmark=round(bm_avg, 2),
                deviation=round(deviation, 4),
                status=status,
                top_quartile=round(bm_top, 2) if bm_top else None,
                bottom_quartile=round(bm_bottom, 2) if bm_bottom else None,
                quartile_position=quartile_pos.value if quartile_pos else None,
            )

        return deviations or None

    def _determine_quartile(
        self,
        actual: float,
        avg: float,
        top: float | None,
        bottom: float | None,
        is_positive: bool,
    ) -> QuartilePosition | None:
        """判断实际值处于行业哪个四分位

        对于正向指标（越大越好）：
          actual >= top        → TOP
          top > actual >= avg  → ABOVE_AVG
          avg 附近 (±10%)      → AT_AVG
          avg > actual >= bottom → BELOW_AVG
          actual < bottom      → BOTTOM

        对于负向指标（越小越好）：逻辑反转
          actual <= top        → TOP（行业最优 = 最低值）
          top < actual <= avg  → ABOVE_AVG
          avg 附近             → AT_AVG
          avg < actual <= bottom → BELOW_AVG
          actual > bottom      → BOTTOM
        """
        if top is None or bottom is None:
            return None

        # 归一化到"越大越好"的坐标系
        if is_positive:
            v = actual
            t, a, b = top, avg, bottom
        else:
            # 负向指标：反转，top_quartile 是最低值（最优）
            v = -actual
            t, a, b = -top, -avg, -bottom

        # 阈值：均值 ±10%
        margin = abs(a) * 0.1 if a != 0 else 0

        if v >= t:
            return QuartilePosition.TOP
        elif v >= a + margin:
            return QuartilePosition.ABOVE_AVG
        elif v >= a - margin:
            return QuartilePosition.AT_AVG
        elif v >= b:
            return QuartilePosition.BELOW_AVG
        else:
            return QuartilePosition.BOTTOM

    def get_available_industries(self) -> list[str]:
        return list(self._index.keys())
