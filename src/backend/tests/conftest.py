import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.redis import RedisManager


@pytest.fixture
def mock_redis():
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=None)
    mock_client.set = AsyncMock()
    mock_client.setex = AsyncMock()
    mock_client.delete = AsyncMock()
    mock_client.exists = AsyncMock(return_value=False)
    mock_client.close = AsyncMock()

    with patch.object(RedisManager, "_client", mock_client):
        yield mock_client


@pytest.fixture
def sample_company_data():
    return {
        "code": "000001",
        "name": "平安银行",
        "status": "ACTIVE",
        "risk_flag": "NORMAL",
        "industry": "银行",
        "metrics": {
            "roe": 12.5,
            "roi": 8.3,
            "gross_margin": 45.2,
            "debt_ratio": 92.1,
            "pe": 6.5,
            "pb": 0.8,
        },
    }


@pytest.fixture
def sample_financial_data():
    return {
        "income": {
            "营业总收入": [100000, 95000],
            "营业收入": [100000, 95000],
            "营业成本": [55000, 52000],
            "净利润": [15000, 14500],
            "归属母公司净利润": [14500, 13500],
        },
        "balance": {
            "资产合计": [500000, 480000],
            "所有者权益合计": [60000, 58000],
            "股东权益": [60000, 58000],
            "负债合计": [440000, 422000],
            "总负债": [440000, 422000],
            "流动资产合计": [150000, 145000],
            "流动负债合计": [120000, 115000],
        },
        "metrics": {
            "market_cap": 200000,
        },
    }
