from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class Operator(StrEnum):
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    EQ = "eq"
    NEQ = "neq"
    CONTAINS = "contains"
    IN = "in"
    NOT_IN = "not_in"


@dataclass
class Condition:
    field: str
    operator: Operator
    value: Any

    def evaluate(self, context: dict[str, Any]) -> bool:
        actual = context
        for part in self.field.split("."):
            if isinstance(actual, dict):
                actual = actual.get(part)
            else:
                return False
            if actual is None:
                return False

        try:
            if self.operator == Operator.GT:
                return actual > self.value
            elif self.operator == Operator.GTE:
                return actual >= self.value
            elif self.operator == Operator.LT:
                return actual < self.value
            elif self.operator == Operator.LTE:
                return actual <= self.value
            elif self.operator == Operator.EQ:
                return actual == self.value
            elif self.operator == Operator.NEQ:
                return actual != self.value
            elif self.operator == Operator.CONTAINS:
                return self.value in actual if isinstance(actual, (list, str)) else False
            elif self.operator == Operator.IN:
                return actual in self.value if isinstance(self.value, (list, tuple)) else False
            elif self.operator == Operator.NOT_IN:
                return actual not in self.value if isinstance(self.value, (list, tuple)) else False
            return False
        except (TypeError, ValueError):
            return False


class ActionType(StrEnum):
    ADJUST_SCORE = "adjust_score"
    SET_LEVEL = "set_level"
    ADD_WARNING = "add_warning"
    ADD_NOTE = "add_note"
    SUGGEST_POSITIONING = "suggest_positioning"
    BLOCK_OPPORTUNITY = "block_opportunity"


@dataclass
class RuleAction:
    type: ActionType
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class Rule:
    name: str
    description: str = ""
    conditions: list[Condition] = field(default_factory=list)
    actions: list[RuleAction] = field(default_factory=list)
    priority: int = 0
    enabled: bool = True
    category: str = "通用"

    def evaluate(self, context: dict[str, Any]) -> bool:
        if not self.enabled:
            return False
        return all(c.evaluate(context) for c in self.conditions)


@dataclass
class RuleResult:
    rule_name: str
    triggered: bool
    actions: list[RuleAction] = field(default_factory=list)
    message: str = ""


class RuleEngine:
    def __init__(self):
        self._rules: list[Rule] = []

    def add_rule(self, rule: Rule) -> None:
        self._rules.append(rule)
        self._rules.sort(key=lambda r: r.priority, reverse=True)

    def add_rules(self, rules: list[Rule]) -> None:
        for r in rules:
            self.add_rule(r)

    def remove_rule(self, name: str) -> bool:
        for i, r in enumerate(self._rules):
            if r.name == name:
                self._rules.pop(i)
                return True
        return False

    def get_rule(self, name: str) -> Rule | None:
        for r in self._rules:
            if r.name == name:
                return r
        return None

    def list_rules(self, category: str | None = None) -> list[Rule]:
        if category:
            return [r for r in self._rules if r.category == category]
        return list(self._rules)

    def evaluate(self, context: dict[str, Any]) -> list[RuleResult]:
        results: list[RuleResult] = []
        for rule in self._rules:
            triggered = rule.evaluate(context)
            if triggered:
                results.append(
                    RuleResult(
                        rule_name=rule.name,
                        triggered=True,
                        actions=rule.actions,
                        message=f"规则'{rule.name}'触发",
                    )
                )
        return results

    def apply_score_adjustments(
        self, context: dict[str, Any], base_score: float
    ) -> tuple[float, list[str]]:
        results = self.evaluate(context)
        adjusted = base_score
        notes: list[str] = []

        for r in results:
            for action in r.actions:
                if action.type == ActionType.ADJUST_SCORE:
                    delta = action.params.get("delta", 0)
                    adjusted += delta
                    reason = action.params.get("reason", "规则评分调整")
                    notes.append(f"{reason} ({delta:+.1f})")
                elif action.type == ActionType.BLOCK_OPPORTUNITY:
                    adjusted = 0.0
                    notes.append(action.params.get("reason", "机会被阻断"))
                elif action.type == ActionType.ADD_WARNING:
                    notes.append(f"⚠ {action.params.get('warning', '')}")
                elif action.type == ActionType.ADD_NOTE:
                    notes.append(action.params.get("note", ""))

        adjusted = max(0.0, min(5.0, adjusted))
        return round(adjusted, 2), notes
