"""pytest 配置"""

import os
# 测试环境下关闭鉴权
os.environ["BMJM_AUTH_ENABLED"] = "false"

# 确保 structlog 在任何引擎初始化之前完成配置
from app.logging_config import setup_logging  # noqa: F401
