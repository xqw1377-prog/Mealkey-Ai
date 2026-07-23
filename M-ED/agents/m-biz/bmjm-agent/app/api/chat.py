"""对话式端点 — MealKey FIL 认知链交互入口"""

import structlog
from fastapi import APIRouter
from app.models.ecc_schemas import (
    ChatRequest, ChatResponseData, ChatApiResponse, VerificationSubmitRequest, VerificationResult,
    VerificationStatus,
)
from app.engine.ecc import ECCController
from app.engine.llm import LLMConfig, set_llm_config

logger = structlog.get_logger()

router = APIRouter()
ecc_controller = ECCController()


@router.post("/chat/llm-config")
async def configure_llm(config: LLMConfig):
    """配置 LLM 模型（由 MealKey 上层在启动时调用）"""
    set_llm_config(config)
    return {"status": "ok", "provider": config.provider, "model": config.model}


@router.post("/chat/scan", response_model=ChatApiResponse)
async def quick_scan(request: ChatRequest):
    """快速扫描（L1→L3）— 不要求完整信息，直接做健康度评估"""
    if not request.session_id:
        session = ecc_controller.create_session(
            enterprise_name=request.enterprise_name,
            industry=request.industry,
            stage=request.stage,
        )
        session_id = session.session_id
    else:
        session_id = request.session_id

    session = ecc_controller.get_session(session_id)
    if not session:
        return ChatApiResponse(code=10001, message="会话创建失败")

    # 如果还在 L1，推送用户消息后进入下一层
    if session.current_layer.value == "L1":
        ecc_controller.process_message(session_id, request.message)

    # 直接跳到 L3 输出（含委员会报告）
    if session.current_layer.value in ("L2", "L3"):
        resp = ecc_controller._handle_l3(session)
    else:
        resp = ecc_controller._handle_l5(session)

    return ChatApiResponse(data=resp)


@router.post("/chat/analyze/{dimension}", response_model=ChatApiResponse)
async def directed_analysis(dimension: str, request: ChatRequest):
    """定向推理（L2→L4）— 针对指定维度做深入分析"""
    if not request.session_id:
        session = ecc_controller.create_session(
            enterprise_name=request.enterprise_name,
            industry=request.industry,
            stage=request.stage,
        )
        session_id = session.session_id
    else:
        session_id = request.session_id

    session = ecc_controller.get_session(session_id)
    if not session:
        return ChatApiResponse(code=10001, message="会话创建失败")

    if session.current_layer.value == "L1":
        ecc_controller.process_message(session_id, request.message)

    # 确保推进到 L4
    resp = None
    if session.current_layer.value == "L2":
        ecc_controller._handle_l3(session)
        resp = ecc_controller._handle_l4(session)
    elif session.current_layer.value == "L3":
        resp = ecc_controller._handle_l4(session)
    elif session.current_layer.value == "L4":
        resp = ecc_controller._handle_l5(session)
    else:
        resp = ecc_controller._handle_l5(session)

    if resp:
        # 过滤只关注指定维度的建议
        if resp.suggestions:
            resp.suggestions = [s for s in resp.suggestions if s.dimension.upper() == dimension.upper()]
        if resp.verification_tasks:
            resp.verification_tasks = [t for t in resp.verification_tasks if t.dimension.upper() == dimension.upper()]

    return ChatApiResponse(data=resp)


@router.post("/chat", response_model=ChatApiResponse)
async def chat(request: ChatRequest):
    """对话式商业模式判断 — 核心认知链交互入口"""
    try:
        # 新会话
        if not request.session_id:
            session = ecc_controller.create_session(
                enterprise_name=request.enterprise_name,
                industry=request.industry,
                stage=request.stage,
            )
            session_id = session.session_id
            reply = session.pending_questions[0] if session.pending_questions else "请介绍一下你的项目。"
            return ChatApiResponse(
                data=ChatResponseData(
                    session_id=session_id,
                    status=session.status,
                    current_layer=session.current_layer,
                    reply=reply,
                    pending_questions=session.pending_questions,
                    progress=0.05,
                )
            )

        # 已有会话 — 处理用户消息
        result = ecc_controller.process_message(request.session_id, request.message)
        return ChatApiResponse(data=result)

    except Exception as e:
        logger.error("chat error", error=str(e))
        return ChatApiResponse(
            code=10001,
            message=f"处理异常: {str(e)}",
            data=ChatResponseData(
                session_id=request.session_id or "",
                status="blocked",
                current_layer="L1",
                reply="抱歉，处理你的消息时遇到了问题，请重试。",
                progress=0.0,
            ),
        )


@router.post("/chat/verify", response_model=ChatApiResponse)
async def submit_verification(request: VerificationSubmitRequest):
    """提交验证结果回注"""
    try:
        result = VerificationResult(
            result=request.result,
            actual_data=request.actual_data,
            conclusion=request.conclusion,
            user_feedback=request.user_feedback,
            new_insights=request.new_insights,
        )
        response = ecc_controller.submit_verification(
            request.session_id, request.task_id, result
        )
        return ChatApiResponse(data=response)
    except Exception as e:
        logger.error("verification submit error", error=str(e))
        return ChatApiResponse(
            code=10001,
            message=f"回注处理异常: {str(e)}",
        )


@router.get("/chat/session/{session_id}", response_model=ChatApiResponse)
async def get_session(session_id: str):
    """获取会话状态"""
    session = ecc_controller.get_session(session_id)
    if not session:
        return ChatApiResponse(
            code=10001,
            message="会话不存在",
            data=ChatResponseData(
                session_id=session_id,
                status="blocked",
                current_layer="L1",
                reply="会话不存在或已过期。",
                progress=0.0,
            ),
        )
    return ChatApiResponse(
        data=ChatResponseData(
            session_id=session.session_id,
            status=session.status,
            current_layer=session.current_layer,
            reply=f"当前认知层: {session.current_layer.value} | 状态: {session.status.value}",
            pending_questions=session.pending_questions,
            fact_nodes=session.fact_nodes,
            dimension_scores=session.dimension_scores,
            rule_judgments=session.rule_judgments,
            suggestions=session.suggestions,
            verification_tasks=session.verification_tasks,
            progress=0.5 if session.current_layer.value == "L5" else 0.3,
        )
    )
