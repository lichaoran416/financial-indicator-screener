from fastapi import APIRouter

from app.models.schemas import MetricsListResponse, MetricInfo
from app.services.financial import FinancialService

router = APIRouter()


def get_metrics_list() -> list[MetricInfo]:
    return [
        MetricInfo(id=metric_id, name=info["name"], category=info["category"])
        for metric_id, info in FinancialService.METRIC_DEFINITIONS.items()
    ]


@router.get("/metrics", response_model=MetricsListResponse)
async def get_metrics() -> MetricsListResponse:
    return MetricsListResponse(metrics=get_metrics_list())