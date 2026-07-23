"""L1 事实采集器 — 关键词分类 + 槽位填充 + 上下文感知追问"""

import uuid
import re
import structlog
from typing import Optional

from app.models.ecc_schemas import FactNode, FactCategory, FactSource

logger = structlog.get_logger()

# ============================================================
# 关键词分类体系 — 覆盖创始人常用的表达方式
# ============================================================

# 每类的关键词 → 提取优先级权重
CATEGORY_KEYWORDS: dict[FactCategory, list[dict]] = {
    FactCategory.CUSTOMER_SEGMENT: [
        # 客户身份词
        {"words": ["客户是", "面向", "服务", "针对", "帮", "目标客户", "客户群体", "主要做"], "weight": 1.0},
        # 特定客户群体
        {"words": ["中小企业", "电商", "商家", "企业", "公司", "品牌", "个人", "设计师",
                    "运营", "销售", "HR", "财务", "老师", "医生", "学生", "宝妈"], "weight": 0.9},
        # 客户规模特征
        {"words": ["中小", "大型", "微型", "连锁", "SMB", "B2B", "B2C"], "weight": 0.8},
    ],
    FactCategory.PAIN_POINT: [
        {"words": ["痛点", "问题", "困难", "挑战", "需求", "麻烦", "困扰", "不够", "太低", "太高", "太贵", "太慢"], "weight": 1.0},
        {"words": ["成本高", "效率低", "流失", "转化低", "增长慢", "管理难", "招人难",
                    "数据分散", "信息不对称", "响应慢", "库存", "合规"], "weight": 0.9},
        # 负面/问题描述
        {"words": ["难以", "无法", "不容易", "很麻烦", "很贵", "耗时"], "weight": 0.8},
    ],
    FactCategory.VALUE_PROPOSITION: [
        {"words": ["做", "提供", "打造", "开发", "设计", "创建", "推出", "上线", "发布"], "weight": 1.0},
        {"words": ["平台", "系统", "工具", "产品", "服务", "APP", "小程序", "网站", "软件",
                    "SaaS", "解决方案"], "weight": 0.9},
        {"words": ["核心价值", "价值主张", "差异化", "优势", "不同", "特色", "亮点"], "weight": 1.0},
    ],
    FactCategory.REVENUE_MODEL: [
        {"words": ["收费", "付费", "收入", "赚钱", "变现", "定价", "价格", "客单价",
                    "ARPU", "MRR", "营收", "流水", "月收入", "年收入"], "weight": 1.0},
        {"words": ["订阅", "按", "月付", "年付", "免费", "增值", "广告", "抽成", "佣金",
                    "交易", "SaaS", "会员", "套餐"], "weight": 0.9},
        {"words": ["元", "块", "美元", "万"], "weight": 0.7},
    ],
    FactCategory.CHANNEL: [
        {"words": ["获客", "推广", "销售", "渠道", "触达", "营销", "流量", "客户来源"], "weight": 1.0},
        {"words": ["小红书", "抖音", "微信", "公众号", "社群", "SEO", "SEM", "广告",
                    "直营", "分销", "渠道合作", "口碑", "转介绍", "线上", "线下"], "weight": 0.9},
        {"words": ["CAC", "获客成本", "转化率", "线索", "leads"], "weight": 0.8},
    ],
    FactCategory.KEY_METRIC: [
        {"words": ["月活", "MAU", "DAU", "留存", "流失", "复购", "NPS", "满意度",
                    "LTV", "CAC", "转化率", "增长率", "毛利", "利润率"], "weight": 1.0},
        # 数字 + 单位模式
        {"words": ["个客户", "个用户", "万营收", "万收入", "万月", "%"], "weight": 0.9},
    ],
    FactCategory.COMPETITIVE_LANDSCAPE: [
        {"words": ["竞争对手", "竞品", "竞争", "市场", "行业", "替代", "对比", "友商"], "weight": 1.0},
        {"words": ["Zendesk", "美洽", "有赞", "微盟", "Salesforce", "HubSpot"], "weight": 0.8},
    ],
    FactCategory.TEAM: [
        {"words": ["团队", "合伙人", "创始人", "成员", "员工", "人", "技术", "运营", "销售"], "weight": 1.0},
        {"words": ["大厂", "背景", "经验", "年", "阿里", "腾讯", "字节", "百度"], "weight": 0.8},
    ],
}

# ============================================================
# 追问模板 — 每个分类多级追问，引用已有事实
# ============================================================

