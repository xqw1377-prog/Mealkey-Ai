"""
M-MKT 批量评估工具

支持多品类 × 多城市的交叉对比分析。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from .api import MKTEngine


@dataclass
class BatchResult:
    """批量评估结果"""

    items: list[dict] = field(default_factory=list)

    def to_dict(self) -> list[dict]:
        return self.items

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.items, ensure_ascii=False, indent=indent)

    @staticmethod
    def _csv_escape(value: object) -> str:
        """转义 CSV 字段值（处理引号和逗号）"""
        s = str(value)
        if '"' in s or ',' in s or '\n' in s:
            s = s.replace('"', '""')
            return f'"{s}"'
        return s

    def to_csv(self) -> str:
        """输出 CSV 格式"""
        if not self.items:
            return ""
        fieldnames = [
            "品类",
            "城市",
            "机会评分",
            "机会等级",
            "原始评分",
            "市场容量",
            "竞争格局",
            "消费适配",
            "运营可行性",
            "品牌势能",
            "环境适配",
            "建议数",
            "备注数",
            "警告数",
        ]
        rows = []
        for item in self.items:
            dims = {d["name"]: d["score"] for d in item.get("dimensions", [])}
            rows.append(
                {
                    "品类": item.get("category", ""),
                    "城市": item.get("city", "不限"),
                    "机会评分": item.get("opportunity_score", 0),
                    "机会等级": item.get("opportunity_level", ""),
                    "原始评分": item.get("raw_score", 0),
                    "市场容量": dims.get("市场容量", ""),
                    "竞争格局": dims.get("竞争格局", ""),
                    "消费适配": dims.get("消费适配", ""),
                    "运营可行性": dims.get("运营可行性", ""),
                    "品牌势能": dims.get("品牌势能", ""),
                    "环境适配": dims.get("环境适配", ""),
                    "建议数": len(item.get("suggestions", [])),
                    "备注数": len(item.get("notes", [])),
                    "警告数": len(item.get("warnings", [])),
                }
            )

        output = []
        output.append(",".join(self._csv_escape(f) for f in fieldnames))
        for row in rows:
            output.append(",".join(self._csv_escape(row.get(f, "")) for f in fieldnames))
        return "\n".join(output)


class BatchAnalyzer:
    """批量评估分析器"""

    def __init__(self):
        self._engine = MKTEngine()

    def analyze(
        self,
        categories: list[str],
        cities: list[str | None] | None = None,
        experience: str = "首次创业",
        capital_level: str = "medium",
        team_size: str = "small",
    ) -> BatchResult:
        """
        批量评估多品类 × 多城市

        Args:
            categories: 品类列表
            cities: 城市列表（None 或空列表表示不指定城市）
            experience: 创业经验
            capital_level: 资金水平
            team_size: 团队规模

        Returns:
            BatchResult: 批量评估结果
        """
        if cities is None:
            cities = [None]

        items = []
        for cat in categories:
            for city in cities:
                decision = self._engine.analyze(
                    category=cat,
                    city=city,
                    experience=experience,
                    capital_level=capital_level,
                    team_size=team_size,
                )
                dims = decision.model_summary.get("dimensions", [])
                items.append(
                    {
                        "category": cat,
                        "city": city or "不限",
                        "opportunity_score": decision.opportunity_score,
                        "opportunity_level": decision.opportunity_level,
                        "raw_score": decision.raw_score,
                        "dimensions": [{"name": d["name"], "score": d["score"]} for d in dims],
                        "suggestions": decision.positioning_suggestions,
                        "notes": decision.rule_notes,
                        "warnings": decision.warnings,
                        "has_cases": len(decision.related_cases) > 0,
                    }
                )

        # 按机会评分降序排列
        items.sort(key=lambda x: x["opportunity_score"], reverse=True)
        return BatchResult(items=items)

    def analyze_all_cities(
        self,
        category: str,
        experience: str = "首次创业",
        capital_level: str = "medium",
    ) -> BatchResult:
        """评估某品类在所有城市的机会"""
        cities = self._engine.list_cities()
        return self.analyze(
            categories=[category],
            cities=cities,
            experience=experience,
            capital_level=capital_level,
        )

    def analyze_all_categories(
        self,
        city: str | None = None,
        experience: str = "首次创业",
        capital_level: str = "medium",
    ) -> BatchResult:
        """评估所有品类在某个城市的机会"""
        categories = self._engine.list_categories()
        cities = [city] if city else None
        return self.analyze(
            categories=categories,
            cities=cities,
            experience=experience,
            capital_level=capital_level,
        )

    def compare(self, category: str, cities: list[str]) -> BatchResult:
        """对比某品类在多个城市的机会"""
        return self.analyze(
            categories=[category],
            cities=cities,
        )
