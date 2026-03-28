import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

import akshare as ak
from sqlalchemy import select

from app.db.database import db_manager
from app.db.models import StockBasic, StockIndustry
from scripts.utils.db_utils import batch_update
from scripts.utils.checkpoint import CheckpointManager
from scripts.utils.logger import setup_sync_logger

logger = setup_sync_logger("sync_industry_class")


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


async def sync_industry_class(force: bool = False) -> SyncResult:
    task_id = str(uuid.uuid4())
    result = SyncResult(task_id=task_id, sync_type="industry", status="running")

    logger.info(
        "Starting industry classification sync",
        extra={
            "sync_type": "industry",
            "task_id": task_id,
        },
    )

    try:
        await db_manager.init("postgresql+asyncpg://stock_user:stock_pass@localhost:5432/stock_db")

        industry_csrc_df = ak.stock_industry_category_cninfo()
        industry_ths_df = ak.stock_board_industry_name_ths()
        industry_sw_one_df = ak.sw_index_one()
        industry_sw_three_df = ak.sw_index_three()

        csrc_mapping = {}
        for _, row in industry_csrc_df.iterrows():
            code = str(row.get("股票代码", "")).strip()
            if len(code) == 6:
                csrc_mapping[code] = {
                    "industry_csrc": row.get("行业分类名称", ""),
                    "industry_csrc_code": row.get("行业编码", ""),
                }

        ths_mapping = {}
        for _, row in industry_ths_df.iterrows():
            code = str(row.get("代码", "")).strip()
            if len(code) == 6:
                ths_mapping[code] = row.get("板块名称", "")

        sw_one_mapping = {}
        for _, row in industry_sw_one_df.iterrows():
            code = str(row.get("股票代码", "")).strip()
            if len(code) == 6:
                sw_one_mapping[code] = {
                    "industry_sw_one": row.get("行业名称", ""),
                    "industry_sw_one_code": row.get("行业代码", ""),
                }

        sw_three_mapping = {}
        for _, row in industry_sw_three_df.iterrows():
            code = str(row.get("股票代码", "")).strip()
            if len(code) == 6:
                sw_three_mapping[code] = {
                    "industry_sw_three": row.get("行业名称", ""),
                    "industry_sw_three_code": row.get("行业代码", ""),
                }

        async with db_manager.session() as session:
            result_all = await session.execute(select(StockBasic.code))
            all_codes = [row[0] for row in result_all.fetchall()]

        records = []
        for code in all_codes:
            csrc_info = csrc_mapping.get(code, {})
            sw_one_info = sw_one_mapping.get(code, {})
            sw_three_info = sw_three_mapping.get(code, {})

            records.append(
                {
                    "code": code,
                    "industry_csrc": csrc_info.get("industry_csrc"),
                    "industry_csrc_code": csrc_info.get("industry_csrc_code"),
                    "industry_ths": ths_mapping.get(code),
                    "industry_sw_one": sw_one_info.get("industry_sw_one"),
                    "industry_sw_one_code": sw_one_info.get("industry_sw_one_code"),
                    "industry_sw_three": sw_three_info.get("industry_sw_three"),
                    "industry_sw_three_code": sw_three_info.get("industry_sw_three_code"),
                }
            )

        if records:
            async with db_manager.session() as session:
                await batch_update(session, StockIndustry, records, id_field="code")

        result.status = "completed"
        result.total_count = len(records)
        result.processed_count = len(records)
        result.finished_at = datetime.utcnow()

        checkpoint_manager = CheckpointManager()
        checkpoint_manager.save_checkpoint(
            "industry",
            {
                "task_id": task_id,
                "synced_at": datetime.utcnow().isoformat(),
                "total_count": len(records),
            },
        )

        logger.info(
            "Industry classification sync completed",
            extra={
                "sync_type": "industry",
                "task_id": task_id,
                "total": len(records),
            },
        )

    except Exception as e:
        result.status = "failed"
        result.error_message = str(e)
        result.finished_at = datetime.utcnow()
        logger.error(
            f"Industry classification sync failed: {e}",
            extra={
                "sync_type": "industry",
                "task_id": task_id,
            },
        )

    return result


if __name__ == "__main__":
    import sys

    force = "--force" in sys.argv
    result = asyncio.run(sync_industry_class(force=force))
    print(f"Sync result: {result.status}, processed: {result.processed_count}/{result.total_count}")
