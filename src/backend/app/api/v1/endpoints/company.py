from fastapi import APIRouter, HTTPException, Path
from typing import Any
import logging
from sqlalchemy import select, distinct

from app.core.redis import redis_manager
from app.core.config import settings
from app.db.database import db_manager
from app.db.models import StockBasic, StockIndustry
from app.models.schemas import (
    CompanyDetailResponse,
    CompanyStatus,
    RiskFlag,
    PeerComparisonRequest,
    PeerComparisonResponse,
    PeerMetric,
    IndustryClassification,
    TrendComparisonRequest,
    TrendComparisonResponse,
    MetricTrendPoint,
    MetricTrendData,
    CompanyTrendData,
    DisclosureDateRequest,
    DisclosureDateResponse,
    CompanyDisclosureDate,
)
from app.services.financial import financial_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _determine_risk_flag(name: str) -> str:
    name_upper = name.upper()
    if "*ST" in name_upper or "S*ST" in name_upper or "S ST" in name_upper:
        return RiskFlag.STAR_ST.value
    elif "ST" in name_upper or "SST" in name_upper:
        return RiskFlag.ST.value
    elif "退" in name or "DELIST" in name_upper:
        return RiskFlag.DELISTING_RISK.value
    return RiskFlag.NORMAL.value


async def get_company_info(stock_code: str) -> dict[str, Any]:
    async with db_manager.session() as session:
        stmt = (
            select(StockBasic.code, StockBasic.name, StockBasic.is_active, StockIndustry)
            .outerjoin(StockIndustry, StockBasic.code == StockIndustry.code)
            .where(StockBasic.code == stock_code)
        )
        result = await session.execute(stmt)
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Company {stock_code} not found")

        code, name, is_active, industry = row

        status = CompanyStatus.ACTIVE.value if is_active else CompanyStatus.SUSPENDED.value
        risk_flag = _determine_risk_flag(name)

        industry_name = None
        if industry:
            industry_name = (
                industry.industry_sw_three
                or industry.industry_sw_one
                or industry.industry_csrc
                or industry.industry_ths
            )

        info_dict = {
            "股票名称": name,
            "公司全称": name,
            "行业": industry_name,
            "上市状态": "上市" if is_active else "暂停上市",
        }

        metrics = await financial_service.get_company_metrics(stock_code, period="annual", years=5)

        return {"info": info_dict, "metrics": metrics, "status": status, "risk_flag": risk_flag}


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

    company_status = CompanyStatus(data["status"]) if data["status"] else CompanyStatus.ACTIVE
    risk_flag = RiskFlag(data["risk_flag"]) if data["risk_flag"] else RiskFlag.NORMAL

    company_detail = CompanyDetailResponse(
        code=stock_code,
        name=info.get("股票名称", info.get("公司全称", "")),
        industry=info.get("行业"),
        status=company_status,
        risk_flag=risk_flag,
        metrics=metrics,
    )

    await redis_manager.set_json(cache_key, company_detail.model_dump(), settings.CACHE_TTL)

    return company_detail


@router.get("/industry/csrc", response_model=list[IndustryClassification])
async def get_industry_csrc() -> list[IndustryClassification]:
    cache_key = "industry:csrc"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    async with db_manager.session() as session:
        stmt = select(distinct(StockIndustry.industry_csrc)).where(
            StockIndustry.industry_csrc.isnot(None)
        )
        result = await session.execute(stmt)
        rows = result.fetchall()

    industry_list = [
        IndustryClassification(
            code=row[0] if row[0] else "", name=row[0] if row[0] else "", level="csrc"
        )
        for row in rows
        if row[0]
    ]

    await redis_manager.set_json(
        cache_key, [r.model_dump() for r in industry_list], settings.CACHE_TTL
    )

    return industry_list


@router.get("/industry/sw-one", response_model=list[IndustryClassification])
async def get_industry_sw_one() -> list[IndustryClassification]:
    cache_key = "industry:sw:one"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    async with db_manager.session() as session:
        stmt = select(distinct(StockIndustry.industry_sw_one)).where(
            StockIndustry.industry_sw_one.isnot(None)
        )
        result = await session.execute(stmt)
        rows = result.fetchall()

    industry_list = [
        IndustryClassification(
            code=row[0] if row[0] else "", name=row[0] if row[0] else "", level="1"
        )
        for row in rows
        if row[0]
    ]

    await redis_manager.set_json(
        cache_key, [r.model_dump() for r in industry_list], settings.CACHE_TTL
    )

    return industry_list


