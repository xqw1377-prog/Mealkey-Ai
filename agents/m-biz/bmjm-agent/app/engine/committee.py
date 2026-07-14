"""商业委员会引擎 — 四专家角色的意见生成、共识检测与报告输出"""

import structlog
from typing import Optional
from collections import Counter
from app.models.ecc_schemas import (
    ExpertOpinion, CouncilReport, CouncilConsensus,
    RuleJudgment, CrossAnalysis, StrategicSuggestion, FactNode,
)
from app.models.schemas import DimensionScore, OverallHealth
from app.models.enums import DIMENSIONS
from app.engine.knowledge_loader import load_rules

logger = structlog.get_logger()

# ============================================================
# 专家档案 — 每位专家的身份、风格、关注领域
# ============================================================

EXPERT_PROFILES = {
    "cso": {
        "code": "cso",
        "name": "王远",
        "title": "战略官",
        "focus": "看方向",
        "question": "这个模式能跑多大？",
        "style": "宏观、前瞻、数据驱动",
        "concerned_dims": ["VP", "CS"],
        "intro": "我是战略官王远，负责从宏观视角评估你的商业模式——市场空间、竞争格局、增长天花板。",
        "score_descriptors": {5: "市场空间巨大，竞争壁垒显著", 4: "方向明确，具备规模潜力", 3: "方向可行，但需进一步验证", 2: "市场定位模糊，天花板明显", 1: "缺乏市场可行性"},
        "emojis": {"title": "🔭", "concern": "📈", "advice": "🎯"},
    },
    "cpo": {
        "code": "cpo",
        "name": "陈峰",
        "title": "产品官",
        "focus": "看价值",
        "question": "用户真的需要吗？",
        "style": "用户导向、细节敏锐、同理心强",
        "concerned_dims": ["VP", "CS"],
        "intro": "我是产品官陈峰，我会从用户视角审视你的价值主张——痛点是否真实、解决方案是否匹配。",
        "score_descriptors": {5: "痛点极为清晰，产品匹配度极高", 4: "价值主张明确，与需求高度吻合", 3: "价值主张基本成立，还需打磨", 2: "价值主张模糊，痛点挖掘不足", 1: "未找到真正的用户需求"},
        "emojis": {"title": "💡", "concern": "🤔", "advice": "🛠️"},
    },
    "cfo": {
        "code": "cfo",
        "name": "李敏",
        "title": "财务官",
        "focus": "看数字",
        "question": "这个账算得过来吗？",
        "style": "严谨、数字敏感、风险意识强",
        "concerned_dims": ["RS", "COST"],
        "intro": "我是财务官李敏，我的职责是检查你的单位经济模型——收入是否可持续、成本是否可控。",
        "score_descriptors": {5: "单位经济模型健康，财务状况优秀", 4: "财务指标良好，可持续性强", 3: "财务指标在中位水平，有优化空间", 2: "财务指标堪忧，需重点优化", 1: "单位经济模型不可持续"},
        "emojis": {"title": "💰", "concern": "⚠️", "advice": "📊"},
    },
    "coo": {
        "code": "coo",
        "name": "张诚",
        "title": "运营官",
        "focus": "看落地",
        "question": "这事儿干得成吗？",
        "style": "务实、执行力导向、关注节奏",
        "concerned_dims": ["CH", "CR", "KR", "KA", "KP"],
        "intro": "我是运营官张诚，我关心的是执行——渠道能不能触达、客户能不能留住、团队能不能干成。",
        "score_descriptors": {5: "运营体系成熟，执行路径清晰", 4: "运营能力扎实，具备规模化基础", 3: "运营基础具备，但各环节有优化空间", 2: "运营能力薄弱，关键环节存在短板", 1: "缺乏基本运营能力"},
        "emojis": {"title": "🏃", "concern": "🚧", "advice": "✅"},
    },
}

# 得分区间 → 中文标签
SCORE_LABELS = {
    5: ("卓越", "远超行业标准，构成核心竞争力"),
    4: ("良好", "超过行业平均水平，有竞争优势"),
    3: ("合格", "达到行业平均水平，无显著短板"),
    2: ("薄弱", "低于行业平均，需重点关注"),
    1: ("危险", "严重不足或缺失，构成重大风险"),
}