FOLLOW_UP_TEMPLATES: dict[str, list[str]] = {
    "customer_segment": [
        "你说的「{已有事实}」，具体是哪个细分？比如规模、行业分布？",
        "目前已经有多少客户/用户了？付费转化率大概多少？",
        "目标客户现在是怎么解决这个问题的？（竞争对手或替代方案）",
        "你的客户决策链有多长？谁做最终购买决策？",
        "不同客户群体的付费意愿有差异吗？",
    ],
    "pain_point": [
        "这个痛点「{已有事实}」具体表现在哪些方面？能举个实际场景吗？",
        "客户愿意为这个痛点付多少钱？做过付费测试吗？",
        "除了这个，还有哪些痛点？哪个最痛？",
        "这个痛点目前的解决方案是什么？客户满意吗？",
        "如果这个问题不解决，对客户会有什么影响？",
    ],
    "value_proposition": [
        "能不能一句话说清楚你的核心价值「{已有事实}」？",
        "你和已有的方案有什么本质不同？",
        "客户为什么选你不选别人？",
        "你的产品解决了客户哪个环节的问题？",
        "如果明天你的产品消失了，客户会有什么反应？",
    ],
    "revenue_model": [
        "你们怎么收费的？订阅/按次/免费+增值/广告/交易抽成/其他？",
        "目前的月收入和客单价大概多少？",
        "客户的付费意愿怎么样？做过价格测试吗？",
        "你的主要成本是什么？毛利大概多少？",
        "收入来源有几种？各占多少比例？",
    ],
    "channel": [
        "客户怎么找到你？通过什么渠道？",
        "目前获取一个客户大概花多少钱？",
        "哪个渠道效果最好？为什么？",
        "不同渠道的客户质量有差异吗？",
        "有没有试过新的获客方式？效果如何？",
    ],
    "key_metric": [
        "目前最关注什么指标？（月活/留存/转化率/毛利率）",
        "现在的数据大概是什么水平？多长时间统计一次？",
        "未来 3 个月的目标是什么？",
        "你认为哪个指标最能反映产品的健康度？",
        "现在的增长主要靠什么驱动？",
    ],
    "competitive_landscape": [
        "主要竞争对手有哪些？",
        "你觉得你的优势在哪里？",
        "这个市场竞争激烈吗？是蓝海还是红海？",
        "竞品最近有什么新动作？",
        "你的护城河是什么？对手容易复制吗？",
    ],
    "team": [
        "团队目前多少人？核心成员背景？",
        "目前最缺什么人才？",
        "团队之前做过类似的项目吗？",
        "团队的技术/行业经验如何？",
        "创始人之前是做什么的？为什么选这个方向？",
    ],
}

# ============================================================
# 初始引导问题 — 按行业
# ============================================================

INITIAL_QUESTIONS: dict[str, list[str]] = {
    "saas": [
        "你的 SaaS 产品主要帮谁解决什么问题？",
        "目前有多少付费客户了？月收入大概多少？",
        "你的核心差异化是什么？为什么客户选你不选别人？",
    ],
    "ecommerce": [
        "你在哪个平台卖东西？主要卖什么品类？",
        "现在的月流水和毛利率大概是多少？",
        "复购率怎么样？客户一般多久回来买一次？",
    ],
    "default": [
        "请简单介绍一下你的项目——你是做什么的？为谁解决什么问题？",
        "目前进展到什么阶段了？（想法/MVP/有收入/已盈利）",
        "你觉得当前最大的挑战是什么？",
    ],
}

# 事实分类 → 九维模型字段映射
FACT_TO_BM_FIELD: dict[FactCategory, str] = {
    FactCategory.CUSTOMER_SEGMENT: "customer_segments",
    FactCategory.PAIN_POINT: "value_proposition",
    FactCategory.VALUE_PROPOSITION: "value_proposition",
    FactCategory.REVENUE_MODEL: "revenue_streams",
    FactCategory.CHANNEL: "channels",
    FactCategory.KEY_METRIC: "customer_relationships",
}

# L1 最低信息要求 — 按创业阶段
MIN_REQUIREMENTS: dict[str, dict] = {
    "seed": {
        "core_categories": ["customer_segment", "pain_point", "value_proposition"],
        "min_core_covered": 2,
        "min_total_nodes": 4,
    },
    "growth": {
        "core_categories": ["customer_segment", "pain_point", "value_proposition", "revenue_model", "channel"],
        "min_core_covered": 3,
        "min_total_nodes": 6,
    },
    "mature": {
        "core_categories": ["customer_segment", "value_proposition", "revenue_model", "channel", "key_metric", "competitive_landscape"],
        "min_core_covered": 4,
        "min_total_nodes": 8,
    },
    "default": {
        "core_categories": ["customer_segment", "pain_point", "value_proposition", "revenue_model"],
        "min_core_covered": 2,
        "min_total_nodes": 4,
    },
}


