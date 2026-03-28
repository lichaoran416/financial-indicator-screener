import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

import akshare as ak
import pandas as pd
from sqlalchemy import select, delete

from app.db.database import db_manager
from app.db.models import StockBasic, FinancialIndicator
from scripts.utils.db_utils import batch_insert
from scripts.utils.checkpoint import CheckpointManager
from scripts.utils.logger import setup_sync_logger

logger = setup_sync_logger("sync_financial_indicators")


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
    industry_sw_three: Optional[str] = None


INDICATOR_COLUMNS = [
    "roe",
    "roic",
    "roi",
    "gross_profit_margin",
    "net_profit_growth",
    "revenue_growth",
    "debt_ratio",
    "current_ratio",
    "quick_ratio",
    "eps",
    "bps",
    "operating_cash_flow_per_share",
    "net_margin",
]


def map_akshare_to_indicator_columns(df: pd.DataFrame) -> dict[str, str]:
    column_mapping = {}
    for col in df.columns:
        col_lower = col.lower()
        if "净资产收益率" in col or "roe" in col_lower:
            column_mapping[col] = "roe"
        elif "投入资本回报率" in col or "roic" in col_lower:
            column_mapping[col] = "roic"
        elif "投资回报率" in col and "投入资本" not in col:
            column_mapping[col] = "roi"
        elif "毛利率" in col or "gross_profit_margin" in col_lower:
            column_mapping[col] = "gross_profit_margin"
        elif "净利润增长率" in col or ("净利润" in col and "增长" in col):
            column_mapping[col] = "net_profit_growth"
        elif "营收增长率" in col or "营业收入增长率" in col or ("revenue" in col_lower and "grow" in col_lower):
            column_mapping[col] = "revenue_growth"
        elif "资产负债率" in col:
            column_mapping[col] = "debt_ratio"
        elif "流动比率" in col:
            column_mapping[col] = "current_ratio"
        elif "速动比率" in col:
            column_mapping[col] = "quick_ratio"
        elif "每股收益" in col or "eps" in col_lower:
            column_mapping[col] = "eps"
        elif "每股净资产" in col or "bps" in col_lower:
            column_mapping[col] = "bps"
        elif "每股经营现金流" in col:
            column_mapping[col] = "operating_cash_flow_per_share"
        elif "净利率" in col or "net_margin" in col_lower:
            column_mapping[col] = "net_margin"
    return column_mapping


async def sync_financial_indicators(code: str, force: bool = False) -> SyncResult:
    task_id = str(uuid.uuid4())
    result = SyncResult(task_id=task_id, sync_type="financial_indicator", status="running")

    logger.info(
        f"Starting financial indicators sync for {code}",
        extra={
            "sync_type": "financial_indicator",
            "code": code,
            "task_id": task_id,
        },
    )

    try:
        end_year = pd.Timestamp.now().year
        start_year = end_year - 10

        df = await asyncio.get_event_loop().run_in_executor(
            None, ak.stock_financial_analysis_indicator, code, start_year, end_year
        )

        if df is None or df.empty:
            result.status = "completed"
            result.total_count = 0
            result.processed_count = 0
            result.finished_at = datetime.utcnow()
            return result

        column_mapping = map_akshare_to_indicator_columns(df)

        if "报告日期" not in df.columns:
            result.status = "completed"
            result.total_count = 0
            result.processed_count = 0
            result.finished_at = datetime.utcnow()
            return result

        all_data = []

        for idx in range(len(df)):
            report_date = df.iloc[idx]["报告日期"]

            if isinstance(report_date, str):
                report_date = datetime.strptime(report_date, "%Y-%m-%d")
            elif not isinstance(report_date, datetime):
                if pd.notna(report_date):
                    report_date = pd.to_datetime(report_date)
                else:
                    continue

            record: dict[str, any] = {
                "code": code,
                "report_date": report_date,
            }

            for akshare_col, indicator_col in column_mapping.items():
                value = df.iloc[idx].get(akshare_col)
                if value is not None and pd.notna(value):
                    try:
                        record[indicator_col] = float(value)
                    except (ValueError, TypeError):
                        pass

            all_data.append(record)

        if all_data:
            async with db_manager.session() as session:
                if force:
                    await session.execute(
                        delete(FinancialIndicator).where(FinancialIndicator.code == code)
                    )

                await batch_insert(session, FinancialIndicator, all_data)

        result.status = "completed"
        result.total_count = len(all_data)
        result.processed_count = len(all_data)
        result.finished_at = datetime.utcnow()

        logger.info(
            f"Financial indicators sync completed for {code}",
            extra={
                "sync_type": "financial_indicator",
                "code": code,
                "task_id": task_id,
                "records": len(all_data),
            },
        )

    except Exception as e:
        result.status = "failed"
        result.error_message = str(e)
        result.failed_codes = [code]
        result.finished_at = datetime.utcnow()
        logger.error(
            f"Financial indicators sync failed for {code}: {e}",
            extra={
                "sync_type": "financial_indicator",
                "code": code,
                "task_id": task_id,
            },
        )

    return result


async def sync_all(force: bool = False) -> list[SyncResult]:
    results = []

    await db_manager.init("postgresql+asyncpg://stock_user:stock_pass@localhost:5432/stock_db")

    async with db_manager.session() as session:
        result = await session.execute(select(StockBasic.code).where(StockBasic.is_active))
        codes = [row[0] for row in result.fetchall()]

    logger.info(f"Starting financial indicators sync for {len(codes)} stocks")

    checkpoint_manager = CheckpointManager()
    checkpoint_data = None if force else checkpoint_manager.get_latest_checkpoint("financial_indicator")
    last_synced_codes = set()
    if checkpoint_data and "synced_codes" in checkpoint_data:
        last_synced_codes = set(checkpoint_data["synced_codes"])

    for i, code in enumerate(codes):
        if not force and code in last_synced_codes:
            continue

        result = await sync_financial_indicators(code, force)
        results.append(result)

        if (i + 1) % 100 == 0:
            logger.info(
                f"Progress: {i + 1}/{len(codes)}",
                extra={
                    "sync_type": "financial_indicator",
                    "progress": f"{i + 1}/{len(codes)}",
                },
            )

        if (i + 1) % 10 == 0:
            checkpoint_manager.save_checkpoint(
                "financial_indicator",
                {
                    "synced_codes": list(last_synced_codes | {r.task_id for r in results if r.status == "completed"}),
                    "synced_at": datetime.utcnow().isoformat(),
                },
            )

    checkpoint_manager.save_checkpoint(
        "financial_indicator",
        {
            "synced_codes": list(
                last_synced_codes | {r.task_id for r in results if r.status == "completed"}
            ),
            "synced_at": datetime.utcnow().isoformat(),
        },
    )

    return results


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        results = asyncio.run(sync_all())
        print(f"Sync completed: {len(results)} stocks processed")
    else:
        code = sys.argv[1] if len(sys.argv) > 1 else "000001"
        result = asyncio.run(sync_financial_indicators(code))
        print(f"Sync result for {code}: {result.status}, records: {result.processed_count}")
