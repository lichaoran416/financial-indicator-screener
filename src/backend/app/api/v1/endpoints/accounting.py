import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select, func

from app.db.database import db_manager
from app.db.models import AccountingItem
from app.db.schemas import AccountingItemSchema, AccountingItemListResponse

router = APIRouter()
logger = logging.getLogger("api")


@router.get("/accounting/items", response_model=AccountingItemListResponse)
async def get_accounting_items(
    industry_sw_three: Optional[str] = Query(None, description="Filter by SW3 industry"),
    report_type: Optional[str] = Query(
        None, description="Filter by report type: profit, balance, cashflow, all"
    ),
):
    try:
        async with db_manager.session() as session:
            stmt = select(AccountingItem)
            count_stmt = select(func.count(AccountingItem.code))

            if report_type and report_type != "all":
                stmt = stmt.where(AccountingItem.report_type == report_type)
                count_stmt = count_stmt.where(AccountingItem.report_type == report_type)

            result = await session.execute(
                stmt.order_by(AccountingItem.category, AccountingItem.name)
            )
            items = result.scalars().all()

            count_result = await session.execute(count_stmt)
            total_count = count_result.scalar() or 0
    except Exception as e:
        logger.error(
            f"Error fetching accounting items: {e}",
            extra={"type": "error", "error_type": type(e).__name__, "error_message": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))

    return AccountingItemListResponse(
        items=[AccountingItemSchema.model_validate(item) for item in items], total_count=total_count
    )
