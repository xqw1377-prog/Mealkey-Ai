from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CityProfile:
    city: str
    population: str = ""
    population_description: str = ""
    consumer: dict[str, str] = field(default_factory=dict)
    dining_characteristics: list[str] = field(default_factory=list)
    popular_categories: list[str] = field(default_factory=list)
    opportunities: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    tier: str | None = None
    tags: list[str] = field(default_factory=list)
    source: str = "行业研究"

    def to_dict(self) -> dict:
        return {
            "city": self.city,
            "population": self.population,
            "population_description": self.population_description,
            "consumer": self.consumer,
            "dining_characteristics": self.dining_characteristics,
            "popular_categories": self.popular_categories,
            "opportunities": self.opportunities,
            "risks": self.risks,
            "tier": self.tier,
            "tags": self.tags,
            "source": self.source,
        }
