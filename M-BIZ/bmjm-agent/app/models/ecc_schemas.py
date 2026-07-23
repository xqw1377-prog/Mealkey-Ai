"""认知链 (ECC) 专用 Pydantic 模型"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum


# ============================================================
# 认知链状态枚举
# ============================================================

class CognitionLayer(str, Enum):
    """认知层枚举"""
    L1_FACT = "L1"
    L2_RULE = "L2"
    L3_ANALYSIS = "L3"
    L4_STRATEGY = "L4"
    L5_VERIFICATION = "L5"


class ChainStatus(str, Enum):
    """认知链状态"""
    IDLE = "idle"
    COLLECTING = "collecting"
    ANALYZING = "analyzing"
    SUGGESTING = "suggesting"
    AWAITING_VERIFICATION = "awaiting_verification"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class FactCategory(str, Enum):
    """事实节点分类"""
    CUSTOMER_SEGMENT = "customer_segment"
    PAIN_POINT = "pain_point"
    VALUE_PROPOSITION = "value_proposition"
    REVENUE_MODEL = "revenue_model"
    CHANNEL = "channel"
    KEY_METRIC = "key_metric"
    COMPETITIVE_LANDSCAPE = "competitive_landscape"
    TEAM = "team"
    STAGE = "stage"
    OTHER = "other"


class FactSource(str, Enum):
    """事实来源"""
    FOUNDER_SELF_REPORT = "创始人自述"
    QUESTIONNAIRE = "问卷"
    DOCUMENT = "文档"
    PUBLIC_DATA = "公开数据"
    INFERRED = "模型推断"


class VerificationStatus(str, Enum):
    """验证状态"""
    UNVERIFIED = "unverified"
    IN_PROGRESS = "in_progress"
    PASS = "pass"
    PARTIAL_PASS = "partial_pass"
    FAIL = "fail"
    ABANDONED = "abandoned"
    EXPIRED = "expired"


# ============================================================
# 认知节点
# ============================================================

class FactNode(BaseModel):
    """事实认知节点"""
    node_id: str
    category: FactCategory
    statement: str
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    source: FactSource = FactSource.FOUNDER_SELF_REPORT
    needs_verification: bool = True
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    follow_up_questions: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RuleJudgment(BaseModel):
    """规则判断（L2 输出）"""
    rule_id: str
    domain: str
    input_fact_ids: list[str] = Field(default_factory=list)
    conclusion: str
    confidence: float
    severity: str = "info"  # positive / warning / risk_warning / info


class CrossAnalysis(BaseModel):
    """交叉分析（L3 输出）"""
    consistency_check: str = "passed"  # passed / warning / failed
    key_weakness: str = ""
    growth_lever: str = ""
    pattern_matches: list[dict] = Field(default_factory=list)


class StrategicSuggestion(BaseModel):
    """策略建议（L4 输出）"""
    suggestion_id: str = ""
    priority: str = "medium"  # high / medium / low
    dimension: str = ""
    action: str
    expected_impact: str = ""
    verification_action: str = ""
    estimated_verification_period: str = ""


class VerificationTask(BaseModel):
    """验证任务（L5）"""
    task_id: str
    source_suggestion_id: str
    dimension: str
    verification_action: str
    estimated_period: str = ""
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deadline: Optional[datetime] = None
    reminder_schedule: list[str] = Field(default_factory=lambda: ["7天后", "14天后", "截止前3天"])


class VerificationResult(BaseModel):
    """验证回注结果"""
    result: VerificationStatus
    actual_data: dict = Field(default_factory=dict)
    conclusion: str = ""
    user_feedback: str = ""
    new_insights: list[str] = Field(default_factory=list)
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================
# 认知链会话
# ============================================================

class ChainSession(BaseModel):
    """认知链会话"""
    session_id: str
    enterprise_name: str = ""
    industry: str = ""
    stage: str = ""
    scale: str = ""

    # 认知链状态
    status: ChainStatus = ChainStatus.IDLE
    current_layer: CognitionLayer = CognitionLayer.L1_FACT
    completed_layers: list[CognitionLayer] = Field(default_factory=list)

    # L1 事实节点
    fact_nodes: list[FactNode] = Field(default_factory=list)

    # L2 规则判断
    rule_judgments: list[RuleJudgment] = Field(default_factory=list)

    # L3 分析
    dimension_scores: dict = Field(default_factory=dict)
    overall_health: Optional[dict] = None
    cross_analysis: Optional[CrossAnalysis] = None

    # L4 策略
    suggestions: list[StrategicSuggestion] = Field(default_factory=list)

    # L5 验证
    verification_tasks: list[VerificationTask] = Field(default_factory=list)
    verification_results: list[VerificationResult] = Field(default_factory=list)

    # 追问队列
    pending_questions: list[str] = Field(default_factory=list)
    answered_questions: list[dict] = Field(default_factory=list)

    # 元信息
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def update_timestamp(self):
        self.updated_at = datetime.now(timezone.utc)


# ============================================================
# 商业委员会模型
# ============================================================

class ExpertOpinion(BaseModel):
    """一位专家的评估意见"""
    expert_code: str = Field(default="", description="专家代号: cso/cpo/cfo/coo")
    expert_name: str = Field(default="", description="专家姓名")
    expert_title: str = Field(default="", description="专家头衔")
    expert_focus: str = Field(default="", description="专家关注方向")
    dim_scores: dict = Field(default_factory=dict, description="该专家关注的维度评分")
    score: float = Field(default=0.0, description="该专家的综合评分(1-5)")
    risk_highlights: list[str] = Field(default_factory=list, description="该专家重点关注的风险")
    conclusion: str = Field(default="", description="该专家的结论性意见")
    suggestions: list = Field(default_factory=list, description="该专家给出的建议")


class CouncilConsensus(BaseModel):
    """委员会共识检测结果"""
    agreement_level: str = Field(default="", description="共识程度: 高度一致/基本一致/存在分歧/明显分歧")
    score_gap: float = Field(default=0.0, description="最高分与最低分差距")
    highest_expert: str = Field(default="", description="最乐观的专家")
    lowest_expert: str = Field(default="", description="最担忧的专家")
    health_level: str = Field(default="", description="综合健康度等级")
    health_score: float = Field(default=0.0, description="综合健康度分数")
    unanimous_focus: list[str] = Field(default_factory=list, description="多位专家同时关注的领域")
    disagreement_detail: str = Field(default="", description="分歧详情说明（当存在分歧时）")
    risk_consensus: list[str] = Field(default_factory=list, description="多位专家共同识别的风险")
    discussion_summary: str = Field(default="", description="委员会讨论摘要（自然语言）")


class CouncilReport(BaseModel):
    """委员会完整报告"""
    experts: list[ExpertOpinion] = Field(default_factory=list, description="四位专家的意见")
    consensus: Optional[CouncilConsensus] = None


# ============================================================
# 对话请求/响应
# ============================================================

class ChatRequest(BaseModel):
    """对话请求"""
    session_id: str = Field(default="", description="会话ID(新会话留空)")
    message: str = Field(..., description="用户消息")
    enterprise_name: str = Field(default="", description="企业名称(首次必填)")
    industry: str = Field(default="", description="行业(首次必填)")
    stage: str = Field(default="", description="发展阶段(首次必填)")


class ChatResponseData(BaseModel):
    """对话响应"""
    session_id: str
    status: ChainStatus
    current_layer: CognitionLayer
    reply: str = Field(..., description="回复文本")
    pending_questions: list[str] = Field(default_factory=list)
    fact_nodes: list[FactNode] = Field(default_factory=list)
    dimension_scores: Optional[dict] = None
    rule_judgments: list[RuleJudgment] = Field(default_factory=list)
    suggestions: list[StrategicSuggestion] = Field(default_factory=list)
    verification_tasks: list[VerificationTask] = Field(default_factory=list)
    progress: float = Field(default=0.0, ge=0.0, le=1.0, description="认知链完成进度")
    council_report: Optional[CouncilReport] = Field(default=None, description="委员会报告(仅L3/L4/L5返回)")


class ChatApiResponse(BaseModel):
    """对话 API 通用响应"""
    code: int = 0
    message: str = "success"
    data: Optional[ChatResponseData] = None


# ============================================================
# 回注请求
# ============================================================

class VerificationSubmitRequest(BaseModel):
    """验证结果回注"""
    session_id: str
    task_id: str
    result: VerificationStatus
    actual_data: dict = Field(default_factory=dict)
    conclusion: str = ""
    user_feedback: str = ""
    new_insights: list[str] = Field(default_factory=list)
