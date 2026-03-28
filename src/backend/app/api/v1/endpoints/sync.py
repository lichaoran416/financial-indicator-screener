import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select, desc

from app.db.database import db_manager
from app.db.models import SyncStatusHistory, IndustrySyncStatus
from app.db.schemas import (
    SyncTriggerRequest,
    SyncTriggerResponse,
    SyncStatusResponse,
    LastSync,
    LastSyncDetail,
)

router = APIRouter()
logger = logging.getLogger("api")


async def run_sync_task(sync_type: str, industry_sw_three: Optional[str] = None):
    if sync_type == "basic":
        from scripts.sync_stock_basic import sync_stock_basic

        await sync_stock_basic(force=True)
    elif sync_type == "financial":
        from scripts.sync_accounting_data import sync_all

        await sync_all(force=True, industry_sw_three=industry_sw_three)
    elif sync_type == "industry":
        from scripts.sync_industry_class import sync_industry_class

        await sync_industry_class(force=True)
    elif sync_type == "all":
        from scripts.sync_stock_basic import sync_stock_basic
        from scripts.sync_accounting_data import sync_all
        from scripts.sync_industry_class import sync_industry_class

        await sync_stock_basic(force=True)
        await sync_industry_class(force=True)
        await sync_all(force=True, industry_sw_three=industry_sw_three)


@router.post("/sync/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(request: SyncTriggerRequest, background_tasks: BackgroundTasks):
    valid_sync_types = ["financial", "basic", "industry", "all"]
    if request.sync_type not in valid_sync_types:
        raise HTTPException(
            status_code=400, detail=f"Invalid sync_type. Must be one of: {valid_sync_types}"
        )

    task_id = str(uuid.uuid4())

    try:
        async with db_manager.session() as session:
            history = SyncStatusHistory(
                task_id=task_id,
                sync_type=request.sync_type,
                status="pending",
                industry_sw_three=request.industry_sw_three,
                started_at=datetime.now(timezone.utc),
            )
            session.add(history)
    except Exception as e:
        logger.error(
            f"Error creating sync task record: {e}",
            extra={"type": "error", "error_type": type(e).__name__, "error_message": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(run_sync_task, request.sync_type, request.industry_sw_three)

    return SyncTriggerResponse(
        status="accepted",
        task_id=task_id,
        message=f"Sync task {request.sync_type} submitted successfully",
    )


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(industry_sw_three: Optional[str] = None):
    try:
        async with db_manager.session() as session:
            stmt = select(SyncStatusHistory).order_by(desc(SyncStatusHistory.started_at))
            result = await session.execute(stmt)
            all_tasks = result.scalars().all()

            stmt_industry = select(IndustrySyncStatus)
            if industry_sw_three:
                stmt_industry = stmt_industry.where(
                    IndustrySyncStatus.industry_sw_three == industry_sw_three
                )
            result_industry = await session.execute(stmt_industry)
            result_industry.scalars().all()
    except Exception as e:
        logger.error(
            f"Error fetching sync status: {e}",
            extra={"type": "error", "error_type": type(e).__name__, "error_message": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))

    last_sync = LastSync()

    for sync_type in ["financial", "basic", "industry"]:
        type_tasks = [t for t in all_tasks if t.sync_type == sync_type]
        if not type_tasks:
            continue

        latest_task = type_tasks[0]

        industry_updates: dict[str, datetime] = {}
        for ind_task in type_tasks:
            if ind_task.industry_sw_three and ind_task.finished_at:
                industry_updates[ind_task.industry_sw_three] = ind_task.finished_at  # type: ignore[assignment,index]

        detail = LastSyncDetail(
            status=latest_task.status,  # type: ignore[arg-type]
            records_synced=latest_task.processed_count,  # type: ignore[arg-type]
            last_updated=latest_task.finished_at,  # type: ignore[arg-type]
            current_code=None,
            last_updated_by_industry=industry_updates if industry_updates else None,
        )

        if sync_type == "financial":
            last_sync.financial = detail
        elif sync_type == "basic":
            last_sync.basic = detail
        elif sync_type == "industry":
            last_sync.industry = detail

    return SyncStatusResponse(last_sync=last_sync)
