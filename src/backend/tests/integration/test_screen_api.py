import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock

from main import app
from app.core.redis import RedisManager


class TestScreenAPIIntegration:
    """Integration tests for screen API endpoints.

    These tests verify the screen API endpoint behavior using mocked
    financial service methods to avoid hitting real databases or akshare.
    """

    @pytest.fixture
    def mock_redis_client(self):
        """Create a mock Redis client for integration tests."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=None)
        mock_client.set = AsyncMock(return_value=True)
        mock_client.setex = AsyncMock(return_value=True)
        mock_client.delete = AsyncMock(return_value=1)
        mock_client.exists = AsyncMock(return_value=False)
        mock_client.close = AsyncMock()
        return mock_client

    @pytest.fixture
    def sample_company(self):
        """Sample company data for testing."""
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
            },
            "available_years": 5,
        }

    @pytest.mark.asyncio
    async def test_screen_companies_empty_conditions(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with empty conditions returns companies from service."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={"conditions": [], "limit": 50},
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data
        assert data["total"] == 1

    @pytest.mark.asyncio
    async def test_screen_companies_with_metric_condition(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with a single metric condition."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data
        assert data["total"] == 1

    @pytest.mark.asyncio
    async def test_screen_companies_no_results(self, mock_redis_client):
        """Test POST /screen endpoint when no companies match conditions."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [],
            "total": 0,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 100,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert data["companies"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_screen_companies_with_st_exclusion(self, mock_redis_client):
        """Test POST /screen endpoint excludes ST companies when include_st is False."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [],
            "total": 0,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "include_st": False,
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data

    @pytest.mark.asyncio
    async def test_screen_companies_with_industry_filter(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with industry filter."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "industry": "银行",
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_screen_companies_with_pagination(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with pagination parameters."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 100,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "limit": 10,
                            "page": 1,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_screen_companies_with_sorting(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with sorting parameters."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "sort_by": "roe",
                            "order": "desc",
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_screen_companies_profit_only(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with profit_only filter."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "profit_only": True,
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_screen_companies_require_complete_data(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with require_complete_data filter."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                }
                            ],
                            "require_complete_data": True,
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_screen_companies_with_and_logic(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with AND logic for multiple conditions."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 10,
                                    "period": "annual",
                                    "years": 5,
                                },
                                {
                                    "metric": "roi",
                                    "operator": ">",
                                    "value": 5,
                                    "period": "annual",
                                    "years": 5,
                                },
                            ],
                            "logic": "and",
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data

    @pytest.mark.asyncio
    async def test_screen_companies_with_or_logic(self, mock_redis_client, sample_company):
        """Test POST /screen endpoint with OR logic for multiple conditions."""
        from app.services.financial import financial_service

        mock_result = {
            "companies": [sample_company],
            "total": 1,
        }

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(
                financial_service,
                "screen_companies",
                new_callable=AsyncMock,
                return_value=mock_result,
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/screen",
                        json={
                            "conditions": [
                                {
                                    "metric": "roe",
                                    "operator": ">",
                                    "value": 50,
                                    "period": "annual",
                                    "years": 5,
                                },
                                {
                                    "metric": "roi",
                                    "operator": ">",
                                    "value": 5,
                                    "period": "annual",
                                    "years": 5,
                                },
                            ],
                            "logic": "or",
                            "limit": 50,
                        },
                    )
        assert response.status_code == 200
        data = response.json()
        assert "companies" in data


class TestScreenSaveAPIIntegration:
    """Integration tests for screen save API endpoints."""

    @pytest.fixture
    def mock_redis_client(self):
        """Create a mock Redis client for integration tests."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=None)
        mock_client.set = AsyncMock(return_value=True)
        mock_client.setex = AsyncMock(return_value=True)
        mock_client.delete = AsyncMock(return_value=1)
        mock_client.exists = AsyncMock(return_value=False)
        mock_client.close = AsyncMock()
        return mock_client

    @pytest.mark.asyncio
    async def test_save_screen_conditions(self, mock_redis_client):
        """Test POST /screen/save endpoint saves conditions to Redis."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "get_json", return_value=None):
                with patch.object(RedisManager, "set_json", new_callable=AsyncMock):
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        response = await client.post(
                            "/api/v1/screen/save",
                            json={
                                "name": "高ROI公司",
                                "conditions": [{"metric": "roi", "operator": ">", "value": 15}],
                            },
                        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "高ROI公司"
        assert len(data["conditions"]) == 1

    @pytest.mark.asyncio
    async def test_get_saved_screens_empty(self, mock_redis_client):
        """Test GET /screen/saved endpoint with no saved screens."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "get_json", return_value=None):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/screen/saved")
        assert response.status_code == 200
        data = response.json()
        assert data == []

    @pytest.mark.asyncio
    async def test_get_saved_screens_with_data(self, mock_redis_client):
        """Test GET /screen/saved endpoint with saved screens."""
        saved_screens_index = [
            {"id": "uuid-1", "name": "高ROI公司"},
            {"id": "uuid-2", "name": "低负债公司"},
        ]
        saved_screen_1 = {
            "id": "uuid-1",
            "name": "高ROI公司",
            "conditions": [],
            "created_at": "2024-01-01T00:00:00",
        }
        saved_screen_2 = {
            "id": "uuid-2",
            "name": "低负债公司",
            "conditions": [],
            "created_at": "2024-01-02T00:00:00",
        }

        async def get_json_side_effect(key):
            if key == "saved_screens:index":
                return saved_screens_index
            elif key == "saved_screen:uuid-1":
                return saved_screen_1
            elif key == "saved_screen:uuid-2":
                return saved_screen_2
            return None

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "get_json", side_effect=get_json_side_effect):
                with patch.object(RedisManager, "set_json", new_callable=AsyncMock):
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        response = await client.get("/api/v1/screen/saved")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_delete_saved_screen_success(self, mock_redis_client):
        """Test DELETE /screen/saved/{screen_id} endpoint."""
        saved_screens = [{"id": "uuid-1", "name": "高ROI公司"}]
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "get_json", return_value=saved_screens):
                with patch.object(RedisManager, "set_json", new_callable=AsyncMock):
                    with patch.object(RedisManager, "delete", new_callable=AsyncMock):
                        transport = ASGITransport(app=app)
                        async with AsyncClient(
                            transport=transport, base_url="http://test"
                        ) as client:
                            response = await client.delete("/api/v1/screen/saved/uuid-1")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is True

    @pytest.mark.asyncio
    async def test_delete_saved_screen_not_found(self, mock_redis_client):
        """Test DELETE /screen/saved/{screen_id} with non-existent ID."""
        saved_screens = [{"id": "uuid-1", "name": "高ROI公司"}]
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "get_json", return_value=saved_screens):
                with patch.object(RedisManager, "set_json", new_callable=AsyncMock):
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        response = await client.delete("/api/v1/screen/saved/uuid-999")
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is False
