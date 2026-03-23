from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Period(str, Enum):
    ANNUAL = "annual"
    QUARTERLY = "quarterly"
    TTM = "ttm"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class CompanyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELISTED = "DELISTED"


class RiskFlag(str, Enum):
    NORMAL = "NORMAL"
    ST = "ST"
    STAR_ST = "STAR_ST"
    DELISTING_RISK = "DELISTING_RISK"


class Condition(BaseModel):
    metric: str = Field(..., description="Metric identifier")
    operator: str = Field(..., description="Comparison operator (>, <, >=, <=, ==, !=)")
    value: float = Field(..., description="Value to compare against")
    period: Period = Field(default=Period.ANNUAL, description="Data period type")
    years: Optional[int] = Field(default=None, description="Number of years for comparison")


class ScreenRequest(BaseModel):
    conditions: list[Condition] = Field(default_factory=list, description="List of screening conditions")
    sort_by: Optional[str] = Field(default=None, description="Metric to sort by")
    order: SortOrder = Field(default=SortOrder.DESC, description="Sort order")
    limit: int = Field(default=50, ge=1, le=500, description="Results limit")
    page: int = Field(default=1, ge=1, description="Page number")
    industry: Optional[str] = Field(default=None, description="Industry filter")


class CompanyInfo(BaseModel):
    code: str
    name: str
    status: CompanyStatus
    risk_flag: RiskFlag
    industry: Optional[str] = None


class ScreenResponse(BaseModel):
    companies: list[CompanyInfo] = Field(default_factory=list)
    total: int = Field(default=0, description="Total matching companies")


class CompanyDetailResponse(BaseModel):
    code: str = Field(..., description="Stock code")
    name: str = Field(..., description="Company name")
    industry: Optional[str] = Field(default=None, description="Industry classification")
    status: CompanyStatus = Field(default=CompanyStatus.ACTIVE)
    risk_flag: RiskFlag = Field(default=RiskFlag.NORMAL)
    metrics: dict = Field(default_factory=dict, description="Financial metrics dictionary")


class MetricInfo(BaseModel):
    id: str = Field(..., description="Metric identifier")
    name: str = Field(..., description="Metric display name")
    category: str = Field(..., description="Metric category")


class MetricsListResponse(BaseModel):
    metrics: list[MetricInfo] = Field(default_factory=list, description="List of available metrics")


class SaveScreenRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Screen name")
    conditions: list[Condition] = Field(default_factory=list, description="Screen conditions")


class SavedScreen(BaseModel):
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Screen name")
    conditions: list[Condition] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")


class FinancialMetric(BaseModel):
    id: str = Field(..., description="Metric identifier")
    name: str = Field(..., description="Metric display name")
    formula: Optional[str] = Field(default=None, description="Calculation formula")
    category: str = Field(..., description="Metric category")