@router.get("/industry/sw-three", response_model=list[IndustryClassification])
async def get_industry_sw_three() -> list[IndustryClassification]:
    cache_key = "industry:sw:three"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    async with db_manager.session() as session:
        stmt = select(distinct(StockIndustry.industry_sw_three)).where(
            StockIndustry.industry_sw_three.isnot(None)
        )
        result = await session.execute(stmt)
        rows = result.fetchall()

    industry_list = [
        IndustryClassification(
            code=row[0] if row[0] else "", name=row[0] if row[0] else "", level="3"
        )
        for row in rows
        if row[0]
    ]

    await redis_manager.set_json(
        cache_key, [r.model_dump() for r in industry_list], settings.CACHE_TTL
    )

    return industry_list


@router.get("/industry/ths", response_model=list[IndustryClassification])
async def get_industry_ths() -> list[IndustryClassification]:
    cache_key = "industry:ths"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return [IndustryClassification(**item) for item in cached_data]

    async with db_manager.session() as session:
        stmt = select(distinct(StockIndustry.industry_ths)).where(
            StockIndustry.industry_ths.isnot(None)
        )
        result = await session.execute(stmt)
        rows = result.fetchall()

    industry_list = [
        IndustryClassification(
            code=row[0] if row[0] else "", name=row[0] if row[0] else "", level="ths"
        )
        for row in rows
        if row[0]
    ]

    await redis_manager.set_json(
        cache_key, [r.model_dump() for r in industry_list], settings.CACHE_TTL
    )

    return industry_list


@router.post("/company/compare", response_model=PeerComparisonResponse)
async def compare_with_peers(request: PeerComparisonRequest) -> PeerComparisonResponse:
    cache_key = f"compare:{request.code}:{request.industry_type}:{hash(str(request.metrics))}"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return PeerComparisonResponse(**cached_data)

    async with db_manager.session() as session:
        company_stmt = (
            select(StockBasic.code, StockBasic.name, StockIndustry)
            .outerjoin(StockIndustry, StockBasic.code == StockIndustry.code)
            .where(StockBasic.code == request.code)
        )
        company_result = await session.execute(company_stmt)
        company_row = company_result.fetchone()

        if not company_row:
            raise HTTPException(status_code=404, detail=f"Company {request.code} not found")

        company_code, company_name, company_industry = company_row

        industry_field_map = {
            "csrc": StockIndustry.industry_csrc,
            "sw1": StockIndustry.industry_sw_one,
            "sw3": StockIndustry.industry_sw_three,
            "ths": StockIndustry.industry_ths,
        }

        industry_column = industry_field_map.get(request.industry_type)
        if not industry_column:
            industry_column = StockIndustry.industry_csrc

        industry_value = None
        if company_industry:
            if request.industry_type == "csrc":
                industry_value = company_industry.industry_csrc
            elif request.industry_type == "sw1":
                industry_value = company_industry.industry_sw_one
            elif request.industry_type == "sw3":
                industry_value = company_industry.industry_sw_three
            elif request.industry_type == "ths":
                industry_value = company_industry.industry_ths

        if industry_column == StockIndustry.industry_csrc:
            peers_stmt = (
                select(StockBasic.code)
                .join(StockIndustry, StockBasic.code == StockIndustry.code)
                .where(StockIndustry.industry_csrc == industry_value)
            )
        elif industry_column == StockIndustry.industry_sw_one:
            peers_stmt = (
                select(StockBasic.code)
                .join(StockIndustry, StockBasic.code == StockIndustry.code)
                .where(StockIndustry.industry_sw_one == industry_value)
            )
        elif industry_column == StockIndustry.industry_sw_three:
            peers_stmt = (
                select(StockBasic.code)
                .join(StockIndustry, StockBasic.code == StockIndustry.code)
                .where(StockIndustry.industry_sw_three == industry_value)
            )
        else:
            peers_stmt = (
                select(StockBasic.code)
                .join(StockIndustry, StockBasic.code == StockIndustry.code)
                .where(StockIndustry.industry_ths == industry_value)
            )

        peers_result = await session.execute(peers_stmt)
        peer_rows = peers_result.fetchall()
        peer_codes = [row[0] for row in peer_rows]

    company_metrics = await financial_service.get_company_metrics(
        request.code, period="annual", years=5, skip_akshare=True
    )

    peer_metrics_list: list[dict[str, Any]] = []
    for peer_code in peer_codes[:20]:
        if peer_code == request.code:
            continue
        try:
            peer_metric = await financial_service.get_company_metrics(
                peer_code, period="annual", years=5, skip_akshare=True
            )
            peer_metrics_list.append(peer_metric)
        except Exception as e:
            logger.warning(f"Failed to get peer metric for {peer_code}: {e}")
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
        name=company_name or "",
        industry=industry_value or "Unknown",
        peers_count=len(peer_codes),
        metrics=metrics_result,
    )

    await redis_manager.set_json(cache_key, result.model_dump(), settings.CACHE_TTL)

    return result


