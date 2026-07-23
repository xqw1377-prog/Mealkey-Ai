"""规则查询端点"""

from fastapi import APIRouter
from app.engine.knowledge_loader import load_rules
from app.models.schemas import ApiResponse
from app.models.enums import BusinessCode

router = APIRouter()
_rules = load_rules()


@router.get("/rules", response_model=ApiResponse)
async def list_rules():
    """获取预置规则列表"""
    rules_data = []
    for r in _rules:
        rules_data.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "domain": r.get("domain"),
            "level": r.get("level"),
            "category": r.get("category"),
            "summary": r.get("conclusion", {}).get("summary", ""),
        })

    return ApiResponse(
        request_id="",
        code=BusinessCode.SUCCESS,
        message="success",
        data={"rules": rules_data, "total": len(rules_data)},
    )
