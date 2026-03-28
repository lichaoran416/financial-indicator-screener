import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select, desc

from app.db.database import db_manager
from app.db.models import SyncStatusHistory, IndustrySyncStatus
from app.db.schemas import (
    SyncTriggerRequest,
    SyncTriggerResponse,
    SyncStatusResponse,
    SyncStatusHistorySchema,
    IndustrySyncStatusSchema,
)

router = APIRouter()


async def run_sync_task(sync_type: str, industry_sw_three: Optional[str] = None):
    if sync_type == "basic":
        from scripts.sync_stock_basic import sync_stock_basic

        await sync_stock_basic(force=True)
    elif sync_type == "financial":
        from scripts.sync_accounting_data import sync_all

        await sync_all(force=True)
    elif sync_type == "industry":
        from scripts.sync_industry_class import sync_industry_class

        await sync_industry_class(force=True)
    elif sync_type == "all":
        from scripts.sync_stock_basic import sync_stock_basic
        from scripts.sync_accounting_data import sync_all
        from scripts.sync_industry_class import sync_industry_class

        await sync_stock_basic(force=True)
        await sync_industry_class(force=True)
        await sync_all(force=True)


@router.post("/sync/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(request: SyncTriggerRequest, background_tasks: BackgroundTasks):
    valid_sync_types = ["financial", "basic", "industry", "all"]
    if request.sync_type not in valid_sync_types:
        raise HTTPException(
            status_code=400, detail=f"Invalid sync_type. Must be one of: {valid_sync_types}"
        )

    task_id = str(uuid.uuid4())

    async with db_manager.session() as session:
        history = SyncStatusHistory(
            task_id=task_id,
            sync_type=request.sync_type,
            status="pending",
            industry_sw_three=request.industry_sw_three,
            started_at=datetime.utcnow(),
        )
        session.add(history)

    background_tasks.add_task(run_sync_task, request.sync_type, request.industry_sw_three)

    return SyncTriggerResponse(
        status="accepted",
        task_id=task_id,
        message=f"Sync task {request.sync_type} submitted successfully",
    )


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(industry_sw_three: Optional[str] = None):
    async with db_manager.session() as session:
        stmt = select(SyncStatusHistory).order_by(desc(SyncStatusHistory.started_at)).limit(50)
        result = await session.execute(stmt)
        tasks = result.scalars().all()

        stmt_industry = select(IndustrySyncStatus)
        if industry_sw_three:
            stmt_industry = stmt_industry.where(
                IndustrySyncStatus.industry_sw_three == industry_sw_three
            )
        result_industry = await session.execute(stmt_industry)
        industries = result_industry.scalars().all()

    return SyncStatusResponse(
        tasks=[SyncStatusHistorySchema.model_validate(t) for t in tasks],
        industries=[IndustrySyncStatusSchema.model_validate(i) for i in industries],
        total_tasks=len(tasks),
    )
