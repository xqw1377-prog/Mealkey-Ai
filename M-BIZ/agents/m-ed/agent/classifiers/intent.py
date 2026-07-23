"""
M-ED 股权决策 Agent — 意图识别模块

核心职责：
  1. 判断用户输入是否与股权相关
  2. 识别具体的 action 类型
  3. 非股权消息一律拒绝（返回 NON_EQUITY_MESSAGE）

规则：
  - `does not route casual non-equity messages` — 负例，直接拒绝
  - 股权相关关键词匹配 + LLM 辅助判断
"""

from typing import Tuple, Optional
from agent.models.schemas import AgentAction
from agent.utils.errors import NonEquityMessageError

# 意图类型 — 复用 AgentAction 枚举值，额外增加 NON_EQUITY
class IntentType(str):
    DESIGN_EQUITY = AgentAction.DESIGN_EQUITY.value
    ADJUST_EQUITY = AgentAction.ADJUST_EQUITY.value
    SIMULATE = AgentAction.SIMULATE.value
    COMPLIANCE_CHECK = AgentAction.COMPLIANCE_CHECK.value
    GENERATE_DOCUMENT = AgentAction.GENERATE_DOCUMENT.value
    GET_CONTEXT = AgentAction.GET_CONTEXT.value
    RESET_CONTEXT = AgentAction.RESET_CONTEXT.value
    NON_EQUITY = "non_equity"  # 仅用于分类器内部拒绝


# ============================================================
# 股权相关关键词库
# ============================================================

# 强信号词 — 几乎 100% 是股权相关
STRONG_EQUITY_KEYWORDS = [
    "股权", "股份", "持股", "股东", "期权", "vesting", "股权结构",
    "分配方案", "股权分配", "股权比例", "股权调整", "股权激励",
    "期权池", "稀释", "融资", "天使轮", "A轮", "种子轮",
    "控制权", "投票权", "AB股", "一致行动", "股权协议",
    "股权转让", "退出机制", "回购", "股权架构", "股权设计",
    "股权合规", "工商变更", "股权登记",
    "equity", "share", "stock option", "cap table",
    "董事会", "合伙人", "合伙协议",
    "股权冻结", "股权质押", "股权代持",
]

# 弱信号词 — 需要结合上下文判断
WEAK_EQUITY_KEYWORDS = [
    "分配", "比例", "方案", "设计", "结构", "架构",
    "团队", "合伙人", "创始人", "CTO", "co-founder",
    "融资", "投资", "估值", "注册资本",
    "公司章程", "合伙协议", "工商注册",
]

# 明确非股权信号词 — 命中即拒绝（闲聊、无关话题）
NON_EQUITY_KEYWORDS = [
    "你好", "在吗", "你是谁", "你能做什么", "功能",
    "天气", "新闻", "基金", "理财", "投资建议",
    "法律咨询", "税务筹划", "会计", "记账",
    "产品", "PRD", "需求文档", "开发", "代码", "bug",
    "价格", "收费", "多少钱", "免费",
    "游戏", "电影", "音乐", "美食",
]


# action 关键词映射
ACTION_KEYWORD_MAP = {
    IntentType.DESIGN_EQUITY: [
        "设计", "分配", "划分", "分股份", "股权设计", "股权分配",
        "design", "allocate", "split",
    ],
    IntentType.ADJUST_EQUITY: [
        "调整", "修改", "变更", "增持", "减持", "股权调整",
        "adjust", "modify", "change",
    ],
    IntentType.SIMULATE: [
        "模拟", "推演", "假设", "如果", "scenario", "simulate",
        "稀释", "融资后",
    ],
    IntentType.COMPLIANCE_CHECK: [
        "合规", "审查", "检查", "风险", "compliance", "review",
        "合法", "合规性",
    ],
    IntentType.GENERATE_DOCUMENT: [
        "生成", "文档", "协议", "合同", "决议", "generate",
        "股权协议", "股东协议",
    ],
    IntentType.GET_CONTEXT: [
        "上下文", "当前状态", "当前方案", "历史", "context",
    ],
    IntentType.RESET_CONTEXT: [
        "重置", "清空", "重新开始", "reset", "clear",
    ],
}


