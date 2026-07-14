"""structlog 配置 — 保证在任何模块使用 logger 之前就绑定正确的后端"""

import logging
import structlog
from app.config import settings


def setup_logging():
    """配置 structlog 使用 stdlib logging 后端（兼容所有 Python 版本）"""
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


# 模块导入时自动配置，确保无论谁先 import 都能用
setup_logging()
