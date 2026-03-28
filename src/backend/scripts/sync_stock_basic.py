import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

import akshare as ak
from sqlalchemy import select, func

from app.db.database import db_manager
from app.db.models import StockBasic, SyncStatusHistory
from scripts.utils.db_utils import batch_insert, batch_update
from scripts.utils.checkpoint import CheckpointManager
from scripts.utils.logger import setup_sync_logger

logger = setup_sync_logger("sync_stock_basic")


@dataclass
class SyncResult:
    task_id: str
    sync_type: str
    status: str
    total_count: int = 0
    processed_count: int = 0
    failed_count: int = 0
    failed_codes: list[str] = field(default_factory=list)
    error_message: Optional[str] = None
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None


async def sync_stock_basic(force: bool = False) -> SyncResult:
    task_id = str(uuid.uuid4())
    result = SyncResult(task_id=task_id, sync_type="basic", status="running")

    checkpoint_manager = CheckpointManager()
    if not force:
        checkpoint_manager.get_latest_checkpoint("stock_basic")

    logger.info("Starting stock basic sync", extra={"sync_type": "basic", "task_id": task_id})

    try:
        await db_manager.init("postgresql+asyncpg://stock_user:stock_pass@localhost:5432/stock_db")

        async with db_manager.session() as session:
            history = SyncStatusHistory(
                task_id=task_id,
                sync_type="basic",
                status="running",
                started_at=result.started_at,
            )
            session.add(history)
            await session.flush()

        logger.info("Fetching stock list from akshare")
        stock_df = ak.stock_individual_info_em()

        records = []
        for _, row in stock_df.iterrows():
            code = str(row.get("代码", "")).strip()
            if not code or len(code) != 6:
                continue

            records.append(
                {
                    "code": code,
                    "name": str(row.get("名称", "")).strip(),
                    "list_date": None,
                    "market_type": str(row.get("市场", "")).strip()
                    if pd.notna(row.get("市场"))
                    else None,
                    "is_active": True,
                }
            )

        async with db_manager.session() as session:
            total = await session.execute(select(func.count(StockBasic.code)))
            existing_count = total.scalar() or 0

        if existing_count == 0:
            async with db_manager.session() as session:
                await batch_insert(session, StockBasic, records)
                logger.info(f"Inserted {len(records)} new stock records")
        else:
            async with db_manager.session() as session:
                await batch_update(session, StockBasic, records, id_field="code")
                logger.info(f"Updated {len(records)} stock records")

        checkpoint_manager.save_checkpoint(
            "stock_basic",
            {
                "task_id": task_id,
                "synced_at": datetime.utcnow().isoformat(),
                "total_count": len(records),
            },
        )

        result.status = "completed"
        result.total_count = len(records)
        result.processed_count = len(records)
        result.finished_at = datetime.utcnow()

        async with db_manager.session() as session:
            history = SyncStatusHistory(
                task_id=task_id,
                sync_type="basic",
                status="completed",
                started_at=result.started_at,
                finished_at=result.finished_at,
                total_count=result.total_count,
                processed_count=result.processed_count,
                failed_count=result.failed_count,
            )
            session.add(history)

        logger.info(
            "Stock basic sync completed",
            extra={
                "sync_type": "basic",
                "task_id": task_id,
                "total": len(records),
            },
        )

    except Exception as e:
        result.status = "failed"
        result.error_message = str(e)
        result.finished_at = datetime.utcnow()
        logger.error(
            f"Stock basic sync failed: {e}", extra={"sync_type": "basic", "task_id": task_id}
        )

        async with db_manager.session() as session:
            history = SyncStatusHistory(
                task_id=task_id,
                sync_type="basic",
                status="failed",
                started_at=result.started_at,
                finished_at=result.finished_at,
                error_message=str(e),
            )
            session.add(history)

    return result


if __name__ == "__main__":
    import sys
    import pandas as pd

    force = "--force" in sys.argv
    result = asyncio.run(sync_stock_basic(force=force))
    print(f"Sync result: {result.status}, processed: {result.processed_count}/{result.total_count}")
