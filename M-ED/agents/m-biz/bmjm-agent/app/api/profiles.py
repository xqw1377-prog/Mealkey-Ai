"""商业模式画像查询端点"""

from fastapi import APIRouter
from app.engine.knowledge_loader import load_profiles
from app.models.schemas import ApiResponse
from app.models.enums import BusinessCode

router = APIRouter()
_profiles = load_profiles()


@router.get("/profiles", response_model=ApiResponse)
async def list_profiles():
    """获取商业模式画像列表"""
    profiles_data = []
    for p in _profiles:
        profiles_data.append({
            "profile_id": p.get("profile_id"),
            "name": p.get("name"),
            "category": p.get("category"),
            "strengths": p.get("strengths", [])[:2],
            "risks": p.get("risks", [])[:2],
        })

    return ApiResponse(
        request_id="",
        code=BusinessCode.SUCCESS,
        message="success",
        data={"profiles": profiles_data, "total": len(profiles_data)},
    )


@router.get("/profiles/{profile_id}", response_model=ApiResponse)
async def get_profile(profile_id: str):
    """获取单个画像详情"""
    for p in _profiles:
        if p.get("profile_id") == profile_id:
            return ApiResponse(
                request_id="",
                code=BusinessCode.SUCCESS,
                message="success",
                data=p,
            )

    return ApiResponse(
        request_id=profile_id,
        code=BusinessCode.REQUEST_FORMAT_ERROR,
        message=f"画像不存在: {profile_id}",
    )
