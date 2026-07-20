"""
M-MKT FastAPI 薄层 — 包装 MKTEngine，供 MealKey Web / Founder Layer 调用。

启动（在 agents/m-mkt 目录）:
  pip install fastapi uvicorn
  set PYTHONPATH=src
  uvicorn server.main:app --host 0.0.0.0 --port 8002
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel, Field

# 确保 src/ 在 path 上，以便 import core
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from core import MKTEngine  # noqa: E402

app = FastAPI(title="MealKey M-MKT", version="1.0.0")
_engine = MKTEngine()


class AnalyzeRequest(BaseModel):
    category: str = Field(..., description="品类，如 湘菜 / 咖啡")
    city: str | None = Field(default=None, description="城市")
    experience: str = Field(default="首次创业")
    capital_level: str = Field(default="medium")
    team_size: str = Field(default="small")
    mode: str = Field(default="default", description="default | light")
    message: str | None = Field(default=None, description="原始问题，可选")


@app.get("/v1/health")
def health():
    return {"status": "ok", "service": "m-mkt", "version": "1.0.0"}


@app.post("/v1/analyze")
def analyze(req: AnalyzeRequest):
    """优先 V2 管线；失败回退经典 analyze。"""
    category = (req.category or "").strip() or "餐饮"
    city = (req.city or "").strip() or None
    try:
        result = _engine.analyze_v2(
            category,
            city,
            experience=req.experience,
            capital_level=req.capital_level,
            team_size=req.team_size,
            mode=req.mode if req.mode in ("default", "light") else "default",
        )
        data = result.to_dict() if hasattr(result, "to_dict") else dict(result)
        return {
            "code": 0,
            "message": "ok",
            "data": {
                "engine": "analyze_v2",
                "category": category,
                "city": city,
                "message": req.message,
                **data,
            },
        }
    except Exception as exc:  # noqa: BLE001 — 对外稳定降级
        decision = _engine.analyze(
            category,
            city or "长沙",
            experience=req.experience,
            capital_level=req.capital_level,
        )
        data = decision.to_dict()
        return {
            "code": 0,
            "message": f"v2_fallback:{type(exc).__name__}",
            "data": {
                "engine": "analyze",
                "category": category,
                "city": city,
                "message": req.message,
                **data,
            },
        }
