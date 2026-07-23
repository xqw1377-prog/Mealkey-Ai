"""规则引擎 - 规则匹配与执行"""

import structlog
from app.models.enums import DIMENSIONS

logger = structlog.get_logger()


class RuleEngine:
    """规则引擎 - 负责加载、匹配和执行规则"""

    def __init__(self, rules: list[dict]):
        self.rules = rules

    def extract_metrics(self, business_model_data: dict, stage: str = "growth") -> dict:
        """从输入数据中提取特征指标"""
        metrics = {}
        bm = business_model_data

        # VP - 价值主张
        vp = bm.get("value_proposition", {})
        metrics["vp_description_exists"] = bool(vp.get("description"))
        metrics["vp_pain_points_count"] = len(vp.get("pain_points", []))
        metrics["vp_type"] = self._infer_vp_type(vp)

        # CS - 客户细分
        cs = bm.get("customer_segments", {})
        metrics["cs_primary_exists"] = bool(cs.get("primary"))
        metrics["cs_has_multi_side"] = "multi" in cs.get("primary", "").lower() or "平台" in cs.get("primary", "")
        metrics["tam"] = cs.get("tam") or 0

        # CH - 渠道
        ch = bm.get("channels", {})
        metrics["ch_types_count"] = len(ch.get("types", []))
        metrics["cac"] = ch.get("cac") or 0

        # CR - 客户关系
        cr = bm.get("customer_relationships", {})
        metrics["monthly_churn_rate"] = cr.get("monthly_churn_rate") or 0
        metrics["nps"] = cr.get("nps") or 0

        # RS - 收入来源
        rs = bm.get("revenue_streams", {})
        rs_types = rs.get("types", [])
        metrics["revenue_streams_count"] = len(rs_types)
        metrics["rs_types_exists"] = len(rs_types) > 0
        metrics["rs_types_contains_subscription"] = any(
            "subscription" in t.lower() or "订阅" in t for t in rs_types
        )
        metrics["rs_types_contains_commission"] = any(
            "commission" in t.lower() or "佣金" in t or "抽成" in t for t in rs_types
        )
        metrics["rs_types_contains_free"] = any(
            "free" in t.lower() or "免费" in t for t in rs_types
        )
        metrics["rs_types_contains_premium"] = any(
            "premium" in t.lower() or "高级" in t or "付费" in t for t in rs_types
        )
        metrics["rs_types_contains_hardware"] = any(
            "hardware" in t.lower() or "硬件" in t for t in rs_types
        )
        metrics["rs_types_contains_product_sales"] = any(
            "product" in t.lower() or "产品" in t or "销售" in t for t in rs_types
        )
        metrics["rs_types_contains_franchise_fee"] = any(
            "franchise" in t.lower() or "加盟" in t for t in rs_types
        )
        metrics["rs_types_contains_data"] = any(
            "data" in t.lower() or "数据" in t for t in rs_types
        )
        metrics["rs_types_contains_content_subscription"] = any(
            "content" in t.lower() or "内容" in t for t in rs_types
        )
        metrics["top_revenue_share"] = rs.get("top_revenue_share") or 0
        metrics["mrr"] = rs.get("mrr") or 0
        metrics["arpu"] = rs.get("arpu") or 0
        metrics["mrr_growth_rate"] = rs.get("mrr_growth_rate") or 0

        # KR - 核心资源
        kr = bm.get("key_resources", {})
        metrics["unique_resource"] = bool(kr.get("unique"))
        kr_type = kr.get("primary", "").lower()
        metrics["kr_type"] = "manufacturing" if "制造" in kr_type or "生产" in kr_type else \
                            "data_assets" if "数据" in kr_type else \
                            "software_platform"

        # KA - 关键业务
        ka = bm.get("key_activities", {})
        metrics["ka_primary_exists"] = bool(ka.get("primary"))

        # KP - 重要伙伴
        kp = bm.get("key_partnerships", {})
        metrics["kp_count"] = len(kp.get("main_partners", []))

        # CS - 成本结构
        cost = bm.get("cost_structure", {})
        metrics["gross_margin"] = cost.get("gross_margin") or 0

        # 计算衍生指标
        if metrics["cac"] > 0 and metrics.get("gross_margin", 0) > 0:
            # 粗略 LTV/CAC 估算
            avg_lifetime = 1 / max(metrics["monthly_churn_rate"], 0.01)
            monthly_profit = metrics["arpu"] * metrics["gross_margin"]
            ltv = avg_lifetime * monthly_profit
            metrics["ltv_cac_ratio"] = ltv / metrics["cac"] if metrics["cac"] > 0 else 0

        # cac_vs_industry_ratio — 在 InferenceEngine.judge_l2() 中按行业基准动态计算
        # 此处仅标记字段存在性，值为 0（延迟到推理引擎填充）
        metrics["cac_vs_industry_ratio_exists"] = 1 if metrics["cac"] > 0 else 0

        # 创业阶段感知指标
        metrics["stage"] = stage
        metrics["is_seed"] = 1 if stage == "seed" else 0
        metrics["is_growth"] = 1 if stage == "growth" else 0
        metrics["is_mature"] = 1 if stage == "mature" else 0
        metrics["is_decline"] = 1 if stage == "decline" else 0

        # 比率指标
        total_costs = cost.get("major_costs", [])
        metrics["has_cost_breakdown"] = len(total_costs) > 0
        metrics["partner_count_ge_2"] = 1 if len(kp.get("main_partners", [])) >= 2 else 0
        metrics["pain_point_ge_2"] = 1 if len(vp.get("pain_points", [])) >= 2 else 0
        metrics["channel_ge_2"] = 1 if len(ch.get("types", [])) >= 2 else 0
        metrics["churn_under_5pct"] = 1 if (cr.get("monthly_churn_rate") or 99) < 0.05 else 0
        metrics["nps_ge_40"] = 1 if (cr.get("nps") or 0) >= 40 else 0
        metrics["margin_ge_60pct"] = 1 if (cost.get("gross_margin") or 0) >= 0.6 else 0

        return metrics

    def _infer_vp_type(self, vp: dict) -> str:
        """推断价值主张类型"""
        desc = vp.get("description", "").lower()
        if "subscription" in desc or "订阅" in desc:
            return "subscription_access"
        if "platform" in desc or "平台" in desc:
            return "platform"
        if "free" in desc or "免费" in desc:
            return "freemium_access"
        if "premium" in desc or "高端" in desc:
            return "premium_content"
        return "product"

    def evaluate_condition(self, condition: dict, metrics: dict) -> bool:
        """递归评估规则条件"""
        if "and" in condition:
            return all(
                self.evaluate_condition(sub, metrics)
                for sub in condition["and"]
            )
        elif "or" in condition:
            return any(
                self.evaluate_condition(sub, metrics)
                for sub in condition["or"]
            )
        elif "not" in condition:
            return not self.evaluate_condition(condition["not"], metrics)
        else:
            return self._evaluate_atomic(condition, metrics)

    def _evaluate_atomic(self, cond: dict, metrics: dict) -> bool:
        """评估原子条件"""
        metric_name = cond.get("metric", "")
        operator = cond.get("operator", "==")
        value = cond.get("value")

        metric_val = metrics.get(metric_name)
        exists = metric_name in metrics and metric_val is not None

        try:
            if operator == "exists":
                # exists: true → 字段必须存在且非 None; exists: false → 字段不存在或为 None
                return exists == bool(value)
            elif operator == "not_exists":
                return not exists

            # 以下操作符要求字段存在
            if not exists:
                return False

            if operator == "==":
                return metric_val == value
            elif operator == "!=":
                return metric_val != value
            elif operator == ">":
                return float(metric_val) > float(value)
            elif operator == ">=":
                return float(metric_val) >= float(value)
            elif operator == "<":
                return float(metric_val) < float(value)
            elif operator == "<=":
                return float(metric_val) <= float(value)
            elif operator == "contains":
                return str(value).lower() in str(metric_val).lower()
            else:
                logger.warning("unknown operator", operator=operator)
                return False
        except (ValueError, TypeError) as e:
            logger.warning("condition evaluation error", error=str(e), metric=metric_name)
            return False

    def match_rules(self, metrics: dict) -> list[dict]:
        """匹配并执行所有规则"""
        triggered = []
        for rule in self.rules:
            try:
                condition = rule.get("condition", {})
                if not condition:
                    continue
                # 支持 condition_script 作为补充条件
                condition_script = rule.get("condition_script", "")
                if condition_script:
                    # 解析 "cac / arpu > 0.5" 格式的表达式
                    if not self._evaluate_script(condition_script, metrics):
                        continue
                elif not self.evaluate_condition(condition, metrics):
                    continue
                triggered.append(rule)
            except Exception as e:
                logger.error("rule evaluation error", rule_id=rule.get("id"), error=str(e))
        return triggered

    def _evaluate_script(self, script: str, metrics: dict) -> bool:
        """评估简单的条件脚本表达式"""
        try:
            import re
            # 匹配: 指标 / 指标 > 阈值
            pattern = r'(\w+)\s*/\s*(\w+)\s*([><=!]+)\s*([\d.]+)'
            match = re.match(pattern, script.strip())
            if match:
                left_num = metrics.get(match.group(1), 0) or 0
                right_num = metrics.get(match.group(2), 0) or 0
                divisor = right_num if right_num != 0 else 1
                operator = match.group(3)
                threshold = float(match.group(4))

                value = left_num / divisor
                if operator == ">":
                    return value > threshold
                elif operator == ">=":
                    return value >= threshold
                elif operator == "<":
                    return value < threshold
                elif operator == "<=":
                    return value <= threshold
                elif operator == "==":
                    return value == threshold
            return False
        except Exception as e:
            logger.warning("script evaluation error", script=script, error=str(e))
            return False

    def get_rules_by_domain(self, domain: str) -> list[dict]:
        """按领域获取规则"""
        return [r for r in self.rules if r.get("domain") == domain]
