"""BMJM 枚举定义"""

from enum import Enum


class Industry(str, Enum):
    """行业枚举"""
    SAAS = "saas"
    ECOMMERCE = "ecommerce"
    RETAIL = "retail"
    ENTERPRISE_SERVICE = "enterprise_service"
    FINTECH = "fintech"
    CONTENT_MEDIA = "content_media"
    HARDWARE = "hardware"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    LOGISTICS = "logistics"


class Stage(str, Enum):
    """发展阶段枚举"""
    SEED = "seed"
    GROWTH = "growth"
    MATURE = "mature"
    DECLINE = "decline"


class Scale(str, Enum):
    """企业规模枚举"""
    SMB = "smb"
    MID = "mid"
    LARGE = "large"
    ENTERPRISE = "enterprise"


class HealthLevel(str, Enum):
    """健康度等级"""
    HEALTHY = "healthy"
    SUB_HEALTHY = "sub_healthy"
    WARNING = "warning"
    CRITICAL = "critical"


class Severity(str, Enum):
    """风险严重等级"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Priority(str, Enum):
    """优先级"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DeviationStatus(str, Enum):
    """偏离状态（相对均值）"""
    ABOVE_AVG = "above_avg"
    AT_PAR = "at_par"
    BELOW_AVG = "below_avg"


class QuartilePosition(str, Enum):
    """行业分位（四分位）"""
    TOP = "top_quartile"       # 优于行业前 25%
    ABOVE_AVG = "above_avg"    # 介于前 25% 和均值之间
    AT_AVG = "at_avg"          # 接近均值 (±10%)
    BELOW_AVG = "below_avg"   # 介于均值和后 25% 之间
    BOTTOM = "bottom_quartile" # 劣于行业后 25%


class BatchTaskStatus(str, Enum):
    """批处理任务状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class JudgementLevel(str, Enum):
    """判断层级"""
    L1_FACT = "factual"
    L2_RULE = "rule"
    L3_ANALYSIS = "analytical"
    L4_STRATEGY = "strategic"


class BusinessCode(int, Enum):
    """业务状态码"""
    SUCCESS = 0
    REQUEST_FORMAT_ERROR = 30001
    MISSING_REQUIRED_FIELD = 30002
    DATA_VALIDATION_FAILED = 40001
    INVALID_INDUSTRY = 40002
    RATE_LIMIT_EXCEEDED = 50001
    CONCURRENCY_LIMIT_EXCEEDED = 50002
    INTERNAL_ERROR = 10001
    INFERENCE_ENGINE_ERROR = 10002
    SERVICE_OVERLOAD = 10003


# 九维评估维度 (CS=客户细分, COST=成本结构)
DIMENSIONS = ["VP", "CS", "CH", "CR", "RS", "KR", "KA", "KP", "COST"]

# 默认维度权重
DEFAULT_DIMENSION_WEIGHTS = {
    "VP": 0.15,
    "CS": 0.10,
    "CH": 0.10,
    "CR": 0.10,
    "RS": 0.15,
    "KR": 0.10,
    "KA": 0.10,
    "KP": 0.05,
    "COST": 0.15,
}

# 健康度阈值
HEALTH_THRESHOLDS = {
    "healthy": 0.85,
    "sub_healthy": 0.65,
    "warning": 0.45,
    "critical": 0.0,
}

# 商业模式画像类型
PROFILE_CATEGORIES = {
    "digital": "数字化商业模式",
    "traditional": "传统商业模式",
    "hybrid": "混合/创新模式",
}
