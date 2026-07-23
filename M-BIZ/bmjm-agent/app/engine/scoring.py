"""九维评分引擎 - 维度评分与综合健康度计算"""

import structlog
from app.models.enums import (
    DIMENSIONS, DEFAULT_DIMENSION_WEIGHTS, HEALTH_THRESHOLDS, HealthLevel,
)
from app.models.schemas import DimensionScore, OverallHealth

logger = structlog.get_logger()


# 创业阶段适配权重
STAGE_WEIGHTS: dict[str, dict[str, float]] = {
    "seed": {
        "VP": 0.25, "CS": 0.20, "CH": 0.05, "CR": 0.05,
        "RS": 0.10, "KR": 0.15, "KA": 0.10, "KP": 0.05, "COST": 0.05,
    },
    "growth": {
        "VP": 0.10, "CS": 0.10, "CH": 0.20, "CR": 0.20,
        "RS": 0.20, "KR": 0.05, "KA": 0.05, "KP": 0.05, "COST": 0.05,
    },
    "mature": {
        "VP": 0.05, "CS": 0.05, "CH": 0.10, "CR": 0.10,
        "RS": 0.10, "KR": 0.20, "KA": 0.05, "KP": 0.15, "COST": 0.20,
    },
    "decline": {
        "VP": 0.25, "CS": 0.10, "CH": 0.05, "CR": 0.05,
        "RS": 0.20, "KR": 0.05, "KA": 0.20, "KP": 0.05, "COST": 0.05,
    },
}


