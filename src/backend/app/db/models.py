from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class StockBasic(Base):
    __tablename__ = "stock_basic"

    code = Column(String(10), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    list_date = Column(DateTime, nullable=True)
    market_type = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    industries = relationship("StockIndustry", back_populates="stock", uselist=False)
    accounting_data = relationship("AccountingData", back_populates="stock")

    __table_args__ = (
        Index("ix_stock_basic_market_type", "market_type"),
        Index("ix_stock_basic_is_active", "is_active"),
    )


class StockIndustry(Base):
    __tablename__ = "stock_industry"

    code = Column(String(10), ForeignKey("stock_basic.code", ondelete="CASCADE"), primary_key=True)
    industry_csrc = Column(String(100), nullable=True, index=True)
    industry_csrc_code = Column(String(20), nullable=True)
    industry_ths = Column(String(100), nullable=True, index=True)
    industry_sw_one = Column(String(100), nullable=True, index=True)
    industry_sw_one_code = Column(String(20), nullable=True)
    industry_sw_three = Column(String(100), nullable=True, index=True)
    industry_sw_three_code = Column(String(20), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    stock = relationship("StockBasic", back_populates="industries")

    __table_args__ = (Index("ix_stock_industry_sw_three_code", "industry_sw_three_code"),)


class AccountingItem(Base):
    __tablename__ = "accounting_items"

    code = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=True, index=True)
    report_type = Column(String(20), nullable=True, index=True)
    description = Column(Text, nullable=True)
    unit = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accounting_data = relationship("AccountingData", back_populates="item")

    __table_args__ = (
        Index("ix_accounting_items_category", "category"),
        Index("ix_accounting_items_report_type", "report_type"),
        UniqueConstraint("code", name="uq_accounting_item_code"),
    )


class AccountingData(Base):
    __tablename__ = "accounting_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(
        String(10), ForeignKey("stock_basic.code", ondelete="CASCADE"), nullable=False, index=True
    )
    report_date = Column(DateTime, nullable=False, index=True)
    report_type = Column(String(20), nullable=False, index=True)
    item_code = Column(
        String(50),
        ForeignKey("accounting_items.code", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_value = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    stock = relationship("StockBasic", back_populates="accounting_data")
    item = relationship("AccountingItem", back_populates="accounting_data")

    __table_args__ = (
        Index("ix_accounting_data_code_report", "code", "report_date"),
        Index("ix_accounting_data_code_item", "code", "item_code"),
        Index("ix_accounting_data_report_type", "report_type"),
    )


class SyncStatusHistory(Base):
    __tablename__ = "sync_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), unique=True, nullable=False, index=True)
    sync_type = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    industry_sw_three = Column(String(100), nullable=True, index=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    total_count = Column(Integer, default=0)
    processed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    failed_codes = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_sync_status_history_sync_type", "sync_type"),
        Index("ix_sync_status_history_status", "status"),
        Index("ix_sync_status_history_started_at", "started_at"),
    )


class IndustrySyncStatus(Base):
    __tablename__ = "industry_sync_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    industry_sw_three = Column(String(100), nullable=False, index=True)
    industry_sw_three_code = Column(String(20), nullable=True)
    sync_type = Column(String(20), nullable=False, index=True)
    last_sync_at = Column(DateTime, nullable=True)
    record_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("industry_sw_three", "sync_type", name="uq_industry_sync_status"),
        Index("ix_industry_sync_status_sync_type", "sync_type"),
    )
