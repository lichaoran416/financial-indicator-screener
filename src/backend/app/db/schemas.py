from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class StockBasicSchema(BaseModel):
    code: str
    name: str
    list_date: Optional[datetime] = None
    market_type: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class StockIndustrySchema(BaseModel):
    code: str
    industry_csrc: Optional[str] = None
    industry_csrc_code: Optional[str] = None
    industry_ths: Optional[str] = None
    industry_sw_one: Optional[str] = None
    industry_sw_one_code: Optional[str] = None
    industry_sw_three: Optional[str] = None
    industry_sw_three_code: Optional[str] = None

    model_config = {"from_attributes": True}


class AccountingItemSchema(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    report_type: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None

    model_config = {"from_attributes": True}


class AccountingDataSchema(BaseModel):
    id: int
    code: str
    report_date: datetime
    report_type: str
    item_code: str
    item_value: Optional[float] = None

    model_config = {"from_attributes": True}


class SyncStatusHistorySchema(BaseModel):
    id: int
    task_id: str
    sync_type: str
    status: str
    industry_sw_three: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    total_count: int = 0
    processed_count: int = 0
    failed_count: int = 0
    failed_codes: Optional[str] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class IndustrySyncStatusSchema(BaseModel):
    id: int
    industry_sw_three: str
    industry_sw_three_code: Optional[str] = None
    sync_type: str
    last_sync_at: Optional[datetime] = None
    record_count: int = 0

    model_config = {"from_attributes": True}


class SyncTriggerRequest(BaseModel):
    sync_type: str = Field(..., description="Sync type: financial, basic, industry, or all")
    industry_sw_three: Optional[str] = Field(
        None, description="Optional: filter by specific SW3 industry"
    )


class SyncTriggerResponse(BaseModel):
    status: str
    task_id: str
    message: Optional[str] = None


class SyncStatusResponse(BaseModel):
    tasks: list[SyncStatusHistorySchema]
    industries: list[IndustrySyncStatusSchema]
    total_tasks: int


class AccountingItemListResponse(BaseModel):
    items: list[AccountingItemSchema]
    total_count: int
