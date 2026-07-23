from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class LifecycleStage(StrEnum):
    INNOVATION = "创新期"
    GROWTH = "增长期"
    RAPID_GROWTH = "快速增长期"
    MATURITY = "成熟竞争期"
    RED_OCEAN = "红海竞争期"
    DECLINE = "衰退期"


@dataclass
class CategoryLifecycle:
    stage: LifecycleStage
    description: str = ""
    estimated_duration: str | None = None


@dataclass
class ConsumerStructure:
    core: list[str] = field(default_factory=list)
    secondary: list[str] = field(default_factory=list)
    non_target: list[str] = field(default_factory=list)


@dataclass
class CompetitionStructure:
    head_brands: list[str] = field(default_factory=list)
    regional_brands: list[str] = field(default_factory=list)
    small_players: str = ""
    density: str = "medium"
    problem: str = ""


@dataclass
class FailureMode:
    name: str
    description: str = ""
    severity: str = "medium"


@dataclass
class EntryAdvice:
    suitable_for: list[str] = field(default_factory=list)
    unsuitable_for: list[str] = field(default_factory=list)
    recommended_positioning: list[str] = field(default_factory=list)
    key_warnings: list[str] = field(default_factory=list)


@dataclass
class CategoryKnowledge:
    name: str
    category_stage: str
    market_position: str
    lifecycle: CategoryLifecycle | None = None
    consumer: ConsumerStructure = field(default_factory=ConsumerStructure)
    growth_direction: list[str] = field(default_factory=list)
    competition: CompetitionStructure = field(default_factory=CompetitionStructure)
    opportunity: list[str] = field(default_factory=list)
    risk: list[str] = field(default_factory=list)
    failure_modes: list[FailureMode] = field(default_factory=list)
    entry_advice: EntryAdvice = field(default_factory=EntryAdvice)
    tags: list[str] = field(default_factory=list)
    source: str = "专家判断"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "category_stage": self.category_stage,
            "market_position": self.market_position,
            "lifecycle": {
                "stage": self.lifecycle.stage.value if self.lifecycle else None,
                "description": self.lifecycle.description if self.lifecycle else "",
            },
            "consumer": {
                "core": self.consumer.core,
                "secondary": self.consumer.secondary,
                "non_target": self.consumer.non_target,
            },
            "growth_direction": self.growth_direction,
            "competition": {
                "head_brands": self.competition.head_brands,
                "regional_brands": self.competition.regional_brands,
                "small_players": self.competition.small_players,
                "density": self.competition.density,
                "problem": self.competition.problem,
            },
            "opportunity": self.opportunity,
            "risk": self.risk,
            "failure_modes": [
                {"name": f.name, "description": f.description, "severity": f.severity}
                for f in self.failure_modes
            ],
            "entry_advice": {
                "suitable_for": self.entry_advice.suitable_for,
                "unsuitable_for": self.entry_advice.unsuitable_for,
                "recommended_positioning": self.entry_advice.recommended_positioning,
                "key_warnings": self.entry_advice.key_warnings,
            },
            "tags": self.tags,
            "source": self.source,
        }
