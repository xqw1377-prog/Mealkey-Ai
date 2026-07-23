"""WebSocket 流式判断端点"""

import json
import asyncio
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models.schemas import JudgeRequest, WsMessage
from app.engine.singleton import get_engine
from app.config import settings

logger = structlog.get_logger()

router = APIRouter()

# 心跳超时（秒）
HEARTBEAT_TIMEOUT = 60


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _send_ws(websocket: WebSocket, msg_type: str, request_id: str, payload: dict):
    """统一发送 WebSocket 消息帧"""
    await websocket.send_json({
        "type": msg_type,
        "request_id": request_id,
        "payload": payload,
        "timestamp": _now_iso(),
    })


@router.websocket("/ws/judge")
async def websocket_judge(websocket: WebSocket):
    """WebSocket 流式商业模式判断"""

    # ---- 鉴权（先 accept 再 close，避免 HTTP 403 导致客户端拿不到 close frame） ----
    if settings.auth_enabled:
        token = websocket.query_params.get("token", "")
        if token != settings.api_token:
            await websocket.accept()
            await websocket.close(code=4001, reason="Unauthorized")
            logger.info("websocket auth rejected", token_preview=token[:8] if token else "(empty)")
            return

    await websocket.accept()

    agent_id = websocket.query_params.get("agent_id", "unknown")
    logger.info("websocket connected", agent_id=agent_id)

    # ---- 活跃时间追踪，用于超时断连 ----
    last_activity = asyncio.get_event_loop().time()

    async def watchdog():
        """60 秒无消息则关闭连接"""
        nonlocal last_activity
        while True:
            await asyncio.sleep(10)
            elapsed = asyncio.get_event_loop().time() - last_activity
            if elapsed >= HEARTBEAT_TIMEOUT:
                logger.info("websocket heartbeat timeout", agent_id=agent_id, idle_seconds=int(elapsed))
                try:
                    await websocket.close(code=4000, reason="Heartbeat timeout")
                except Exception:
                    pass
                return

    watchdog_task = asyncio.create_task(watchdog())

    try:
        while True:
            raw = await websocket.receive_text()
            last_activity = asyncio.get_event_loop().time()

            message = json.loads(raw)
            ws_msg = WsMessage(**message)

            if ws_msg.type == "ping":
                await _send_ws(websocket, "pong", ws_msg.request_id, {})
                continue

            if ws_msg.type == "judge_request":
                await _handle_judge_request(websocket, ws_msg)

    except WebSocketDisconnect:
        logger.info("websocket disconnected", agent_id=agent_id)
    except Exception as e:
        logger.error("websocket error", agent_id=agent_id, error=str(e))
        try:
            await _send_ws(websocket, "judge_error", "", {"message": f"WebSocket 错误: {str(e)}"})
        except Exception:
            pass
    finally:
        watchdog_task.cancel()


async def _handle_judge_request(websocket: WebSocket, msg: WsMessage):
    """处理 WebSocket 判断请求（单次推理 + 流式推送）"""
    request_id = msg.request_id
    payload = msg.payload or {}

    try:
        req = JudgeRequest(**payload)

        # 流式进度反馈（纯展示，不重复推理）
        await _send_ws(websocket, "judge_progress", request_id, {
            "stage": "analyzing", "progress": 0.2, "message": "正在分析商业模式...",
        })

        # CPU 密集推理放到线程池，避免阻塞事件循环
        result = await asyncio.to_thread(get_engine().judge, req)

        # 推理完成后，逐维度推送部分结果
        for dim, score in result.dimension_scores.items():
            await _send_ws(websocket, "judge_partial", request_id, {
                "dimension": dim, "score": score.score, "summary": score.summary,
            })

        # 推送委员会报告文本（可读格式）
        if result.council_report_text:
            await _send_ws(websocket, "judge_council_report", request_id, {
                "text": result.council_report_text,
            })

        await _send_ws(websocket, "judge_progress", request_id, {
            "stage": "completed", "progress": 1.0, "message": "分析完成",
        })

        # 发送完整结果（含结构化的 council_report）
        await _send_ws(websocket, "judge_complete", request_id, result.model_dump())

    except Exception as e:
        logger.error("websocket judge error", request_id=request_id, error=str(e))
        await _send_ws(websocket, "judge_error", request_id, {
            "message": f"推理过程发生错误: {str(e)}",
        })
