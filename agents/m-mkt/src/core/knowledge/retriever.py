"""
M-MKT KnowledgeRetriever — 知识检索器

根据项目画像检索匹配的知识资产:
  - 品类知识卡
  - 城市画像
  - 相关案例 (按品类/tag 匹配度排序)
  - 判断规则
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .case import CaseStudy
from .category import CategoryKnowledge
from .city import CityProfile
from .data import ALL_CASES, ALL_CATEGORIES, ALL_CITIES, CATEGORY_MAP, CITY_MAP
from .rules import Rule


@dataclass
class RetrievalResult:
    category: CategoryKnowledge | None = None
    city: CityProfile | None = None
    matched_cases: list[tuple[CaseStudy, float]] = field(default_factory=list)
    matched_rules: list[Rule] = field(default_factory=list)
    market_tags: list[str] = field(default_factory=list)
    opportunity_tags: list[str] = field(default_factory=list)

    @property
    def top_cases(self) -> list[CaseStudy]:
        return [c for c, _ in self.matched_cases[:5]]

    @property
    def top_decision_rules(self) -> list[dict[str, str]]:
        rules: list[dict[str, str]] = []
        seen: set[str] = set()
        for case, _ in self.matched_cases:
            for dr in case.decision_rules:
                key = dr.judgement + dr.recommendation
                if key not in seen:
                    seen.add(key)
                    rules.append(
                        {
                            "conditions": str(dr.conditions),
                            "judgement": dr.judgement,
                            "recommendation": dr.recommendation,
                        }
                    )
        return rules


class KnowledgeRetriever:
    """知识检索器 — 根据项目画像检索匹配的知识资产"""

    def __init__(self) -> None:
        self._categories = {c.name: c for c in ALL_CATEGORIES}
        self._cities = {c.city: c for c in ALL_CITIES}
        self._cases = ALL_CASES

    def retrieve(
        self,
        category_name: str,
        city_name: str | None = None,
        tags: list[str] | None = None,
    ) -> RetrievalResult:
        result = RetrievalResult()

        cat = CATEGORY_MAP.get(category_name)
        result.category = cat

        city = CITY_MAP.get(city_name) if city_name else None
        result.city = city

        result.matched_cases = self._match_cases(category_name, tags or [])
        self._infer_tags(result)

        return result

    def _match_cases(
        self,
        category_name: str,
        extra_tags: list[str],
    ) -> list[tuple[CaseStudy, float]]:
        scored: list[tuple[CaseStudy, float]] = []

        for case in self._cases:
            score = 0.0
            if case.category == category_name:
                score += 2.0
            elif category_name and case.category and category_name in case.category:
                score += 1.0

            for tag in extra_tags:
                if tag in case.tags:
                    score += 0.5

            if score > 0:
                scored.append((case, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def _infer_tags(self, result: RetrievalResult) -> None:
        mt: list[str] = []
        ot: list[str] = []

        if result.category:
            mt.append(f"品类:{result.category.name}")
            mt.append(f"阶段:{result.category.category_stage}")
            mt.append(f"竞争:{result.category.competition.density}")

        if result.city:
            mt.append(f"城市:{result.city.city}")
            mt.append(f"等级:{result.city.tier}")

        if result.matched_cases:
            ot.append("案例可参考")

        result.market_tags = mt
        result.opportunity_tags = ot
