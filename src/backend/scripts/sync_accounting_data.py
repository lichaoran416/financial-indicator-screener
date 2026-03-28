import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

import akshare as ak
from sqlalchemy import select

from app.db.database import db_manager
from app.db.models import (
    StockBasic,
    StockIndustry,
    AccountingItem,
    AccountingData,
)
from scripts.utils.db_utils import batch_insert
from scripts.utils.checkpoint import CheckpointManager
from scripts.utils.logger import setup_sync_logger

logger = setup_sync_logger("sync_accounting_data")


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


ITEM_NAME_TO_CODE = {
    "净利润": "net_profit",
    "营业收入": "revenue",
    "营业成本": "operating_cost",
    "总资产": "total_assets",
    "总负债": "total_liabilities",
    "净资产": "total_equity",
    "加权平均净资产收益率": "roe",
    "投入资本回报率": "roic",
    "销售毛利率": "gross_margin",
    "销售净利率": "net_margin",
    "资产负债率": "debt_ratio",
    "流动比率": "current_ratio",
    "速动比率": "quick_ratio",
    "存货周转率": "inventory_turnover",
    "应收账款周转率": "accounts_receivable_turnover",
    "总资产周转率": "total_assets_turnover",
    "经营活动现金流净额": "operating_cash_flow",
    "投资活动现金流净额": "investing_cash_flow",
    "筹资活动现金流净额": "financing_cash_flow",
    "资本开支": "capital_expenditure",
    "研发支出": "rd_expenditure",
    "每股收益": "eps",
    "每股净资产": "bps",
    "每股经营现金流": "operating_cash_flow_per_share",
}


def get_report_type_from_df_columns(columns: list[str]) -> str:
    if any("利润表" in col for col in columns):
        return "profit"
    elif any("资产负债表" in col for col in columns):
        return "balance"
    elif any("现金流量表" in col for col in columns):
        return "cashflow"
    return "unknown"


async def sync_accounting_data(code: str, force: bool = False) -> SyncResult:
    task_id = str(uuid.uuid4())
    result = SyncResult(task_id=task_id, sync_type="financial", status="running")

    logger.info(
        f"Starting accounting data sync for {code}",
        extra={
            "sync_type": "financial",
            "code": code,
            "task_id": task_id,
        },
    )

    try:
        async with db_manager.session() as session:
            profit_df = ak.stock_profit_sheet_by_report_em(symbol=code)
            balance_df = ak.stock_balance_sheet_by_report_em(symbol=code)
            cashflow_df = ak.stock_cashflow_sheet_by_report_em(symbol=code)

        all_data = []

        for df, report_type in [
            (profit_df, "profit"),
            (balance_df, "balance"),
            (cashflow_df, "cashflow"),
        ]:
            if df is None or df.empty:
                continue

            for col in df.columns:
                if col in ["股票代码", "报告日期"]:
                    continue

                item_code = ITEM_NAME_TO_CODE.get(col)
                if not item_code:
                    item_code = f"item_{hash(col) % 100000}"

                async with db_manager.session() as session:
                    existing = await session.execute(
                        select(AccountingItem).where(AccountingItem.code == item_code)
                    )
                    if not existing.scalar_one_or_none():
                        item = AccountingItem(
                            code=item_code,
                            name=col,
                            category=None,
                            report_type=report_type,
                        )
                        session.add(item)

            for idx, row in df.iterrows():
                report_date = row.get("报告日期")
                if report_date is None:
                    continue

                if isinstance(report_date, str):
                    report_date = datetime.strptime(report_date, "%Y-%m-%d")
                elif not isinstance(report_date, datetime):
                    continue

                for col in df.columns:
                    if col in ["股票代码", "报告日期"]:
                        continue

                    item_code = ITEM_NAME_TO_CODE.get(col)
                    if not item_code:
                        item_code = f"item_{hash(col) % 100000}"

                    value = row.get(col)
                    if value is not None:
                        try:
                            value = float(value)
                        except (ValueError, TypeError):
                            continue

                    all_data.append(
                        {
                            "code": code,
                            "report_date": report_date,
                            "report_type": report_type,
                            "item_code": item_code,
                            "item_value": value,
                        }
                    )

        if all_data:
            async with db_manager.session() as session:
                await batch_insert(session, AccountingData, all_data)

        result.status = "completed"
        result.total_count = len(all_data)
        result.processed_count = len(all_data)
        result.finished_at = datetime.utcnow()

        logger.info(
            f"Accounting data sync completed for {code}",
            extra={
                "sync_type": "financial",
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
            f"Accounting data sync failed for {code}: {e}",
            extra={
                "sync_type": "financial",
                "code": code,
                "task_id": task_id,
            },
        )

    return result


async def sync_all(
    force: bool = False, industry_sw_three: Optional[str] = None
) -> list[SyncResult]:
    results = []

    await db_manager.init("postgresql+asyncpg://stock_user:stock_pass@localhost:5432/stock_db")

    async with db_manager.session() as session:
        query = select(StockBasic.code).where(StockBasic.is_active)
        if industry_sw_three:
            query = query.join(StockIndustry).where(
                StockIndustry.industry_sw_three == industry_sw_three
            )
        query_result = await session.execute(query)
        codes = [row[0] for row in query_result.fetchall()]

    logger.info(f"Starting accounting data sync for {len(codes)} stocks")

    checkpoint_manager = CheckpointManager()
    checkpoint_data = None if force else checkpoint_manager.get_latest_checkpoint("accounting")
    last_synced_codes = set()
    if checkpoint_data and "synced_codes" in checkpoint_data:
        last_synced_codes = set(checkpoint_data["synced_codes"])

    for i, code in enumerate(codes):
        if not force and code in last_synced_codes:
            continue

        result = await sync_accounting_data(code, force)
        results.append(result)

        if (i + 1) % 100 == 0:
            logger.info(
                f"Progress: {i + 1}/{len(codes)}",
                extra={
                    "sync_type": "financial",
                    "progress": f"{i + 1}/{len(codes)}",
                },
            )

    checkpoint_manager.save_checkpoint(
        "accounting",
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
        result = asyncio.run(sync_accounting_data(code))
        print(f"Sync result for {code}: {result.status}, records: {result.processed_count}")