class ScoringEngine:
    """九维评分引擎"""

    def __init__(self, weights: dict[str, float] | None = None):
        self._default_weights = dict(DEFAULT_DIMENSION_WEIGHTS)
        self.weights = weights or dict(self._default_weights)

    def set_stage_weights(self, stage: str):
        """按创业阶段调整维度权重"""
        stage_w = STAGE_WEIGHTS.get(stage)
        if stage_w:
            self.weights = dict(stage_w)
        else:
            self.weights = dict(self._default_weights)

    def score_dimensions(self, business_model_data: dict) -> dict[str, DimensionScore]:
        """对九大维度逐一评分"""
        bm = business_model_data
        scores = {}

        # VP - 价值主张
        vp = bm.get("value_proposition", {})
        vp_score = self._score_vp(vp)
        scores["VP"] = DimensionScore(score=vp_score, summary=self._vp_summary(vp_score, vp))

        # CS - 客户细分
        cs = bm.get("customer_segments", {})
        cs_score = self._score_cs(cs)
        scores["CS"] = DimensionScore(score=cs_score, summary=self._cs_summary(cs_score, cs))

        # CH - 渠道通路
        ch = bm.get("channels", {})
        ch_score = self._score_ch(ch)
        scores["CH"] = DimensionScore(score=ch_score, summary=self._ch_summary(ch_score, ch))

        # CR - 客户关系
        cr = bm.get("customer_relationships", {})
        cr_score = self._score_cr(cr)
        scores["CR"] = DimensionScore(score=cr_score, summary=self._cr_summary(cr_score, cr))

        # RS - 收入来源
        rs = bm.get("revenue_streams", {})
        rs_score = self._score_rs(rs)
        scores["RS"] = DimensionScore(score=rs_score, summary=self._rs_summary(rs_score, rs))

        # KR - 核心资源
        kr = bm.get("key_resources", {})
        kr_score = self._score_kr(kr)
        scores["KR"] = DimensionScore(score=kr_score, summary=self._kr_summary(kr_score, kr))

        # KA - 关键业务
        ka = bm.get("key_activities", {})
        ka_score = self._score_ka(ka)
        scores["KA"] = DimensionScore(score=ka_score, summary=self._ka_summary(ka_score, ka))

        # KP - 重要伙伴
        kp = bm.get("key_partnerships", {})
        kp_score = self._score_kp(kp)
        scores["KP"] = DimensionScore(score=kp_score, summary=self._kp_summary(kp_score, kp))

        # COST - 成本结构
        cost = bm.get("cost_structure", {})
        cost_score = self._score_cost(cost)
        scores["COST"] = DimensionScore(score=cost_score, summary=self._cost_summary(cost_score, cost))

        return scores

    def calculate_overall_health(self, scores: dict[str, DimensionScore]) -> OverallHealth:
        """计算综合健康度"""
        weighted_sum = 0.0
        total_weight = 0.0

        for dim in DIMENSIONS:
            score_obj = scores.get(dim)
            if score_obj:
                weight = self.weights.get(dim, 0.10)
                # 归一化: 1-5 分映射到 0-1
                normalized = (score_obj.score - 1) / 4.0
                weighted_sum += normalized * weight
                total_weight += weight

        overall = weighted_sum / total_weight if total_weight > 0 else 0.0
        level = self._determine_level(overall)

        return OverallHealth(score=round(overall, 2), level=level)

    def _determine_level(self, score: float) -> HealthLevel:
        """根据分值确定健康度等级"""
        if score >= HEALTH_THRESHOLDS["healthy"]:
            return HealthLevel.HEALTHY
        elif score >= HEALTH_THRESHOLDS["sub_healthy"]:
            return HealthLevel.SUB_HEALTHY
        elif score >= HEALTH_THRESHOLDS["warning"]:
            return HealthLevel.WARNING
        else:
            return HealthLevel.CRITICAL

    # ---- VP 评分 ----
    def _score_vp(self, vp: dict) -> int:
        score = 3  # 基准分
        if vp.get("description"):
            score += 1
        pain_points = vp.get("pain_points", [])
        if len(pain_points) >= 3:
            score += 1
        elif len(pain_points) >= 1:
            score += 0  # 维持基准
        else:
            score -= 1
        if vp.get("differentiation"):
            score += 1
        return max(1, min(5, score))

    def _vp_summary(self, score: int, vp: dict) -> str:
        if score >= 4:
            return "价值主张清晰，与客户痛点匹配度高"
        elif score >= 3:
            return "价值主张基本明确，建议进一步聚焦差异化"
        else:
            return "价值主张模糊，需明确核心价值与目标痛点"

    # ---- CS 评分 ----
    def _score_cs(self, cs: dict) -> int:
        score = 3
        if cs.get("primary"):
            score += 1
        if cs.get("secondary"):
            score += 1
        if cs.get("tam") and cs["tam"] > 100000000:
            score += 1
        return max(1, min(5, score))

    def _cs_summary(self, score: int, cs: dict) -> str:
        if score >= 4:
            return "客户细分明确，目标市场容量充足"
        elif score >= 3:
            return "客户细分基本清晰，建议补充市场容量数据"
        else:
            return "客户细分不明确，需定义核心目标客户"

    # ---- CH 评分 ----
    def _score_ch(self, ch: dict) -> int:
        score = 3
        types = ch.get("types", [])
        if len(types) >= 2:
            score += 1
        cac = ch.get("cac")
        if cac and cac < 5000:
            score += 1
        elif cac and cac > 10000:
            score -= 1
        return max(1, min(5, score))

    def _ch_summary(self, score: int, ch: dict) -> str:
        if score >= 4:
            return "渠道组合合理，获客效率良好"
        elif score >= 3:
            return "渠道组合基本合理，有优化空间"
        else:
            return "渠道覆盖不足或获客成本偏高，需重点优化"

    # ---- CR 评分 ----
    def _score_cr(self, cr: dict) -> int:
        score = 3
        churn = cr.get("monthly_churn_rate")
        if churn is not None:
            if churn < 0.03:
                score += 1
            elif churn > 0.08:
                score -= 1
        nps = cr.get("nps")
        if nps is not None:
            if nps >= 50:
                score += 1
            elif nps < 20:
                score -= 1
        return max(1, min(5, score))

    def _cr_summary(self, score: int, cr: dict) -> str:
        if score >= 4:
            return "客户留存率良好，NPS 表现优秀"
        elif score >= 3:
            return "客户留存处于行业中位水平，有优化空间"
        else:
            return "客户流失风险较高，需建立留存优化机制"

    # ---- RS 评分 ----
    def _score_rs(self, rs: dict) -> int:
        score = 3
        types = rs.get("types", [])
        if len(types) >= 2:
            score += 1
        if rs.get("mrr"):
            score += 1
        top_share = rs.get("top_revenue_share") or 0
        if top_share > 0.8:
            score -= 1
        return max(1, min(5, score))

    def _rs_summary(self, score: int, rs: dict) -> str:
        if score >= 4:
            return "收入来源多元，营收稳定健康"
        elif score >= 3:
            return "收入来源基本稳定，建议拓展多元化渠道"
        else:
            return "收入来源单一或营收不稳定，抗风险能力弱"

    # ---- KR 评分 ----
    def _score_kr(self, kr: dict) -> int:
        score = 3
        if kr.get("primary"):
            score += 1
        if kr.get("unique"):
            score += 1
        return max(1, min(5, score))

    def _kr_summary(self, score: int, kr: dict) -> str:
        if score >= 4:
            return "核心资源明确，具备独特竞争优势"
        elif score >= 3:
            return "核心资源基本可用，建议构建独特壁垒"
        else:
            return "核心资源不明确，竞争壁垒薄弱"

    # ---- KA 评分 ----
    def _score_ka(self, ka: dict) -> int:
        score = 3
        if ka.get("primary"):
            score += 1
        return max(1, min(5, score))

    def _ka_summary(self, score: int, ka: dict) -> str:
        if score >= 4:
            return "关键业务聚焦，运营效率良好"
        else:
            return "关键业务定义需进一步聚焦"

    # ---- KP 评分 ----
    def _score_kp(self, kp: dict) -> int:
        score = 3
        partners = kp.get("main_partners", [])
        if len(partners) >= 2:
            score += 1
        dependence = kp.get("dependence_level", "low")
        if dependence in ("high", "very_high"):
            score -= 1
        return max(1, min(5, score))

    def _kp_summary(self, score: int, kp: dict) -> str:
        if score >= 4:
            return "合作伙伴结构合理，合作深度良好"
        elif score >= 3:
            return "合作伙伴结构基本合理，建议拓展关键合作"
        else:
            return "合作伙伴不足或依赖度过高，存在供应链风险"

    # ---- 成本评分 ----
    def _score_cost(self, cost: dict) -> int:
        score = 3
        margin = cost.get("gross_margin")
        if margin is not None:
            if margin >= 0.7:
                score += 1
            elif margin >= 0.4:
                score += 0
            else:
                score -= 1
        if cost.get("major_costs"):
            score += 1
        return max(1, min(5, score))

    def _cost_summary(self, score: int, cost: dict) -> str:
        if score >= 4:
            return "成本结构合理，毛利率健康"
        elif score >= 3:
            return "成本结构基本合理，有优化空间"
        else:
            return "成本结构不合理或毛利率偏低，需重点关注"
