"""
M-MKT 统一异常体系

定义项目中使用的所有自定义异常类型。
"""


class MMTKError(Exception):
    """M-MKT 基础异常"""

    pass


class ModelError(MMTKError):
    """模型定义相关错误"""

    pass


class DimensionError(ModelError):
    """维度定义错误"""

    pass


class IndicatorError(ModelError):
    """指标定义错误"""

    pass


class ValidationError(ModelError):
    """数据校验错误"""

    pass


class AdapterError(MMTKError):
    """适配器相关错误"""

    pass


class AdapterNotImplementedError(AdapterError):
    """适配器未实现"""

    pass


class AdapterConfigError(AdapterError):
    """适配器配置错误"""

    pass


class ScoringError(MMTKError):
    """评分计算错误"""

    pass


class SerializationError(MMTKError):
    """序列化/反序列化错误"""

    pass
