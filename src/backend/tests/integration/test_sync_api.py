import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock, PropertyMock

from main import app
from app.core.redis import RedisManager


class TestSyncAPIIntegration:
    """Integration tests for sync API endpoints."""

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
    def mock_db_session(self):
        """Create a mock database session."""
        mock_session = MagicMock()
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.rollback = MagicMock()
        mock_session.close = MagicMock()
        return mock_session

    @pytest.fixture
    def mock_db_manager(self, mock_db_session):
        """Mock the database manager."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db_session)
        mock_context.__aexit__ = AsyncMock(return_value=None)

        mock_db_manager = MagicMock()
        mock_db_manager.session = PropertyMock(return_value=mock_context)
        return mock_db_manager

    @pytest.fixture
    def mock_run_sync_task(self):
        """Mock the run_sync_task function to prevent actual sync execution."""
        with patch("app.api.v1.endpoints.sync.run_sync_task", new_callable=AsyncMock) as mock_task:
            yield mock_task

    @pytest.mark.asyncio
    async def test_trigger_sync_financial(
        self, mock_db_manager, mock_redis_client, mock_run_sync_task
    ):
        """Test POST /sync/trigger endpoint with financial sync type."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/sync/trigger",
                        json={"sync_type": "financial"},
                    )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert "task_id" in data
        assert data["message"] == "Sync task financial submitted successfully"

    @pytest.mark.asyncio
    async def test_trigger_sync_basic(self, mock_db_manager, mock_redis_client, mock_run_sync_task):
        """Test POST /sync/trigger endpoint with basic sync type."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/sync/trigger",
                        json={"sync_type": "basic"},
                    )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert "task_id" in data

    @pytest.mark.asyncio
    async def test_trigger_sync_industry(
        self, mock_db_manager, mock_redis_client, mock_run_sync_task
    ):
        """Test POST /sync/trigger endpoint with industry sync type."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/sync/trigger",
                        json={"sync_type": "industry"},
                    )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_trigger_sync_all(self, mock_db_manager, mock_redis_client, mock_run_sync_task):
        """Test POST /sync/trigger endpoint with all sync type."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/sync/trigger",
                        json={"sync_type": "all", "industry_sw_three": "银行"},
                    )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_trigger_sync_invalid_type(
        self, mock_db_manager, mock_redis_client, mock_run_sync_task
    ):
        """Test POST /sync/trigger with invalid sync type."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/sync/trigger",
                        json={"sync_type": "invalid_type"},
                    )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid sync_type" in data["detail"]

    @pytest.mark.asyncio
    async def test_get_sync_status_empty(self, mock_db_manager, mock_redis_client):
        """Test GET /sync/status endpoint with no sync history."""
        mock_db_session = mock_db_manager.session().__aenter__.return_value
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        mock_result_industry = MagicMock()
        mock_result_industry.scalars.return_value.all.return_value = []
        mock_db_session.execute.side_effect = [mock_result, mock_result_industry]

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/sync/status")
        assert response.status_code == 200
        data = response.json()
        assert "last_sync" in data

    @pytest.mark.asyncio
    async def test_get_sync_status_with_industry_filter(self, mock_db_manager, mock_redis_client):
        """Test GET /sync/status endpoint with industry_sw_three filter."""
        mock_db_session = mock_db_manager.session().__aenter__.return_value
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        mock_result_industry = MagicMock()
        mock_result_industry.scalars.return_value.all.return_value = []
        mock_db_session.execute.side_effect = [mock_result, mock_result_industry]

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.sync.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/sync/status?industry_sw_three=银行")
        assert response.status_code == 200
        data = response.json()
        assert "last_sync" in data


