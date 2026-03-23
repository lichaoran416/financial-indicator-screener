from fastapi import APIRouter

from app.models.schemas import MetricsListResponse, MetricInfo

router = APIRouter()

METRICS = [
    MetricInfo(id="roi", name="ROI", category="Profitability"),
    MetricInfo(id="roe", name="ROE", category="Profitability"),
    MetricInfo(id="gross_margin", name="Gross Margin", category="Profitability"),
    MetricInfo(id="net_profit_growth", name="Net Profit Growth", category="Growth"),
    MetricInfo(id="revenue_growth", name="Revenue Growth", category="Growth"),
    MetricInfo(id="debt_ratio", name="Debt Ratio", category="Financial Health"),
    MetricInfo(id="current_ratio", name="Current Ratio", category="Liquidity"),
    MetricInfo(id="pe", name="PE", category="Valuation"),
    MetricInfo(id="pb", name="PB", category="Valuation"),
]


@router.get("/metrics", response_model=MetricsListResponse)
async def get_metrics() -> MetricsListResponse:
    return MetricsListResponse(metrics=METRICS)
