"""
M-ED 股权决策解决方案引擎 — 服务入口

轻量级 FastAPI 服务。
1 个核心端点 + 1 个健康检查。

运行方式：
  uvicorn agent.main:app --reload --port 8001
"""

import os
import asyncio
import logging
from fastapi import FastAPI, Depends, HTTPException, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from agent.models.schemas import AgentRequest
from agent.hub import agent_hub
from agent.utils.errors import AgentError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# 认证方案
API_KEY = os.environ.get("MED_API_KEY", "")
security = HTTPBearer(auto_error=False)

app = FastAPI(
    title="M-ED 股权决策引擎",
    description="MealKey 产品矩阵中的股权决策解决方案引擎 — 股权结构设计、动态调整、场景模拟、合规检查、文档生成",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("MED_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AgentError)
async def agent_error_handler(request: Request, exc: AgentError):
    """将 AgentError 映射为正确的 HTTP 状态码"""
    # 尝试从请求体中提取 session_id
    session_id = None
    if request.method == "POST":
        try:
            body = await request.json()
            session_id = body.get("session_id")
        except Exception:
            pass

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "session_id": session_id,
            "status": "error",
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


def verify_auth(credentials: HTTPAuthorizationCredentials = Security(security)):
    """验证 API Key 认证（未配置时跳过）"""
    if not API_KEY:
        return  # 开发模式：不强制认证
    if not credentials or credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=401,
            detail={
                "session_id": "",
                "status": "error",
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "API Key 无效或未提供，请通过 Authorization: Bearer <API_KEY> 请求头传递",
                },
            },
        )


@app.post("/v1/agent/equity", dependencies=[Depends(verify_auth)])
async def process_equity_request(request: AgentRequest):
    """
    统一股权决策入口。

    支持的 action：
      - design_equity      — 股权结构设计
      - adjust_equity      — 动态调整建议
      - simulate           — 场景模拟
      - compliance_check   — 合规检查
      - generate_document  — 文档生成
      - get_context        — 查看当前会话上下文
      - reset_context      — 重置会话上下文

    认证方式（可选）：
      - 设置环境变量 MED_API_KEY
      - 请求头 Authorization: Bearer <API_KEY>
    """
    return await asyncio.to_thread(agent_hub.process, request)


@app.get("/v1/agent/equity/health")
async def health():
    return {
        "status": "ok",
        "agent": "med-equity-engine",
        "version": "2.0.0",
        "auth_required": bool(API_KEY),
        "capabilities": [
            "design_equity",
            "adjust_equity",
            "simulate",
            "compliance_check",
            "generate_document",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent.main:app", host="0.0.0.0", port=8001, reload=True)
