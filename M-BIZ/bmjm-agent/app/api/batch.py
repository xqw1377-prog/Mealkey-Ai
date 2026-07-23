"""批处理端点 - 异步批量提交与查询"""

import uuid
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks
from app.models.schemas import (
    BatchSubmitRequest, BatchSubmitResponseData, BatchStatusData,
    BatchResultsData, BatchResultItem, BatchResultSummary,
    ApiResponse, JudgeResponseData,
)
from app.models.enums import BusinessCode, BatchTaskStatus
from app.engine.singleton import get_engine

logger = structlog.get_logger()

router = APIRouter()

# 内存任务存储 (生产环境应使用 Redis/DB)
_tasks: dict[str, dict] = {}


def _send_callback(callback_url: str, task_id: str, status: str, summary: dict):
    """向 callback_url 推送完成通知"""
    if not callback_url:
        return
    try:
        import httpx
        payload = {
            "task_id": task_id,
            "status": status,
            "summary": summary,
            "results_url": f"/api/v1/bmjm/judge/batch/{task_id}/results",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        httpx.post(callback_url, json=payload, timeout=10)
        logger.info("callback sent", task_id=task_id, callback_url=callback_url)
    except Exception as e:
        logger.warning("callback failed", task_id=task_id, callback_url=callback_url, error=str(e))


@router.post("/judge/batch", response_model=ApiResponse)
async def submit_batch(request: BatchSubmitRequest, background_tasks: BackgroundTasks):
    """提交批量判断任务"""
    task_id = request.task_id or f"batch_{uuid.uuid4().hex[:12]}"
    total = len(request.entries)

    task_data = {
        "task_id": task_id,
        "status": BatchTaskStatus.PENDING,
        "total_entries": total,
        "completed": 0,
        "failed": 0,
        "results": [],
        "callback_url": request.callback_url,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "started_at": None,
        "completed_at": None,
    }

    _tasks[task_id] = task_data

    # 后台异步处理
    entries_data = [e.model_dump() for e in request.entries]
    background_tasks.add_task(_process_batch, task_id, entries_data, request.callback_url)

    logger.info("batch submitted", task_id=task_id, entries=total)

    return ApiResponse(
        request_id=task_id,
        code=BusinessCode.SUCCESS,
        message="success",
        data=BatchSubmitResponseData(
            task_id=task_id,
            status=BatchTaskStatus.PENDING,
            total_entries=total,
            accepted_entries=total,
            created_at=task_data["created_at"],
        ).model_dump(),
    )


def _process_batch(task_id: str, entries_data: list[dict], callback_url: str = ""):
    """后台处理批量任务"""
    task = _tasks.get(task_id)
    if not task:
        return

    from app.models.schemas import JudgeRequest
    import time as _time

    task["status"] = BatchTaskStatus.PROCESSING
    task["started_at"] = datetime.now(timezone.utc)
    total_time = 0

    for entry in entries_data:
        try:
            # 重建请求对象
            req = JudgeRequest(**entry)
            start = _time.time()
            result = get_engine().judge(req)
            elapsed = int((_time.time() - start) * 1000)
            total_time += elapsed

            task["results"].append({
                "request_id": entry["request_id"],
                "code": 0,
                "data": result.model_dump(),
                "error": None,
            })
            task["completed"] += 1

        except Exception as e:
            logger.error("batch entry error", task_id=task_id, request_id=entry.get("request_id"), error=str(e))
            task["results"].append({
                "request_id": entry["request_id"],
                "code": BusinessCode.INFERENCE_ENGINE_ERROR,
                "data": None,
                "error": str(e),
            })
            task["failed"] += 1

        task["updated_at"] = datetime.now(timezone.utc)

    # 更新状态
    if task["failed"] == 0:
        task["status"] = BatchTaskStatus.COMPLETED
    elif task["completed"] > 0:
        task["status"] = BatchTaskStatus.PARTIAL
    else:
        task["status"] = BatchTaskStatus.FAILED

    task["completed_at"] = datetime.now(timezone.utc)
    task["avg_processing_time"] = total_time / max(len(entries_data), 1)

    # 回调通知
    if callback_url:
        _send_callback(
            callback_url, task_id, task["status"].value,
            {"total": task["total_entries"], "success": task["completed"], "failed": task["failed"]},
        )

    logger.info("batch completed", task_id=task_id, status=task["status"].value)


@router.get("/judge/batch/{task_id}", response_model=ApiResponse)
async def get_batch_status(task_id: str):
    """查询批处理任务状态"""
    task = _tasks.get(task_id)
    if not task:
        return ApiResponse(
            request_id=task_id,
            code=BusinessCode.REQUEST_FORMAT_ERROR,
            message="任务不存在",
        )

    total = task["total_entries"]
    completed = task["completed"]
    failed = task["failed"]
    progress = (completed + failed) / max(total, 1)

    return ApiResponse(
        request_id=task_id,
        code=BusinessCode.SUCCESS,
        message="success",
        data=BatchStatusData(
            task_id=task_id,
            status=task["status"],
            total_entries=total,
            completed=completed,
            failed=failed,
            progress=round(progress, 2),
            created_at=task["created_at"],
            updated_at=task["updated_at"],
        ).model_dump(),
    )


@router.get("/judge/batch/{task_id}/results", response_model=ApiResponse)
async def get_batch_results(task_id: str):
    """获取批处理结果"""
    task = _tasks.get(task_id)
    if not task:
        return ApiResponse(
            request_id=task_id,
            code=BusinessCode.REQUEST_FORMAT_ERROR,
            message="任务不存在",
        )

    results = []
    for r in task.get("results", []):
        results.append(BatchResultItem(**r))

    avg_time = task.get("avg_processing_time", 0)

    return ApiResponse(
        request_id=task_id,
        code=BusinessCode.SUCCESS,
        message="success",
        data=BatchResultsData(
            task_id=task_id,
            status=task["status"],
            results=results,
            summary=BatchResultSummary(
                total=task["total_entries"],
                success=task["completed"],
                failed=task["failed"],
                avg_processing_time_ms=round(avg_time, 2),
            ),
        ).model_dump(),
    )