class FactCollector:
    """事实采集器 — 关键词分类 + 槽位填充 + 上下文感知追问"""

    def __init__(self):
        # 建关键词索引提升性能
        self._kw_index = self._build_keyword_index()

    def _build_keyword_index(self) -> dict[str, tuple[FactCategory, float]]:
        """建立关键词→分类的快速索引"""
        index = {}
        for cat, groups in CATEGORY_KEYWORDS.items():
            for group in groups:
                for word in group["words"]:
                    # 长词优先匹配
                    index[word] = (cat, group["weight"])
        return index

    # ---------------------------------------------------------------
    # 核心方法
    # ---------------------------------------------------------------

    def get_initial_questions(self, industry: str = "") -> list[str]:
        """获取初始引导问题"""
        return list(INITIAL_QUESTIONS.get(industry, INITIAL_QUESTIONS["default"]))

    def extract_facts(self, text: str, industry: str = "") -> list[FactNode]:
        """从文本中提取事实节点 — 关键词分类 + 槽位填充"""
        nodes = []
        seen_statements = set()

        # 1. 关键词扫描
        category_hits: dict[FactCategory, list[tuple[str, float]]] = {}
        for cat in FactCategory:
            if cat in (FactCategory.STAGE, FactCategory.OTHER):
                continue
            category_hits[cat] = []

        # 分词匹配
        for word, (cat, weight) in sorted(self._kw_index.items(), key=lambda x: -len(x[0])):
            if word in text:
                # 提取包含该关键词的上下文片段
                context = self._extract_context(text, word)
                if context and context not in seen_statements:
                    seen_statements.add(context)
                    category_hits[cat].append((context, weight))

        # 2. 数字与单位提取（单独处理）
        number_patterns = [
            (r"(\d+)\s*(?:万|w)\s*(?:元|块|收入|营收|月)", FactCategory.KEY_METRIC, 1.0),
            (r"(?:月收入|月营收|MRR)\s*[:：]?\s*(\d+)", FactCategory.KEY_METRIC, 1.0),
            (r"(?:ARPU|客单价)\s*[:：]?\s*(\d+)", FactCategory.KEY_METRIC, 1.0),
            (r"(\d+)\s*%\s*(?:流失|留存|增长|转化|毛利)", FactCategory.KEY_METRIC, 1.0),
            (r"(?:CAC|获客成本)\s*[:：]?\s*(\d+)", FactCategory.CHANNEL, 1.0),
            (r"(?:NPS|满意度)\s*[:：]?\s*(\d+)", FactCategory.KEY_METRIC, 1.0),
        ]
        for pattern, cat, weight in number_patterns:
            m = re.search(pattern, text)
            if m:
                matched = m.group(0).strip()
                if matched not in seen_statements:
                    seen_statements.add(matched)
                    category_hits[cat].append((matched, weight))

        # 3. 按权重取最高的事实（每类最多 2 条）
        for cat, hits in category_hits.items():
            # 去重 + 按权重排序
            seen = set()
            unique = []
            for statement, weight in sorted(hits, key=lambda x: -x[1]):
                if statement not in seen:
                    seen.add(statement)
                    unique.append((statement, weight))
            for statement, _ in unique[:2]:
                node = FactNode(
                    node_id=f"FACT-{uuid.uuid4().hex[:8]}",
                    category=cat,
                    statement=statement,
                    confidence=round(0.5 + 0.3 * _[1] if isinstance(_, tuple) else 0.7, 2),
                    source=FactSource.FOUNDER_SELF_REPORT,
                    follow_up_questions=[],
                )
                nodes.append(node)

        # 4. 尝试推断创业阶段
        stage = self._infer_stage(text)
        if stage:
            nodes.append(FactNode(
                node_id=f"FACT-STAGE-{uuid.uuid4().hex[:4]}",
                category=FactCategory.STAGE,
                statement=f"创业阶段: {stage}",
                confidence=0.6,
                source=FactSource.INFERRED,
                needs_verification=True,
            ))

        logger.info("facts extracted", text_len=len(text), count=len(nodes),
                     categories=list({n.category.value for n in nodes}))
        return nodes

    def _extract_context(self, text: str, keyword: str, window: int = 15) -> str:
        """提取关键词所在上下文片段"""
        idx = text.find(keyword)
        if idx == -1:
            return ""
        start = max(0, idx - window)
        end = min(len(text), idx + len(keyword) + window)
        return text[start:end].strip()

    def _infer_stage(self, text: str) -> str:
        """推断创业阶段"""
        t = text.lower()
        if any(w in t for w in ["想法", "构思", "调研", "计划", "筹备"]):
            return "seed"
        if any(w in t for w in ["上线", "发布", "第一批", "早期", "增长", "扩张", "规模"]):
            return "growth"
        if any(w in t for w in ["成熟", "稳定", "盈利", "规模化", "头部"]):
            return "mature"
        if any(w in t for w in ["转型", "下滑", "困难", "裁", "萎缩", "退出"]):
            return "decline"
        return ""

    # ---------------------------------------------------------------
    # 追问调度
    # ---------------------------------------------------------------

    def check_missing_categories(self, fact_nodes: list[FactNode], stage: str = "seed") -> list[str]:
        """检查缺失的分类 — 按创业阶段设置信息完整度门槛"""
        # 确定阶段要求
        req = MIN_REQUIREMENTS.get(stage, MIN_REQUIREMENTS["default"])
        existing = {n.category.value for n in fact_nodes}

        # 核心分类覆盖度检查
        core_covered = sum(1 for c in req["core_categories"] if c in existing)
        if core_covered >= req["min_core_covered"] and len(fact_nodes) >= req["min_total_nodes"]:
            return []

        # 还不够 — 返回缺失的核心分类
        missing = [c for c in req["core_categories"] if c not in existing]
        return missing[:2]

    def generate_follow_ups(self, missing_categories: list[str], existing_facts: list[FactNode] = None) -> list[str]:
        """根据缺失分类生成追问 — 引用已有事实使追问更具体"""
        questions = []

        # 建立已有事实的索引
        existing_by_cat: dict[str, list[str]] = {}
        if existing_facts:
            for node in existing_facts:
                cat = node.category.value
                if cat not in existing_by_cat:
                    existing_by_cat[cat] = []
                existing_by_cat[cat].append(node.statement)

        for cat in missing_categories:
            templates = FOLLOW_UP_TEMPLATES.get(cat, [])
            if not templates:
                continue

            # 拿到第一个模板
            q = templates[0]

            # 如果有该分类的已有事实，注入上下文
            existing = existing_by_cat.get(cat, [])
            if existing and "{已有事实}" in q:
                q = q.replace("{已有事实}", existing[0][:20])
            elif "{已有事实}" in q:
                # 没有已有事实，改用第二个问题模板
                q = templates[1] if len(templates) > 1 else templates[0]

            questions.append(q)

        return questions

    # ---------------------------------------------------------------
    # 数据转换
    # ---------------------------------------------------------------

    def facts_to_business_model(self, fact_nodes: list[FactNode]) -> "BusinessModelData":
        """将事实节点转换为 BusinessModelData"""
        from app.models.schemas import (
            BusinessModelData, ValueProposition, CustomerSegments,
            Channels, CustomerRelationships, RevenueStreams,
            KeyResources, KeyActivities, KeyPartnerships, CostStructure,
        )

        # 按分类聚合事实
        facts_by_category: dict[str, list[str]] = {}
        for node in fact_nodes:
            cat = node.category.value
            if cat not in facts_by_category:
                facts_by_category[cat] = []
            if len(facts_by_category[cat]) < 3:
                facts_by_category[cat].append(node.statement)

        def first(cat: str) -> str:
            return facts_by_category.get(cat, [""])[0]

        def all_facts(cat: str) -> list[str]:
            return facts_by_category.get(cat, [])

        # 解析流失率
        churn = None
        nps = None
        for s in all_facts(FactCategory.KEY_METRIC.value):
            m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:流失|留存)", s)
            if m:
                churn = float(m.group(1)) / 100
            m = re.search(r"NPS\s*[:：]?\s*(\d+)", s)
            if m:
                nps = float(m.group(1))

        # 解析 CAC
        cac = None
        for s in all_facts(FactCategory.CHANNEL.value):
            m = re.search(r"CAC\s*[:：]?\s*(\d+)", s)
            if m:
                cac = float(m.group(1))
            m = re.search(r"获客成本\s*[:：]?\s*(\d+)", s)
            if m:
                cac = float(m.group(1))

        return BusinessModelData(
            value_proposition=ValueProposition(
                description=first(FactCategory.VALUE_PROPOSITION.value) or first(FactCategory.PAIN_POINT.value),
                pain_points=all_facts(FactCategory.PAIN_POINT.value),
                differentiation="",
            ),
            customer_segments=CustomerSegments(
                primary=first(FactCategory.CUSTOMER_SEGMENT.value),
                secondary="",
                tam=None,
                sam=None,
            ),
            channels=Channels(
                types=all_facts(FactCategory.CHANNEL.value),
                cac=cac,
            ),
            customer_relationships=CustomerRelationships(
                type="",
                monthly_churn_rate=churn,
                nps=nps,
            ),
            revenue_streams=RevenueStreams(
                types=all_facts(FactCategory.REVENUE_MODEL.value),
                mrr=None,
                arpu=None,
                top_revenue_share=None,
            ),
        )