class TestAccountingAPIIntegration:
    """Integration tests for accounting API endpoints."""

    @pytest.fixture
    def mock_redis_client(self):
        """Create a mock Redis client for integration tests."""
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=None)
        mock_client.set = AsyncMock(return_value=True)
        mock_client.setex = AsyncMock(return_value=True)
        mock_client.delete = AsyncMock(return_value=1)
        mock_client.exists = AsyncMock(return_value=False)
        mock_client.close = AsyncMock()
        return mock_client

    @pytest.fixture
    def mock_accounting_items(self):
        """Sample accounting items for testing."""
        items = []
        for i, name in enumerate(["净利润", "营业收入", "总资产", "负债合计"]):
            item = MagicMock()
            item.code = f"ACC{i:04d}"
            item.name = name
            item.category = "profitability" if i < 2 else "balance"
            item.report_type = "profit" if i < 2 else "balance"
            item.description = f"会计科目{name}"
            item.unit = "万元"
            items.append(item)
        return items

    @pytest.fixture
    def mock_db_manager(self, mock_accounting_items):
        """Create a mock database manager with proper async context manager setup."""
        mock_db_session = MagicMock()
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.rollback = MagicMock()
        mock_db_session.close = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute = AsyncMock(side_effect=[mock_result, mock_count_result])

        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db_session)
        mock_context.__aexit__ = AsyncMock(return_value=None)

        mock_mgr = MagicMock()
        mock_mgr.session = PropertyMock(return_value=mock_context)
        return mock_mgr

    @pytest.mark.asyncio
    async def test_get_accounting_items_empty(self, mock_redis_client, mock_db_manager):
        """Test GET /accounting/items endpoint with no items."""
        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.accounting.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/accounting/items")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_count" in data
        assert data["total_count"] == 0

    @pytest.mark.asyncio
    async def test_get_accounting_items_with_data(self, mock_redis_client, mock_accounting_items):
        """Test GET /accounting/items endpoint with items."""
        mock_db_session = MagicMock()
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.rollback = MagicMock()
        mock_db_session.close = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_accounting_items

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = len(mock_accounting_items)

        mock_db_session.execute = AsyncMock(side_effect=[mock_result, mock_count_result])

        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db_session)
        mock_context.__aexit__ = AsyncMock(return_value=None)

        mock_db_manager = MagicMock()
        mock_db_manager.session = PropertyMock(return_value=mock_context)

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.accounting.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/accounting/items")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_count" in data
        assert data["total_count"] == 4
        assert len(data["items"]) == 4

    @pytest.mark.asyncio
    async def test_get_accounting_items_with_report_type_filter(
        self, mock_redis_client, mock_accounting_items
    ):
        """Test GET /accounting/items endpoint with report_type filter."""
        profit_items = [item for item in mock_accounting_items if item.report_type == "profit"]
        mock_db_session = MagicMock()
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.rollback = MagicMock()
        mock_db_session.close = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = profit_items

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = len(profit_items)

        mock_db_session.execute = AsyncMock(side_effect=[mock_result, mock_count_result])

        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db_session)
        mock_context.__aexit__ = AsyncMock(return_value=None)

        mock_db_manager = MagicMock()
        mock_db_manager.session = PropertyMock(return_value=mock_context)

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.accounting.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/accounting/items?report_type=profit")
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2

    @pytest.mark.asyncio
    async def test_get_accounting_items_with_industry_filter(
        self, mock_redis_client, mock_accounting_items
    ):
        """Test GET /accounting/items endpoint with industry_sw_three filter."""
        mock_db_session = MagicMock()
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.rollback = MagicMock()
        mock_db_session.close = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0

        mock_db_session.execute = AsyncMock(side_effect=[mock_result, mock_count_result])

        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db_session)
        mock_context.__aexit__ = AsyncMock(return_value=None)

        mock_db_manager = MagicMock()
        mock_db_manager.session = PropertyMock(return_value=mock_context)

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch("app.api.v1.endpoints.accounting.db_manager", mock_db_manager):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get("/api/v1/accounting/items?industry_sw_three=银行")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_count" in data
        assert data["total_count"] == 0
