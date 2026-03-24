import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

from app.core.redis import redis_manager
from app.models.schemas import (
    Condition,
    CompanyInfo,
    SaveScreenRequest,
    SavedScreen,
    ScreenRequest,
    ScreenResponse,
)

router = APIRouter(prefix="/screen", tags=["screen"])

SAVED_SCREENS_KEY = "saved_screens"


async def get_companies_from_financial_service(
    conditions: List[Condition],
    logic: str = "and",
    industry: str | None = None,
    exclude_industry: str | None = None,
    industries: List[str] | None = None,
    exclude_industries: List[str] | None = None,
    sort_by: str | None = None,
    order: str = "desc",
    sort_by_2: str | None = None,
    order_2: str = "desc",
    limit: int = 50,
    page: int = 1,
    include_suspended: bool = False,
    profit_only: bool = False,
    include_st: bool = True,
    require_complete_data: bool = False,
) -> tuple[List[CompanyInfo], int]:
    from app.services.financial import financial_service

    conditions_dicts = [cond.model_dump() for cond in conditions]
    result = await financial_service.screen_companies(
        conditions=conditions_dicts,
        logic=logic,
        industry=industry,
        exclude_industry=exclude_industry,
        industries=industries,
        exclude_industries=exclude_industries,
        sort_by=sort_by,
        order=order,
        sort_by_2=sort_by_2,
        order_2=order_2,
        limit=limit,
        page=page,
        include_suspended=include_suspended,
        profit_only=profit_only,
        include_st=include_st,
        require_complete_data=require_complete_data,
    )
    companies = [CompanyInfo(**company) for company in result.get("companies", [])]
    total = result.get("total", 0)
    return companies, total


@router.post("", response_model=ScreenResponse)
async def screen_companies_endpoint(request: ScreenRequest) -> ScreenResponse:
    """
    Screen companies by financial conditions.
    """
    try:
        companies, total = await get_companies_from_financial_service(
            conditions=request.conditions,
            logic=request.logic or "and",
            industry=request.industry,
            exclude_industry=request.exclude_industry,
            industries=request.industries,
            exclude_industries=request.exclude_industries,
            sort_by=request.sort_by,
            order=request.order.value,
            limit=request.limit,
            page=request.page,
            include_suspended=request.include_suspended,
            profit_only=request.profit_only,
            include_st=request.include_st,
            require_complete_data=request.require_complete_data,
        )
        return ScreenResponse(companies=companies, total=total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save", response_model=SavedScreen)
async def save_screen(request: SaveScreenRequest) -> SavedScreen:
    """
    Save screening conditions to Redis with permanent TTL.
    """
    saved_screen = SavedScreen(
        id=str(uuid.uuid4()),
        name=request.name,
        conditions=request.conditions,
        created_at=datetime.utcnow(),
    )

    existing = await redis_manager.get_json(SAVED_SCREENS_KEY) or []
    existing.append(saved_screen.model_dump(mode="json"))
    await redis_manager.set_json(SAVED_SCREENS_KEY, existing)

    return saved_screen


@router.get("/saved", response_model=List[SavedScreen])
async def get_saved_screens() -> List[SavedScreen]:
    """
    Get all saved screening conditions from Redis.
    """
    saved_screens = await redis_manager.get_json(SAVED_SCREENS_KEY) or []
    return [SavedScreen(**screen) for screen in saved_screens]


@router.delete("/saved/{screen_id}")
async def delete_saved_screen(screen_id: str) -> dict[str, bool]:
    """
    Delete a saved screening condition by ID.
    """
    existing = await redis_manager.get_json(SAVED_SCREENS_KEY) or []
    updated = [s for s in existing if s.get("id") != screen_id]
    await redis_manager.set_json(SAVED_SCREENS_KEY, updated)
    return {"deleted": len(existing) > len(updated)}