class CouncilChair:
    """委员会主持人 — 协调四位专家、汇总意见、识别共识与分歧"""

    def __init__(self):
        self.rules = load_rules()
        # 建立 expert → rules 索引
        self.expert_rules: dict[str, list[dict]] = {}
        for r in self.rules:
            exp = r.get("expert", "cso")
            if exp not in self.expert_rules:
                self.expert_rules[exp] = []
            self.expert_rules[exp].append(r)
        logger.info("Council chair initialized", experts=list(EXPERT_PROFILES.keys()))

    # ---------------------------------------------------------------
    # 核心方法：生成委员会报告
    # ---------------------------------------------------------------

    def generate_report(
        self,
        dimension_scores: dict[str, dict],
        overall_health: Optional[dict],
        rule_judgments: list[RuleJudgment],
        cross_analysis: Optional[CrossAnalysis],
        suggestions: list[StrategicSuggestion],
        stage: str = "",
    ) -> CouncilReport:
        """生成完整的委员会报告"""
        opinions = []
        dim_scores_by_expert = self._group_scores_by_expert(dimension_scores)
        rules_by_expert = self._group_rules_by_expert(rule_judgments)

        for expert_code, profile in EXPERT_PROFILES.items():
            opinion = self._build_expert_opinion(
                expert_code, profile,
                dim_scores_by_expert.get(expert_code, {}),
                rules_by_expert.get(expert_code, []),
                suggestions, stage,
            )
            opinions.append(opinion)

        # 共识检测
        consensus = self._detect_consensus(opinions, overall_health)

        return CouncilReport(
            experts=opinions,
            consensus=consensus,
        )

    # ---------------------------------------------------------------
    # 专家意见生成
    # ---------------------------------------------------------------

    def _build_expert_opinion(
        self,
        expert_code: str,
        profile: dict,
        dim_scores: dict[str, dict],
        triggered_rules: list[RuleJudgment],
        suggestions: list[StrategicSuggestion],
        stage: str,
    ) -> ExpertOpinion:
        """为一位专家生成完整的评估意见"""
        # 维度评分描述
        dim_summaries = []
        total_score = 0.0
        for dim in profile.get("concerned_dims", DIMENSIONS):
            ds = dim_scores.get(dim)
            if ds:
                s = ds.get("score", 3)
                label, _ = SCORE_LABELS.get(s, ("未知", ""))
                dim_summaries.append(f"{dim}({s}分/{label})")
                total_score += s

        avg_dim_score = total_score / max(len(dim_summaries), 1)

        # 该专家关注的风险
        risk_notes = []
        for rj in triggered_rules:
            if rj.severity in ("risk_warning", "warning", "inconsistency"):
                risk_notes.append(rj.conclusion)

        # 该专家的建议（按优先级）
        expert_suggestions = []
        for s in suggestions:
            dim = s.dimension
            if dim in profile.get("concerned_dims", DIMENSIONS):
                expert_suggestions.append(s)

        # 综合评分 (1-5)
        expert_score = round(min(5, max(1, avg_dim_score)), 1)

        # 使用专家风格的评分描述
        score_desc = profile.get("score_descriptors", {}).get(round(expert_score), "")
        if score_desc:
            conclusion = score_desc
        else:
            conclusion = self._generate_conclusion(
                expert_code, expert_score, risk_notes, expert_suggestions, stage
            )

        return ExpertOpinion(
            expert_code=expert_code,
            expert_name=profile["name"],
            expert_title=profile["title"],
            expert_focus=profile["focus"],
            dim_scores={k: v for k, v in dim_scores.items() if k in profile.get("concerned_dims", [])},
            score=expert_score,
            risk_highlights=risk_notes[:3],
            conclusion=conclusion,
            suggestions=expert_suggestions[:3],
        )

    def _generate_conclusion(
        self, expert_code: str, score: float,
        risks: list[str], suggestions: list,
        stage: str,
    ) -> str:
        """根据专家视角和评分生成结论性描述"""
        if score >= 4.0:
            base = "整体表现良好"
            if not risks:
                return f"{base}，未发现明显风险点。"
            return f"{base}，但仍需关注以下方面。"
        elif score >= 3.0:
            return "基本合格，存在优化空间。" if not risks else "基本合格，但以下方面需要重点关注。"
        elif score >= 2.0:
            return "存在明显短板，建议优先解决以下问题。" if risks else "多个维度偏弱，建议系统性优化。"
        else:
            return "状况堪忧，建议从最薄弱环节开始系统性整改。"

    # ---------------------------------------------------------------
    # 共识检测
    # ---------------------------------------------------------------

    def _detect_consensus(
        self, opinions: list[ExpertOpinion],
        overall_health: Optional[dict],
    ) -> CouncilConsensus:
        """检测四位专家之间的共识与分歧"""
        scores = {o.expert_code: o.score for o in opinions}

        # 最高分与最低分的差距
        all_scores = list(scores.values())
        max_score = max(all_scores) if all_scores else 0
        min_score = min(all_scores) if all_scores else 0
        gap = max_score - min_score

        # 共识程度
        if gap <= 0.5:
            agreement_level = "高度一致"
        elif gap <= 1.0:
            agreement_level = "基本一致"
        elif gap <= 1.5:
            agreement_level = "存在分歧"
        else:
            agreement_level = "明显分歧"

        # 找出最低分专家（最担忧的）
        lowest_expert = min(opinions, key=lambda o: o.score) if opinions else None
        lowest_name = f"{lowest_expert.expert_name}({lowest_expert.expert_title})" if lowest_expert else ""

        # 找出最高分专家（最乐观的）
        highest_expert = max(opinions, key=lambda o: o.score) if opinions else None
        highest_name = f"{highest_expert.expert_name}({highest_expert.expert_title})" if highest_expert else ""

        # 综合健康度等级
        health_level = ""
        if overall_health:
            hl = overall_health.get("level", "")
            health_labels = {
                "healthy": "健康 🟢",
                "sub_healthy": "亚健康 🟡",
                "warning": "警示 🟠",
                "critical": "危险 🔴",
            }
            health_level = health_labels.get(hl, hl)

        # 一致建议方向
        unanimous_areas = self._find_unanimous_focus(opinions)

        # ---- 增强：分歧详情 ----
        disagreement_detail = ""
        if gap > 1.0:
            # 分组：高分组(>= median) 和低分组(< median)
            sorted_ops = sorted(opinions, key=lambda o: o.score, reverse=True)
            median_idx = len(sorted_ops) // 2
            high_group = sorted_ops[:median_idx]
            low_group = sorted_ops[median_idx:]
            high_names = "、".join(f"{o.expert_name}({o.expert_title})" for o in high_group)
            low_names = "、".join(f"{o.expert_name}({o.expert_title})" for o in low_group)
            risk_focus = "风险程度的判断"
            if low_group[0].risk_highlights:
                risk_focus = "/".join(low_group[0].risk_highlights[:2])
            disagreement_detail = (
                f"{high_names} 的评估相对积极（评分集中在{high_group[0].score}-{high_group[-1].score}），"
                f"而 {low_names} 更为谨慎（评分{low_group[0].score}-{low_group[-1].score}）。"
                f"分歧焦点主要在于对{risk_focus}的不同看法。"
            )

        # ---- 增强：风险共识 ----
        risk_consensus = self._find_risk_consensus(opinions)

        # ---- 增强：讨论摘要 ----
        discussion_summary = self._generate_discussion_summary(
            opinions, agreement_level, lowest_name, highest_name,
            risk_consensus, unanimous_areas,
        )

        return CouncilConsensus(
            agreement_level=agreement_level,
            score_gap=round(gap, 1),
            highest_expert=highest_name,
            lowest_expert=lowest_name,
            health_level=health_level,
            health_score=overall_health.get("score", 0) if overall_health else 0,
            unanimous_focus=list(unanimous_areas),
            disagreement_detail=disagreement_detail,
            risk_consensus=list(risk_consensus),
            discussion_summary=discussion_summary,
        )

    def _find_risk_consensus(self, opinions: list[ExpertOpinion]) -> set:
        """找到多位专家共同识别的风险"""
        # 收集所有专家标记的风险
        all_risks = []
        for op in opinions:
            all_risks.extend(op.risk_highlights)
        
        # 统计出现次数
        risk_counts = Counter(all_risks)
        
        # 返回被至少2位专家提到的风险
        consensus_risks = set()
        for risk, count in risk_counts.items():
            if count >= 2:
                consensus_risks.add(risk)
        
        return consensus_risks

    def _generate_discussion_summary(
        self, opinions: list[ExpertOpinion],
        agreement_level: str, lowest_name: str, highest_name: str,
        risk_consensus: set, unanimous_areas: set,
    ) -> str:
        """生成委员会讨论摘要（自然语言）"""
        parts = []
        
        # 共识程度
        parts.append(f"四位专家经过讨论，{agreement_level}。")
        
        # 健康度总评
        parts.append(f"整体来看，{lowest_name} 最为谨慎，{highest_name} 相对乐观。")
        
        # 风险共识
        if risk_consensus:
            top_risks = list(risk_consensus)[:2]
            parts.append(f"共同关注的风险包括：{'；'.join(top_risks)}。")
        
        # 分歧说明
        if agreement_level in ("存在分歧", "明显分歧"):
            parts.append("建议重点关注最谨慎的专家提出的意见，优先解决共识风险。")
        
        return " ".join(parts)

    def _find_unanimous_focus(self, opinions: list[ExpertOpinion]) -> set:
        """找到多位专家同时关注的领域"""
        focus_areas = set()
        # 如果多位专家提到了相同维度的风险
        risk_dims = {}
        for op in opinions:
            for dim_key in op.dim_scores:
                ds = op.dim_scores[dim_key]
                if isinstance(ds, dict) and ds.get("score", 3) <= 2:
                    risk_dims.setdefault(dim_key, 0)
                    risk_dims[dim_key] += 1

        for dim, count in risk_dims.items():
            if count >= 2:
                focus_areas.add(f"多位专家关注到{dim}维度薄弱")
        return focus_areas

    # ---------------------------------------------------------------
    # 分组工具
    # ---------------------------------------------------------------

    def _group_scores_by_expert(self, dimension_scores: dict) -> dict[str, dict]:
        """将维度评分按专家分组"""
        result = {code: {} for code in EXPERT_PROFILES}
        for dim, score_data in dimension_scores.items():
            for code, profile in EXPERT_PROFILES.items():
                if dim in profile.get("concerned_dims", []):
                    result[code][dim] = score_data
        return result

    def _group_rules_by_expert(self, rule_judgments: list[RuleJudgment]) -> dict[str, list[RuleJudgment]]:
        """将触发的规则判断按专家分组"""
        # 先用 expert_rules 索引反向查找
        rule_to_expert: dict[str, str] = {}
        for exp, rules in self.expert_rules.items():
            for r in rules:
                rule_to_expert[r.get("id", "")] = exp

        result: dict[str, list[RuleJudgment]] = {code: [] for code in EXPERT_PROFILES}
        for rj in rule_judgments:
            exp = rule_to_expert.get(rj.rule_id, "cso")
            result[exp].append(rj)
        return result

    # ---------------------------------------------------------------
    # 格式化输出
    # ---------------------------------------------------------------

    def format_report_text(self, report: CouncilReport, enterprise_name: str = "") -> str:
        """将委员会报告格式化为可读文本"""
        lines = []
        if enterprise_name:
            lines.append(f"📋 商业委员会评估报告 — {enterprise_name}")
        else:
            lines.append("📋 商业委员会评估报告")
        lines.append("")

        for opinion in report.experts:
            # 查找专家档案获取 emoji
            profile = EXPERT_PROFILES.get(opinion.expert_code, {})
            emojis = profile.get("emojis", {"title": "📋", "concern": "⚠️", "advice": "💬"})
            title_emoji = emojis.get("title", "📋")
            concern_emoji = emojis.get("concern", "⚠️")
            
            lines.append(f"{title_emoji} 【{opinion.expert_title} {opinion.expert_name}】— {opinion.expert_focus}")
            # 维度评分
            dim_strs = []
            for dim_key, ds in opinion.dim_scores.items():
                if isinstance(ds, dict):
                    s = ds.get("score", "?")
                    summary = ds.get("summary", "")
                    # 用简单条形图表示分数
                    bar = "■" * int(s) + "□" * (5 - int(s)) if isinstance(s, int) else ""
                    dim_strs.append(f"  {dim_key}: {s}分 {bar} — {summary}")
            if dim_strs:
                lines.extend(dim_strs)
            # 综合评分
            bar = "■" * int(opinion.score) + "□" * (5 - int(opinion.score))
            lines.append(f"  ★ 综合评分：{opinion.score}/5 {bar}")
            # 风险
            if opinion.risk_highlights:
                lines.append(f"  {concern_emoji} 关注：{'；'.join(opinion.risk_highlights[:2])}")
            # 结论
            lines.append(f"  💬 {opinion.conclusion}")
            lines.append("")

        # 共识
        cc = report.consensus
        lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        if cc.health_level:
            lines.append(f"🏆 综合健康度：{cc.health_score}/1.0（{cc.health_level}）")
        lines.append(f"📊 专家共识度：{cc.agreement_level}（分差{cc.score_gap}）")
        if cc.lowest_expert:
            lines.append(f"⚠️ 最担忧：{cc.lowest_expert}（评分{min(o.score for o in report.experts)}）")
        if cc.highest_expert:
            lines.append(f"✅ 最乐观：{cc.highest_expert}（评分{max(o.score for o in report.experts)}）")
        if cc.risk_consensus:
            for rc in list(cc.risk_consensus)[:2]:
                lines.append(f"🔴 多位专家同时关注：{rc}")
        if cc.disagreement_detail:
            lines.append(f"💬 分歧说明：{cc.disagreement_detail}")
        if cc.discussion_summary:
            lines.append(f"📝 {cc.discussion_summary}")
        if cc.unanimous_focus:
            for f in cc.unanimous_focus:
                lines.append(f"🎯 {f}")
        lines.append("")

        return "\n".join(lines)

    def format_expert_question(self, expert_code: str, context: str = "") -> str:
        """生成特定专家的追问问题"""
        profile = EXPERT_PROFILES.get(expert_code)
        if not profile:
            return ""
        return f"[{profile['title']} {profile['name']}] {context}"
