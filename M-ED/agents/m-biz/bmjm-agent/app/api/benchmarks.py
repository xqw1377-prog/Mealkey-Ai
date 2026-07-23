"""行业基准查询端点"""

from fastapi import APIRouter
from app.engine.knowledge_loader import load_benchmarks
from app.models.schemas import ApiResponse
from app.models.enums import BusinessCode

router = APIRouter()
_benchmarks = load_benchmarks()


@router.get("/benchmarks", response_model=ApiResponse)
async def list_benchmarks():
    """获取行业基准列表"""
    benchmark_list = []
    for b in _benchmarks:
        metrics = b.get("metrics", {})
        benchmark_list.append({
            "industry": b.get("industry"),
            "region": b.get("region"),
            "year": b.get("year"),
            "metric_count": len(metrics),
            "available_metrics": list(metrics.keys()),
        })

    return ApiResponse(
        request_id="",
        code=BusinessCode.SUCCESS,
        message="success",
        data={"benchmarks": benchmark_list, "total": len(benchmark_list)},
    )


@router.get("/benchmarks/{industry}", response_model=ApiResponse)
async def get_benchmark(industry: str):
    """获取特定行业基准"""
    for b in _benchmarks:
        if b.get("industry") == industry:
            return ApiResponse(
                request_id="",
                code=BusinessCode.SUCCESS,
                message="success",
                data=b,
            )

    return ApiResponse(
        request_id=industry,
        code=BusinessCode.REQUEST_FORMAT_ERROR,
        message=f"行业基准不存在: {industry}",
    )
