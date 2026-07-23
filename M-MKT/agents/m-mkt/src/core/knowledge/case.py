from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DecisionRule:
    """Decision Case 中的知识抽取：条件→判断→建议"""

    conditions: dict[str, str]
    judgement: str = ""
    recommendation: str = ""
    priority: int = 50


@dataclass
class CaseStudy:
    name: str
    brand: str = ""
    category: str = ""
    background: str = ""
    market_environment: str = ""
    competitive_problem: str = ""
    strategic_choice: str = ""
    positioning: str = ""
    execution: list[str] = field(default_factory=list)
    results: str = ""
    reusable_principles: list[str] = field(default_factory=list)
    success: bool = True
    city: str | None = None
    tags: list[str] = field(default_factory=list)
    source: str = "行业研究"
    decision_rules: list[DecisionRule] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "background": self.background,
            "market_environment": self.market_environment,
            "competitive_problem": self.competitive_problem,
            "strategic_choice": self.strategic_choice,
            "positioning": self.positioning,
            "execution": self.execution,
            "results": self.results,
            "reusable_principles": self.reusable_principles,
            "success": self.success,
            "city": self.city,
            "tags": self.tags,
            "source": self.source,
            "decision_rules": [
                {
                    "conditions": r.conditions,
                    "judgement": r.judgement,
                    "recommendation": r.recommendation,
                }
                for r in self.decision_rules
            ],
        }
