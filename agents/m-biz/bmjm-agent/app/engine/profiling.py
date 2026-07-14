"""画像匹配引擎 - 商业模式识别与匹配"""

import structlog

logger = structlog.get_logger()


class ProfilingEngine:
    """商业模式画像匹配引擎"""

    def __init__(self, profiles: list[dict]):
        self.profiles = profiles

    def match_profile(self, metrics: dict) -> tuple[str, float]:
        """匹配最相似的商业模式画像"""
        best_match = ("", 0.0)

        for profile in self.profiles:
            match_rules = profile.get("match_rules", [])
            if not match_rules:
                continue

            matched_count = 0
            total_count = len(match_rules)

            for rule_expr in match_rules:
                if self._evaluate_match_rule(rule_expr, metrics):
                    matched_count += 1

            if total_count > 0:
                confidence = matched_count / total_count
                if confidence > best_match[1]:
                    best_match = (profile["profile_id"], round(confidence, 2))

        return best_match

    def _evaluate_match_rule(self, rule_expr: str, metrics: dict) -> bool:
        """评估画像匹配规则表达式"""
        try:
            # 解析 "metric == value" 格式
            if "==" in rule_expr:
                parts = rule_expr.split("==")
                metric_name = parts[0].strip()
                value_str = parts[1].strip().strip("'\"")
                metric_val = metrics.get(metric_name)

                # 尝试转为布尔
                if value_str.lower() == "true":
                    return metric_val is True
                elif value_str.lower() == "false":
                    return metric_val is False

                # 尝试转为数字
                try:
                    return float(metric_val) == float(value_str)
                except (ValueError, TypeError):
                    return str(metric_val).lower() == value_str.lower()

            elif "!=" in rule_expr:
                parts = rule_expr.split("!=")
                metric_name = parts[0].strip()
                value_str = parts[1].strip().strip("'\"")
                metric_val = metrics.get(metric_name)
                return str(metric_val).lower() != value_str.lower()

            elif ">" in rule_expr:
                parts = rule_expr.split(">")
                metric_name = parts[0].strip()
                value_str = parts[1].strip()
                metric_val = metrics.get(metric_name)
                try:
                    return float(metric_val) > float(value_str)
                except (ValueError, TypeError):
                    return False

            elif "<" in rule_expr:
                parts = rule_expr.split("<")
                metric_name = parts[0].strip()
                value_str = parts[1].strip()
                metric_val = metrics.get(metric_name)
                try:
                    return float(metric_val) < float(value_str)
                except (ValueError, TypeError):
                    return False

        except Exception as e:
            logger.warning("match rule evaluation error", rule=rule_expr, error=str(e))

        return False

    def get_profile(self, profile_id: str) -> dict | None:
        """获取画像详情"""
        for p in self.profiles:
            if p["profile_id"] == profile_id:
                return p
        return None

    def get_all_profiles(self) -> list[dict]:
        """获取所有画像"""
        return self.profiles
