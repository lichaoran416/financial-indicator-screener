from fastapi import APIRouter, HTTPException, Path
from typing import Any

from app.core.redis import redis_manager
from app.models.schemas import CompanyDetailResponse, CompanyStatus, RiskFlag

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
        
        return {
            "info": info_dict,
            "metrics": metrics.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Company {stock_code} not found")


@router.get("/company/{stock_code}", response_model=CompanyDetailResponse)
async def get_company(
    stock_code: str = Path(..., description="Stock code", example="000001")
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
        metrics={"financial_data": metrics}
    )
    
    await redis_manager.set_json(cache_key, company_detail.model_dump(), CACHE_TTL)
    
    return company_detail
