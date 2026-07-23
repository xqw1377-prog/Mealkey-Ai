"""知识库加载器 - 加载 YAML 规则/基准/画像"""

import yaml
import structlog
from pathlib import Path
from app.config import settings

logger = structlog.get_logger()


def load_rules() -> list[dict]:
    """加载规则库"""
    path = Path(settings.rules_path)
    if not path.exists():
        logger.warning("rules file not found", path=str(path))
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    rules = data.get("rules", [])
    logger.info("rules loaded", count=len(rules))
    return rules


def load_benchmarks() -> list[dict]:
    """加载行业基准"""
    path = Path(settings.benchmarks_path)
    if not path.exists():
        logger.warning("benchmarks file not found", path=str(path))
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    benchmarks = data.get("benchmarks", [])
    logger.info("benchmarks loaded", count=len(benchmarks))
    return benchmarks


def load_profiles() -> list[dict]:
    """加载商业模式画像"""
    path = Path(settings.profiles_path)
    if not path.exists():
        logger.warning("profiles file not found", path=str(path))
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    profiles = data.get("profiles", [])
    logger.info("profiles loaded", count=len(profiles))
    return profiles
