"""共享 InferenceEngine 单例 — 避免多模块重复加载知识库"""

from app.logging_config import setup_logging  # noqa: F401
from app.engine.inference import InferenceEngine

_engine: InferenceEngine | None = None


def get_engine() -> InferenceEngine:
    global _engine
    if _engine is None:
        _engine = InferenceEngine()
    return _engine
