"""BMJM Pydantic 请求/响应模型"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from .enums import (
    Industry, Stage, Scale, HealthLevel, Severity,
    Priority, DeviationStatus, QuartilePosition, BatchTaskStatus, BusinessCode,
)


# ============================================================
# 请求模型
# ============================================================

class EnterpriseInfo(BaseModel):
    """企业基本信息"""
    name: str = Field(..., description="企业名称")
    industry: Industry = Field(..., description="所属行业")
    stage: Stage = Field(..., description="发展阶段")
    scale: Scale = Field(..., description="企业规模")


class ValueProposition(BaseModel):
    """价值主张"""
    description: str = Field(default="", description="价值主张描述")
    pain_points: list[str] = Field(default_factory=list, description="客户痛点")
    differentiation: str = Field(default="", description="差异化优势")


class CustomerSegments(BaseModel):
    """客户细分"""
    primary: str = Field(default="", description="主要客户群体")
    secondary: str = Field(default="", description="次要客户群体")
    tam: Optional[float] = Field(default=None, description="总可寻址市场")
    sam: Optional[float] = Field(default=None, description="可服务市场")


class Channels(BaseModel):
    """渠道通路"""
    types: list[str] = Field(default_factory=list, description="渠道类型")
    cac: Optional[float] = Field(default=None, description="客户获取成本")


class CustomerRelationships(BaseModel):
    """客户关系"""
    type: str = Field(default="", description="客户关系类型")
    monthly_churn_rate: Optional[float] = Field(default=None, description="月流失率")
    nps: Optional[float] = Field(default=None, description="NPS 评分")


class RevenueStreams(BaseModel):
    """收入来源"""
    types: list[str] = Field(default_factory=list, description="收入类型")
    mrr: Optional[float] = Field(default=None, description="月经常性收入")
    arpu: Optional[float] = Field(default=None, description="每用户平均收入")
    top_revenue_share: Optional[float] = Field(default=None, description="最大收入来源占比")


class KeyResources(BaseModel):
    """核心资源"""
    primary: str = Field(default="", description="核心资源")
    unique: str = Field(default="", description="独特资源优势")


class KeyActivities(BaseModel):
    """关键业务"""
    primary: str = Field(default="", description="核心业务活动")


class KeyPartnerships(BaseModel):
    """重要伙伴"""
    main_partners: list[str] = Field(default_factory=list, description="主要合作伙伴")
    dependence_level: str = Field(default="low", description="依赖程度")


class CostStructure(BaseModel):
    """成本结构"""
    major_costs: list[str] = Field(default_factory=list, description="主要成本项")
    gross_margin: Optional[float] = Field(default=None, description="毛利率")


class BusinessModelData(BaseModel):
    """九维模型数据"""
    value_proposition: ValueProposition = Field(default_factory=ValueProposition)
    customer_segments: CustomerSegments = Field(default_factory=CustomerSegments)
    channels: Channels = Field(default_factory=Channels)
    customer_relationships: CustomerRelationships = Field(default_factory=CustomerRelationships)
    revenue_streams: RevenueStreams = Field(default_factory=RevenueStreams)
    key_resources: KeyResources = Field(default_factory=KeyResources)
    key_activities: KeyActivities = Field(default_factory=KeyActivities)
    key_partnerships: KeyPartnerships = Field(default_factory=KeyPartnerships)
    cost_structure: CostStructure = Field(default_factory=CostStructure)


class JudgeConfig(BaseModel):
    """判断配置"""
    min_confidence: float = Field(default=0.6, ge=0.0, le=1.0, description="最低置信度阈值")
    include_evidence_chain: bool = Field(default=True, description="是否包含推理链")
    include_benchmarking: bool = Field(default=True, description="是否包含对标分析")
    dimension_weights: Optional[dict[str, float]] = Field(default=None, description="自定义维度权重")
    custom_rules: list[str] = Field(default_factory=list, description="附加自定义规则ID列表")
    require_verification: bool = Field(default=True, description="是否强制每条建议附带验证动作")


class JudgeRequest(BaseModel):
    """单次判断请求"""
    request_id: str = Field(..., description="请求唯一标识")
    enterprise: EnterpriseInfo
    business_model_data: BusinessModelData = Field(default_factory=BusinessModelData)
    config: JudgeConfig = Field(default_factory=JudgeConfig)


# ============================================================
# 响应模型
# ============================================================

class DimensionScore(BaseModel):
    """维度评分"""
    score: int = Field(..., ge=1, le=5, description="评分(1-5)")
    summary: str = Field(default="", description="评分摘要")


class OverallHealth(BaseModel):
    """综合健康度"""
    score: float = Field(..., ge=0.0, le=1.0, description="综合健康度")
    level: HealthLevel


class DeviationItem(BaseModel):
    """偏离项"""
    value: float
    benchmark: float
    deviation: float
    status: DeviationStatus
    top_quartile: Optional[float] = Field(default=None, description="行业前25%基准")
    bottom_quartile: Optional[float] = Field(default=None, description="行业后25%基准")
    quartile_position: Optional[str] = Field(default=None, description="所处分位: top_quartile/above_avg/at_avg/below_avg/bottom_quartile")


class BenchmarkingResult(BaseModel):
    """对标结果"""
    industry: str
    deviations: dict[str, DeviationItem]


class RiskAlert(BaseModel):
    """风险预警"""
    rule_id: str
    severity: Severity
    message: str
    suggestion: str = ""
    verification_hint: str = ""


class StrategicSuggestion(BaseModel):
    """策略建议"""
    priority: Priority
    dimension: str
    action: str
    expected_impact: str = ""
    verification_action: str = ""
    estimated_verification_period: str = ""


class EvidenceChainItem(BaseModel):
    """证据链条目"""
    step: int
    rule_id: str
    input_summary: str = ""
    output_summary: str = ""
    confidence: float


class Metadata(BaseModel):
    """元信息"""
    processing_time_ms: int
    rules_triggered: list[str] = Field(default_factory=list)
    profiles_matched: list[str] = Field(default_factory=list)
    model_version: str = "1.0"


class JudgeResponseData(BaseModel):
    """判断响应数据"""
    model_type: str = ""
    match_confidence: float = 0.0
    dimension_scores: dict[str, DimensionScore]
    overall_health: OverallHealth
    benchmarking: Optional[BenchmarkingResult] = None
    risk_alerts: list[RiskAlert] = Field(default_factory=list)
    strategic_suggestions: list[StrategicSuggestion] = Field(default_factory=list)
    evidence_chain: list[EvidenceChainItem] = Field(default_factory=list)
    metadata: Metadata
    council_report: Optional[dict] = Field(default=None, description="委员会报告(结构化)")
    council_report_text: str = Field(default="", description="委员会报告(可读文本)")


class ApiResponse(BaseModel):
    """通用 API 响应"""
    request_id: str = ""
    code: int = BusinessCode.SUCCESS
    message: str = "success"
    data: Optional[dict] = None
    details: Optional[list[dict]] = None
    help_url: Optional[str] = None


# ============================================================
# 批处理模型
# ============================================================

class BatchEntry(BaseModel):
    """批处理条目"""
    request_id: str
    enterprise: EnterpriseInfo
    business_model_data: BusinessModelData = Field(default_factory=BusinessModelData)
    config: JudgeConfig = Field(default_factory=JudgeConfig)


class BatchSubmitRequest(BaseModel):
    """批量提交请求"""
    task_id: str = Field(default="", description="任务ID(不填自动生成)")
    callback_url: str = Field(default="", description="回调URL")
    entries: list[BatchEntry]


class BatchSubmitResponseData(BaseModel):
    """批量提交响应数据"""
    task_id: str
    status: BatchTaskStatus
    total_entries: int
    accepted_entries: int
    created_at: datetime


class BatchStatusData(BaseModel):
    """批量任务状态"""
    task_id: str
    status: BatchTaskStatus
    total_entries: int
    completed: int = 0
    failed: int = 0
    progress: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None


class BatchResultItem(BaseModel):
    """批量结果项"""
    request_id: str
    code: int
    data: Optional[JudgeResponseData] = None
    error: Optional[str] = None


class BatchResultSummary(BaseModel):
    """批量结果汇总"""
    total: int
    success: int
    failed: int
    avg_processing_time_ms: float = 0.0


class BatchResultsData(BaseModel):
    """批量结果数据"""
    task_id: str
    status: BatchTaskStatus
    results: list[BatchResultItem]
    summary: BatchResultSummary


# ============================================================
# WebSocket 模型
# ============================================================

class WsMessage(BaseModel):
    """WebSocket 消息帧"""
    type: str
    request_id: str
    payload: Optional[dict] = None
    timestamp: Optional[str] = None


# ============================================================
# 验证模型
# ============================================================

class ValidateRequest(BaseModel):
    """校验请求"""
    request: JudgeRequest


class ValidateResponseData(BaseModel):
    """校验响应"""
    valid: bool
    errors: list[dict] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