@router.post("/company/trend", response_model=TrendComparisonResponse)
async def get_trend_comparison(request: TrendComparisonRequest) -> TrendComparisonResponse:
    if len(request.codes) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 companies allowed")
    if len(request.metrics) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 metrics for dual Y-axis")

    cache_key = f"trend:{','.join(sorted(request.codes))}:{','.join(sorted(request.metrics))}:{request.period}:{request.years}"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return TrendComparisonResponse(**cached_data)

    companies_data: list[CompanyTrendData] = []

    async with db_manager.session() as session:
        stmt = select(StockBasic.code, StockBasic.name).where(StockBasic.code.in_(request.codes))
        query_result = await session.execute(stmt)
        query_rows = query_result.fetchall()
        code_to_name = {row[0]: row[1] for row in query_rows}

    for code in request.codes:
        try:
            name = code_to_name.get(code, code)

            time_series = await financial_service.get_company_metrics_time_series(
                code, request.metrics, period=request.period.value, years=request.years
            )

            trends: list[MetricTrendData] = []
            for metric in request.metrics:
                data_points = time_series.get(metric, [])
                trend_data = MetricTrendData(
                    metric=metric,
                    data=[MetricTrendPoint(date=date, value=value) for date, value in data_points],
                )
                trends.append(trend_data)

            companies_data.append(CompanyTrendData(code=code, name=name, trends=trends))
        except Exception as e:
            logger.warning(f"Failed to get trend data for {code}: {e}")
            continue

    trend_response = TrendComparisonResponse(
        companies=companies_data,
        period=request.period.value,
        years=request.years,
    )

    await redis_manager.set_json(cache_key, trend_response.model_dump(), settings.CACHE_TTL)

    return trend_response


@router.post("/company/disclosure-dates", response_model=DisclosureDateResponse)
async def get_disclosure_dates(request: DisclosureDateRequest) -> DisclosureDateResponse:
    cache_key = f"disclosure:{','.join(sorted(request.codes))}:{request.period.value}"

    cached_data = await redis_manager.get_json(cache_key)
    if cached_data:
        return DisclosureDateResponse(**cached_data)

    async with db_manager.session() as session:
        stmt = select(StockBasic.code, StockBasic.name).where(StockBasic.code.in_(request.codes))
        query_result = await session.execute(stmt)
        query_rows = query_result.fetchall()
        code_to_name = {row[0]: row[1] for row in query_rows}

    companies: list[CompanyDisclosureDate] = []
    for code in request.codes:
        name = code_to_name.get(code, "")

        disclosure_dates: dict[str, Any] = {"annual": {}, "quarterly": {}}

        companies.append(
            CompanyDisclosureDate(code=code, name=name, disclosure_dates=disclosure_dates)
        )

    disclosure_response = DisclosureDateResponse(companies=companies)

    await redis_manager.set_json(cache_key, disclosure_response.model_dump(), settings.CACHE_TTL)

    return disclosure_response
