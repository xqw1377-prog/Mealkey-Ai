"""BMJM Agent 配置管理"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 应用基础配置
    app_name: str = "M-BIZ BMJM Agent"
    app_version: str = "1.0.0"
    debug: bool = False

    # 服务配置
    host: str = "0.0.0.0"
    port: int = 8000
    api_prefix: str = "/api/v1/bmjm"

    # 鉴权配置（必须通过环境变量 BMJM_API_TOKEN 注入，无硬编码默认值）
    auth_enabled: bool = True
    api_token: str = ""
    api_key: str = ""

    # 速率限制
    rate_limit_per_minute: int = 60
    rate_limit_batch_entries: int = 1000

    # 推理引擎配置
    min_confidence_default: float = 0.6
    max_inference_depth: int = 5
    require_verification_default: bool = True

    # 知识库路径
    rules_path: str = "app/knowledge/rules.yaml"
    benchmarks_path: str = "app/knowledge/benchmarks.yaml"
    profiles_path: str = "app/knowledge/profiles.yaml"

    # 验证动作配置
    max_verification_period_days: int = 90  # 最多3个月

    # LLM 配置（由 MealKey 通过环境变量注入）
    llm_provider: str = "openai"  # openai / azure / ollama
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_api_base: str = ""

    # 日志
    log_level: str = "INFO"

    model_config = {"env_prefix": "BMJM_", "env_file": ".env"}


settings = Settings()
