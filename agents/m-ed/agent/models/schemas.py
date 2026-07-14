"""
M-ED 股权决策 Agent — Pydantic 数据模型
完全对齐对接规范文档中的请求/响应 Schema
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator


# ============================================================
# 枚举定义
# ============================================================

class ProjectStage(str, Enum):
    IDEA = "idea"
    SEED = "seed"
    ANGEL = "angel"
    PRE_A = "pre-a"
    A = "a"


class ContributionType(str, Enum):
    FULL_TIME = "全职"
    PART_TIME = "兼职"
    ADVISOR = "顾问"


class VestingType(str, Enum):
    STANDARD = "standard"
    ABNORMAL = "abnormal"


class EquityType(str, Enum):
    COMMON = "普通股"
    RESTRICTED = "受限股"
    OPTION = "期权"


class AdjustmentType(str, Enum):
    GENERAL_REVIEW = "general_review"
    MILESTONE = "milestone"
    NEW_MEMBER = "new_member"
    DEPARTURE = "departure"


class Jurisdiction(str, Enum):
    CHINA = "china"
    US = "us"
    SINGAPORE = "singapore"
    HK = "hk"


class CheckItem(str, Enum):
    VESTING = "vesting"
    EQUITY_TYPES = "equity_types"
    IP_TRANSFER = "ip_transfer"
    TAX = "tax"
    FOUNDER_PROTECTION = "founder_protection"


class DocumentType(str, Enum):
    EQUITY_AGREEMENT_DRAFT = "equity_agreement_draft"
    BOARD_RESOLUTION = "board_resolution"
    SHAREHOLDER_AGREEMENT = "shareholder_agreement"
    SUMMARY_REPORT = "summary_report"


class OutputFormat(str, Enum):
    MARKDOWN = "markdown"


class AgentAction(str, Enum):
    DESIGN_EQUITY = "design_equity"
    ADJUST_EQUITY = "adjust_equity"
    SIMULATE = "simulate"
    COMPLIANCE_CHECK = "compliance_check"
    GENERATE_DOCUMENT = "generate_document"
    GET_CONTEXT = "get_context"
    RESET_CONTEXT = "reset_context"


# ============================================================
# 请求模型
# ============================================================

class TeamMember(BaseModel):
    """团队成员信息"""
    role: str = Field(..., description="角色，如：创始人、CTO")
    name: str = Field(..., description="姓名")
    contribution_type: ContributionType = Field(..., description="投入类型")
    responsibility: str = Field(..., description="职责描述")
    expected_equity_range: Optional[dict] = Field(
        None, description="期望股权范围，如 {\"min\": 30, \"max\": 50}"
    )


class DesignEquityPayload(BaseModel):
    """股权结构设计 - 请求 payload"""
    project_name: str = Field(..., description="项目名称")
    project_stage: ProjectStage = Field(..., description="项目阶段")
    team_members: List[TeamMember] = Field(..., min_length=1, description="团队成员列表")
    additional_info: Optional[dict] = Field(
        None, description="附加信息，如 initial_capital, vesting_period_months, cliff_months"
    )

    @field_validator("team_members")
    @classmethod
    def check_total_equity_range(cls, v: List[TeamMember]) -> List[TeamMember]:
        """检查期望股权范围是否可能超过 100%"""
        total_min = 0
        total_max = 0
        has_range = 0
        for m in v:
            if m.expected_equity_range:
                total_min += m.expected_equity_range.get("min", 0)
                total_max += m.expected_equity_range.get("max", 0)
                has_range += 1
        if has_range > 0 and total_min > 100:
            raise ValueError(f"团队成员期望股权下限合计 {total_min}%，超过 100%")
        if has_range > 0 and total_max > 100:
            raise ValueError(f"团队成员期望股权上限合计 {total_max}%，超过 100%")
        return v


class AllocationItem(BaseModel):
    """分配项（用于当前方案描述）"""
    member: str
    role: str
    equity_percent: float = Field(..., ge=0, le=100)
    equity_type: Optional[EquityType] = EquityType.COMMON


class CurrentScheme(BaseModel):
    """当前股权方案"""
    version: str = "v1"
    allocations: List[AllocationItem]
    reserved_pool: float = Field(default=0, ge=0, le=100)
    unallocated: float = Field(default=0, ge=0, le=100)


class TriggerEvent(BaseModel):
    """触发事件"""
    type: str = Field(..., description="事件类型，如 milestone_completion, new_funding")
    description: str
    completed_by: Optional[List[str]] = None


class Contribution(BaseModel):
    """贡献记录"""
    member: str
    period: str
    achievements: List[str]
    hours_per_week: Optional[float] = None


class AdjustEquityPayload(BaseModel):
    """动态调整建议 - 请求 payload"""
    current_scheme: CurrentScheme
    trigger_event: TriggerEvent
    contributions: List[Contribution]
    adjustment_type: AdjustmentType


class SimulationEvent(BaseModel):
    """模拟事件"""
    type: str = Field(..., description="事件类型: funding / option_exercise")
    amount: Optional[float] = None
    dilution_percent: Optional[float] = Field(None, ge=0, le=100)
    round: Optional[str] = None
    pool_percent_used: Optional[float] = Field(None, ge=0, le=100)


class Scenario(BaseModel):
    """模拟场景"""
    name: str
    events: List[SimulationEvent]


class SimulatePayload(BaseModel):
    """场景模拟 - 请求 payload"""
    base_scheme: CurrentScheme
    scenarios: List[Scenario] = Field(..., min_length=1)


class VestingTerms(BaseModel):
    """Vesting 条款"""
    total_months: int = 48
    cliff_months: int = 12


class ComplianceScheme(BaseModel):
    """合规检查用的方案数据"""
    allocations: List[AllocationItem]
    reserved_pool: float = 0
    vesting_terms: dict  # {"standard": {...}, "abnormal": {...}}


class ComplianceCheckPayload(BaseModel):
    """合规检查 - 请求 payload"""
    scheme: ComplianceScheme
    jurisdiction: Jurisdiction = Jurisdiction.CHINA
    check_items: List[CheckItem]


class Party(BaseModel):
    """协议方"""
    name: str
    role: str
    equity_percent: float = Field(..., ge=0, le=100)


class GenerateDocumentPayload(BaseModel):
    """文档生成 - 请求 payload"""
    document_type: DocumentType
    scheme_version: str
    scheme_data: dict  # 包含 project_name, date, parties, vesting_terms 等
    output_format: OutputFormat = OutputFormat.MARKDOWN


# ============================================================
# 请求包装
# ============================================================

class AgentRequest(BaseModel):
    """统一的 Agent 请求体"""
    session_id: Optional[str] = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="会话 ID，不传则自动生成"
    )
    user_id: str = Field(..., description="发起请求的用户标识")
    language: str = Field(default="zh-CN", description="输出语言")
    action: AgentAction = Field(..., description="操作类型")
    payload: dict = Field(..., description="请求数据")

    @field_validator("payload")
    @classmethod
    def check_payload_not_empty(cls, v: dict) -> dict:
        if not v:
            raise ValueError("payload 不能为空")
        return v


# ============================================================
# 响应模型
# ============================================================

class ErrorDetail(BaseModel):
    """错误详情"""
    code: str
    message: str
    details: Optional[dict] = None


class AgentResponse(BaseModel):
    """统一的 Agent 响应体"""
    model_config = {"arbitrary_types_allowed": True}

    session_id: str
    status: str = Field(..., description="success | error")
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None


# ============================================================
# 内部上下文模型
# ============================================================

class SessionContext(BaseModel):
    """会话上下文"""
    session_id: str
    user_id: str
    language: str = "zh-CN"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_scheme: Optional[dict] = None
    team_members: List[TeamMember] = []
    preferences: dict = {}
    history: List[dict] = []

    def add_history(self, action: str, payload_summary: str):
        self.history.append({
            "action": action,
            "summary": payload_summary,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self.updated_at = datetime.now(timezone.utc)

    def reset(self):
        self.current_scheme = None
        self.team_members = []
        self.preferences = {}
        self.history = []
        self.updated_at = datetime.now(timezone.utc)
