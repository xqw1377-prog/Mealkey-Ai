"""/judge 判断端点 - 同步商业模式判断"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.schemas import (
    JudgeRequest, JudgeResponseData, ApiResponse, ValidateRequest, ValidateResponseData,
)
from app.models.enums import BusinessCode, Industry, Stage, Scale
from app.engine.singleton import get_engine

logger = structlog.get_logger()

router = APIRouter()


@router.post("/judge", response_model=ApiResponse)
async def judge_business_model(request: JudgeRequest):
    """单次商业模式判断"""
    try:
        logger.info("judge request received", request_id=request.request_id)

        result = get_engine().judge(request)

        return ApiResponse(
            request_id=request.request_id,
            code=BusinessCode.SUCCESS,
            message="success",
            data=result.model_dump(),
        )
    except Exception as e:
        logger.error("judge error", request_id=request.request_id, error=str(e))
        return ApiResponse(
            request_id=request.request_id,
            code=BusinessCode.INFERENCE_ENGINE_ERROR,
            message=f"推理引擎异常: {str(e)}",
        )


@router.post("/validate", response_model=ApiResponse)
async def validate_input(request: ValidateRequest):
    """校验输入数据格式"""
    errors = []
    warnings = []

    req = request.request

    # 校验行业
    valid_industries = {e.value for e in Industry}
    if req.enterprise.industry.value not in valid_industries:
        errors.append({
            "field": "enterprise.industry",
            "message": f"行业值不在允许范围内: {req.enterprise.industry.value}",
            "code": "VALIDATION_ENUM",
        })

    # 校验阶段
    valid_stages = {e.value for e in Stage}
    if req.enterprise.stage.value not in valid_stages:
        errors.append({
            "field": "enterprise.stage",
            "message": f"发展阶段值不在允许范围内: {req.enterprise.stage.value}",
            "code": "VALIDATION_ENUM",
        })

    # 校验规模
    valid_scales = {e.value for e in Scale}
    if req.enterprise.scale.value not in valid_scales:
        errors.append({
            "field": "enterprise.scale",
            "message": f"企业规模值不在允许范围内: {req.enterprise.scale.value}",
            "code": "VALIDATION_ENUM",
        })

    # 校验置信度
    if req.config.min_confidence < 0 or req.config.min_confidence > 1:
        errors.append({
            "field": "config.min_confidence",
            "message": "最低置信度阈值必须在 [0, 1] 范围内",
            "code": "VALIDATION_RANGE",
        })

    # 检查数据完整性
    bm = req.business_model_data
    if not bm.value_proposition.description:
        warnings.append("价值主张描述缺失，将影响 VP 维度评分")
    if not bm.customer_segments.primary:
        warnings.append("目标客户未定义，将影响 CS 维度评分")
    if not bm.revenue_streams.types:
        warnings.append("收入来源未定义，将影响 RS 维度评分")

    is_valid = len(errors) == 0

    return ApiResponse(
        request_id=req.request_id,
        code=BusinessCode.SUCCESS if is_valid else BusinessCode.DATA_VALIDATION_FAILED,
        message="校验通过" if is_valid else "校验失败",
        data=ValidateResponseData(
            valid=is_valid,
            errors=errors,
            warnings=warnings,
        ).model_dump(),
    )
