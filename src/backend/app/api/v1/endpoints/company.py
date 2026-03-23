from fastapi import APIRouter, HTTPException, Path
from typing import Any

from app.core.redis import redis_manager
from app.models.schemas import (
    CompanyDetailResponse,
    CompanyStatus,
    RiskFlag,
    PeerComparisonRequest,
    PeerComparisonResponse,
    PeerMetric,
    IndustryClassification,
)
from app.utils.akshare_client import akshare_client

router = APIRouter()

CACHE_TTL = 24 * 60 * 60

try:
    import akshare as ak

    AKSHARE_AVAILABLE = True
except ImportError:
    AKSHARE_AVAILABLE = False


async def get_company_info(stock_code: str) -> dict[str, Any]:
    if not AKSHARE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Data source unavailable")

    try:
        stock_info = ak.stock_individual_info_em(symbol=stock_code)
        info_dict = {}
        for _, row in stock_info.iterrows():
            info_dict[row["item"]] = row["value"]

        metrics = ak.stock_financial_analysis_indicator(symbol=stock_code)

        return {"info": info_dict, "metrics": metrics.to_dict(orient="records")}
    except Exception:
        raise HTTPException(status_code=404, detail=f"Company {stock_code} not found")


@router.get("/company/{stock_code}", response_model=CompanyDetailResponse)
async def get_company(
    stock_code: str = Path(..., description="Stock code", example="000001"),
) -> CompanyDetailResponse:
    cache_key = f"company:{stock_code}"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return CompanyDetailResponse(**cached_data)

    data = await get_company_info(stock_code)
    info = data["info"]
    metrics = data["metrics"]

    company_status = CompanyStatus.ACTIVE
    risk_flag = RiskFlag.NORMAL

    status_str = info.get("上市状态", "上市")
    if status_str == "暂停上市":
        company_status = CompanyStatus.SUSPENDED
    elif status_str == "终止上市":
        company_status = CompanyStatus.DELISTED

    company_detail = CompanyDetailResponse(
        code=stock_code,
        name=info.get("股票名称", info.get("公司全称", "")),
        industry=info.get("行业"),
        status=company_status,
        risk_flag=risk_flag,
        metrics=metrics,
    )

    await redis_manager.set_json(cache_key, company_detail.model_dump(), CACHE_TTL)

    return company_detail


@router.get("/industry/csrc", response_model=list[IndustryClassification])
async def get_industry_csrc() -> list[IndustryClassification]:
    cache_key = "industry:csrc"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    csrc_data = await akshare_client.get_industry_csrc()
    result = [
        IndustryClassification(code=item.get("code", ""), name=item.get("name", ""), level="csrc")
        for item in csrc_data
    ]

    await redis_manager.set_json(cache_key, [r.model_dump() for r in result], CACHE_TTL)

    return result


@router.get("/industry/sw-one", response_model=list[IndustryClassification])
async def get_industry_sw_one() -> list[IndustryClassification]:
    cache_key = "industry:sw:one"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    sw_data = await akshare_client.get_industry_sw_one()
    result = [
        IndustryClassification(code=item.get("code", ""), name=item.get("name", ""), level="1")
        for item in sw_data
    ]

    await redis_manager.set_json(cache_key, [r.model_dump() for r in result], CACHE_TTL)

    return result


@router.get("/industry/sw-three", response_model=list[IndustryClassification])
async def get_industry_sw_three() -> list[IndustryClassification]:
    cache_key = "industry:sw:three"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    sw_data = await akshare_client.get_industry_sw_three()
    result = [
        IndustryClassification(code=item.get("code", ""), name=item.get("name", ""), level="3")
        for item in sw_data
    ]

    await redis_manager.set_json(cache_key, [r.model_dump() for r in result], CACHE_TTL)

    return result


@router.post("/company/compare", response_model=PeerComparisonResponse)
async def compare_with_peers(request: PeerComparisonRequest) -> PeerComparisonResponse:
    cache_key = f"compare:{request.code}:{request.industry_type}:{hash(str(request.metrics))}"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return PeerComparisonResponse(**cached_data)

    from app.services.financial import financial_service

    company_info = await akshare_client.get_company_info(request.code)
    industry = company_info.get("行业") or company_info.get("industry", "Unknown")

    peer_codes = await akshare_client.get_industry_peers(request.code, request.industry_type)

    company_metrics = await financial_service.get_company_metrics(
        request.code, period="annual", years=5
    )

    peer_metrics_list: list[dict[str, Any]] = []
    for peer_code in peer_codes[:20]:
        try:
            peer_metric = await financial_service.get_company_metrics(
                peer_code, period="annual", years=5
            )
            peer_metrics_list.append(peer_metric)
        except Exception:
            continue

    metrics_result = []
    for metric in request.metrics:
        metric_value = company_metrics.get(metric)

        peer_values = []
        for pm in peer_metrics_list:
            val = pm.get(metric)
            if val is not None and isinstance(val, (int, float)):
                peer_values.append(float(val))

        industry_avg = sum(peer_values) / len(peer_values) if peer_values else None
        sorted_peer_values = sorted(peer_values)
        if sorted_peer_values:
            mid = len(sorted_peer_values) // 2
            if len(sorted_peer_values) % 2 == 0:
                industry_median = (sorted_peer_values[mid - 1] + sorted_peer_values[mid]) / 2
            else:
                industry_median = sorted_peer_values[mid]
        else:
            industry_median = None

        percentile = None
        if metric_value is not None and peer_values:
            lower_count = sum(1 for v in peer_values if v < metric_value)
            percentile = (lower_count / len(peer_values)) * 100

        metrics_result.append(
            PeerMetric(
                metric=metric,
                value=metric_value,
                industry_avg=industry_avg,
                industry_median=industry_median,
                percentile=percentile,
            )
        )

    result = PeerComparisonResponse(
        code=request.code,
        name=company_info.get("股票简称", company_info.get("name", "")),
        industry=industry,
        peers_count=len(peer_codes),
        metrics=metrics_result,
    )

    await redis_manager.set_json(cache_key, result.model_dump(), CACHE_TTL)

    return result
