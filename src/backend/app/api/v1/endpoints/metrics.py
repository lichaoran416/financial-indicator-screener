from fastapi import APIRouter

from app.models.schemas import MetricsListResponse, DerivedMetric, RawAccountingItem
from app.services.financial import FinancialService
from app.db.database import db_manager
from app.db.models import AccountingItem
from sqlalchemy import select

router = APIRouter()


def get_derived_metrics() -> list[DerivedMetric]:
    return [
        DerivedMetric(
            id=metric_id,
            name=info["name"],
            category=info["category"],
            formula=info.get("formula"),
        )
        for metric_id, info in FinancialService.METRIC_DEFINITIONS.items()
    ]


async def get_raw_accounting_items() -> list[RawAccountingItem]:
    raw_items = []
    try:
        await db_manager.init("postgresql+asyncpg://stock_user:stock_pass@localhost:5432/stock_db")
        async with db_manager.session() as session:
            result = await session.execute(select(AccountingItem))
            items = result.scalars().all()
            for item in items:
                raw_items.append(
                    RawAccountingItem(
                        name=str(item.name) if item.name is not None else "",
                        report_type=str(item.report_type)
                        if item.report_type is not None
                        else "unknown",
                        category=str(item.category) if item.category is not None else None,
                    )
                )
    except Exception:
        raw_items = []
    return raw_items


@router.get("/metrics", response_model=MetricsListResponse)
async def get_metrics() -> MetricsListResponse:
    derived = get_derived_metrics()
    raw_items = await get_raw_accounting_items()
    return MetricsListResponse(derived_metrics=derived, raw_items=raw_items)
