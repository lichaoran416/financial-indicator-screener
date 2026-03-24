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
    metric: Optional[str] = Field(default=None, description="Metric identifier (use metric OR formula, not both)")
    formula: Optional[str] = Field(default=None, description="Custom formula expression (e.g., 'roe / roi')")
    operator: str = Field(..., description="Comparison operator (>, <, >=, <=, ==, !=, between)")
    value: float = Field(..., description="Value to compare against")
    value2: Optional[float] = Field(default=None, description="Second value for between operator")
    period: Period = Field(default=Period.ANNUAL, description="Data period type")
    years: Optional[int] = Field(default=None, description="Number of years for comparison")


class ScreenRequest(BaseModel):
    conditions: list[Condition] = Field(
        default_factory=list, description="List of screening conditions"
    )
    sort_by: Optional[str] = Field(default=None, description="Primary metric to sort by")
    order: SortOrder = Field(default=SortOrder.DESC, description="Primary sort order")
    sort_by_2: Optional[str] = Field(default=None, description="Secondary metric to sort by")
    order_2: SortOrder = Field(default=SortOrder.DESC, description="Secondary sort order")
    limit: int = Field(default=100, ge=1, le=500, description="Results limit")
    page: int = Field(default=1, ge=1, description="Page number")
    industry: Optional[str] = Field(default=None, description="Industry filter (partial match)")
    exclude_industry: Optional[str] = Field(
        default=None, description="Industry to exclude (partial match)"
    )
    industries: Optional[list[str]] = Field(
        default=None, description="Multiple industries to include (OR logic)"
    )
    exclude_industries: Optional[list[str]] = Field(
        default=None, description="Multiple industries to exclude"
    )
    include_suspended: bool = Field(
        default=False, description="Include suspended/delisted companies (JTB-007)"
    )
    profit_only: bool = Field(
        default=False, description="Filter to profit-making companies only (JTB-008)"
    )
    include_st: bool = Field(default=True, description="Include ST/*ST stocks (JTB-009)")
    require_complete_data: bool = Field(
        default=False, description="Require complete data for all periods (JTB-010)"
    )


class CompanyInfo(BaseModel):
    code: str
    name: str
    status: CompanyStatus
    risk_flag: RiskFlag
    industry: Optional[str] = None
    metrics: dict = Field(default_factory=dict, description="Financial metrics dictionary")
    available_years: int = Field(
        default=0, description="Number of years with available data out of requested years"
    )


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


class IndustryClassification(BaseModel):
    code: str = Field(..., description="Industry code")
    name: str = Field(..., description="Industry name")
    level: str = Field(..., description="Industry level (1, 2, 3)")


class PeerComparisonRequest(BaseModel):
    code: str = Field(..., description="Stock code")
    industry_type: str = Field(
        default="csrc", description="Industry classification type: csrc, sw1, sw3"
    )
    metrics: list[str] = Field(default_factory=list, description="Metrics to compare")


class PeerMetric(BaseModel):
    metric: str = Field(..., description="Metric identifier")
    value: Optional[float] = Field(default=None, description="Metric value")
    industry_avg: Optional[float] = Field(default=None, description="Industry average")
    industry_median: Optional[float] = Field(default=None, description="Industry median")
    percentile: Optional[float] = Field(
        default=None, description="Percentile rank in industry (0-100)"
    )


class PeerComparisonResponse(BaseModel):
    code: str = Field(..., description="Stock code")
    name: str = Field(..., description="Company name")
    industry: str = Field(..., description="Industry name")
    peers_count: int = Field(..., description="Number of peers in industry")
    metrics: list[PeerMetric] = Field(default_factory=list, description="Comparison metrics")


class TrendComparisonRequest(BaseModel):
    codes: list[str] = Field(
        ..., min_length=1, max_length=10, description="List of stock codes (1-10 companies)"
    )
    metrics: list[str] = Field(
        ...,
        min_length=1,
        max_length=2,
        description="List of metrics to compare (1-2 metrics for dual Y-axis)",
    )
    period: Period = Field(default=Period.ANNUAL, description="Data period type")
    years: int = Field(default=5, ge=1, le=10, description="Number of years of history")


class MetricTrendPoint(BaseModel):
    date: str = Field(..., description="Date/period label")
    value: Optional[float] = Field(default=None, description="Metric value")


class MetricTrendData(BaseModel):
    metric: str = Field(..., description="Metric identifier")
    data: list[MetricTrendPoint] = Field(
        default_factory=list, description="Time series data points"
    )


class CompanyTrendData(BaseModel):
    code: str = Field(..., description="Stock code")
    name: str = Field(..., description="Company name")
    trends: list[MetricTrendData] = Field(
        default_factory=list, description="Trend data for each metric"
    )


class TrendComparisonResponse(BaseModel):
    companies: list[CompanyTrendData] = Field(
        default_factory=list, description="Trend data for each company"
    )
    period: str = Field(..., description="Period type used")
    years: int = Field(..., description="Number of years of data")
