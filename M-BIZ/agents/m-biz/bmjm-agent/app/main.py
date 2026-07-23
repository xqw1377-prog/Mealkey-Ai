"""BMJM Agent - FastAPI 应用入口"""

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.models.enums import BusinessCode
from app.logging_config import setup_logging  # noqa: F401 — 触发日志配置

logger = structlog.get_logger()


def create_app() -> FastAPI:
    """创建 FastAPI 应用"""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS 配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册路由
    _register_routers(app)

    # 请求/响应中间件
    _register_middleware(app)

    # 启动/关闭事件
    _register_events(app)

    return app


def _register_routers(app: FastAPI):
    """注册所有 API 路由"""
    from app.api.health import router as health_router
    from app.api.judge import router as judge_router
    from app.api.batch import router as batch_router
    from app.api.websocket import router as ws_router
    from app.api.profiles import router as profiles_router
    from app.api.benchmarks import router as benchmarks_router
    from app.api.rules import router as rules_router
    from app.api.chat import router as chat_router

    prefix = settings.api_prefix

    app.include_router(health_router, prefix=prefix, tags=["系统"])
    app.include_router(judge_router, prefix=prefix, tags=["判断"])
    app.include_router(batch_router, prefix=prefix, tags=["批处理"])
    app.include_router(ws_router, prefix=prefix, tags=["流式"])
    app.include_router(profiles_router, prefix=prefix, tags=["画像"])
    app.include_router(benchmarks_router, prefix=prefix, tags=["基准"])
    app.include_router(rules_router, prefix=prefix, tags=["规则"])
    app.include_router(chat_router, prefix=prefix, tags=["认知链对话"])


def _register_middleware(app: FastAPI):
    """注册中间件"""

    @app.middleware("http")
    async def add_headers(request: Request, call_next):
        """添加公共响应头 + 真实速率限制"""
        import time
        start_time = time.time()

        # 记录 X-Agent-Id
        agent_id = request.headers.get("X-Agent-Id", "unknown")
        request_id = request.headers.get("X-Request-Id", "")

        response: Response = await call_next(request)

        processing_time = int((time.time() - start_time) * 1000)
        response.headers["X-Processing-Time-Ms"] = str(processing_time)

        # 真实速率限制（基于 IP + AgentId 的滑动窗口）
        now = time.time()
        window = 60.0
        max_requests = 60
        key = f"rate:{request.client.host if request.client else 'local'}:{agent_id}"

        # 使用内存字典做简单滑动窗口
        if not hasattr(add_headers, "_rate_limit_store"):
            add_headers._rate_limit_store = {}
        store = add_headers._rate_limit_store

        # 清理过期条目
        store[key] = [t for t in store.get(key, []) if now - t < window]
        store[key].append(now)

        remaining = max(0, max_requests - len(store[key]))
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        if remaining == 0:
            response.status_code = 429
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={
                    "code": 50001,
                    "message": "请求频率超限，请稍后再试",
                    "request_id": request_id,
                },
            )

        # 记录 Agent 信息到日志
        if agent_id != "unknown":
            logger.debug("api request", agent_id=agent_id, path=request.url.path, duration_ms=processing_time)

        return response

    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        """鉴权中间件"""
        # 每次请求读取 settings.auth_enabled，支持测试环境通过 env 动态关闭
        from app.config import settings as _s
        if _s.auth_enabled:
            # 跳过健康检查、文档和 WebSocket（WS 使用 query param 鉴权）
            path = request.url.path
            if path.endswith("/health") or path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi") or "/ws/" in path:
                return await call_next(request)

            # 检查 Authorization 头
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return JSONResponse(
                    status_code=401,
                    content={
                        "code": BusinessCode.REQUEST_FORMAT_ERROR,
                        "message": "未授权，缺少 Bearer Token",
                    },
                )

            token = auth.replace("Bearer ", "")
            if token != settings.api_token:
                return JSONResponse(
                    status_code=401,
                    content={
                        "code": BusinessCode.REQUEST_FORMAT_ERROR,
                        "message": "Token 无效",
                    },
                )

        return await call_next(request)


def _register_events(app: FastAPI):
    """注册应用事件"""

    @app.on_event("startup")
    async def startup():
        # 自动从环境变量加载 LLM 配置
        if settings.llm_api_key:
            from app.engine.llm import LLMConfig, set_llm_config
            set_llm_config(LLMConfig(
                provider=settings.llm_provider,
                model=settings.llm_model,
                api_key=settings.llm_api_key,
                api_base=settings.llm_api_base,
            ))
            logger.info("LLM configured from environment", provider=settings.llm_provider, model=settings.llm_model)
        else:
            logger.info("No LLM configured, using rule-based mode")

        logger.info(
            "BMJM Agent starting",
            version=settings.app_version,
            api_prefix=settings.api_prefix,
        )

    @app.on_event("shutdown")
    async def shutdown():
        logger.info("BMJM Agent shutting down")


# 创建应用实例
app = create_app()