def is_equity_related(text: str) -> Tuple[bool, str, float]:
    """
    判断文本是否与股权相关。

    Returns:
        (is_related, reason, confidence)
        - is_related: True=股权相关, False=非股权
        - reason: 判断依据
        - confidence: 0.0 ~ 1.0
    """
    if not text or not text.strip():
        return False, "空消息", 1.0

    text_lower = text.lower()

    # Step 1: 检查明确非股权关键词（先过滤闲聊）
    non_equity_matches = _match_keywords(text, NON_EQUITY_KEYWORDS)
    if non_equity_matches:
        # 但如果同时也匹配了强信号词，以强信号为准
        strong_matches = _match_keywords(text, STRONG_EQUITY_KEYWORDS)
        if not strong_matches:
            return False, f"命中非股权关键词: {non_equity_matches}", 0.95

    # Step 2: 检查强信号词
    strong_matches = _match_keywords(text, STRONG_EQUITY_KEYWORDS)
    if strong_matches:
        return True, f"命中强信号股权关键词: {strong_matches}", 0.95

    # Step 3: 检查弱信号词
    weak_matches = _match_keywords(text, WEAK_EQUITY_KEYWORDS)
    if weak_matches:
        # 弱信号需要满足一定数量或比例
        ratio = len(weak_matches) / len(text.split())
        if len(weak_matches) >= 2 or ratio > 0.3:
            return True, f"命中弱信号股权关键词: {weak_matches}", 0.7

    # Step 4: 默认拒绝
    return False, "未检测到股权相关关键词", 0.6


def classify_action(text: str) -> Tuple[IntentType, Optional[str]]:
    """
    识别用户意图对应的 action 类型。

    Returns:
        (intent_type, matched_keyword)
    """
    text_lower = text.lower()

    # 先判断是否股权相关
    is_related, reason, confidence = is_equity_related(text)
    if not is_related:
        return IntentType.NON_EQUITY, None

    # 逐一匹配 action
    best_match = None
    best_keyword = None
    best_length = 0

    for intent, keywords in ACTION_KEYWORD_MAP.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                # 优先匹配更长的关键词（更精确）
                if len(kw) > best_length:
                    best_match = intent
                    best_keyword = kw
                    best_length = len(kw)

    return best_match or IntentType.DESIGN_EQUITY, best_keyword


def _match_keywords(text: str, keywords: list) -> list:
    """返回文本中命中的关键词列表（中文字符整词匹配，英文字母边界匹配）"""
    text_lower = text.lower()
    matched = []
    for kw in keywords:
        kw_lower = kw.lower()
        idx = text_lower.find(kw_lower)
        if idx == -1:
            continue
        # 中文关键词（含中文的词）直接匹配——中文以词为单位，子串命中即算
        if any('\u4e00' <= c <= '\u9fff' for c in kw):
            matched.append(kw)
            continue
        # 纯英文关键词需要边界匹配（避免 "cat" 匹配 "category"）
        end = idx + len(kw_lower)
        before_ok = idx == 0 or not text_lower[idx-1].isalpha()
        after_ok = end >= len(text_lower) or not text_lower[end].isalpha()
        if before_ok and after_ok:
            matched.append(kw)
    return matched


def validate_and_classify(text: str) -> Tuple[IntentType, dict]:
    """
    对外接口：验证非股权消息 + 分类意图。

    Args:
        text: 用户输入文本

    Returns:
        (intent_type, metadata)

    Raises:
        NonEquityMessageError: 如果消息非股权相关
    """
    is_related, reason, confidence = is_equity_related(text)
    metadata = {
        "reason": reason,
        "confidence": confidence,
    }

    if not is_related:
        raise NonEquityMessageError()

    intent, keyword = classify_action(text)
    metadata["matched_keyword"] = keyword

    return intent, metadata
