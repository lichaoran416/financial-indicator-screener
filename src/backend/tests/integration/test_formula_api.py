import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime

from main import app
from app.core.redis import RedisManager


class TestFormulaAPIIntegration:
    """Integration tests for formula API endpoints."""

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
    def mock_atomic_update_json(self, mock_redis_client):
        """Mock atomic_update_json to simulate Redis operations."""
        stored_formulas = []

        def atomic_op(key, func, ttl=None):
            result = func(stored_formulas.copy())
            stored_formulas.clear()
            stored_formulas.extend(result)
            return result

        with patch.object(RedisManager, "_client", mock_redis_client):
            with patch.object(RedisManager, "atomic_update_json", side_effect=atomic_op):
                with patch.object(RedisManager, "get_json", return_value=None):
                    yield stored_formulas

    @pytest.mark.asyncio
    async def test_validate_formula_endpoint(self, mock_atomic_update_json):
        """Test POST /formula/validate endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/formula/validate", json={"formula": "roe + roi"})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["error"] is None
        assert data["ast"] is not None

    @pytest.mark.asyncio
    async def test_validate_formula_invalid_endpoint(self, mock_atomic_update_json):
        """Test POST /formula/validate with invalid formula."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/formula/validate", json={"formula": "roe +"})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["error"] is not None

    @pytest.mark.asyncio
    async def test_evaluate_formula_endpoint(self, mock_atomic_update_json):
        """Test POST /formula/evaluate endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formula/evaluate",
                json={"formula": "roe + roi", "metrics": {"roe": 10.0, "roi": 5.0}},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["error"] is None
        assert data["result"] == 15.0

    @pytest.mark.asyncio
    async def test_evaluate_formula_with_time_series_single_year(self, mock_atomic_update_json):
        """Test POST /formula/evaluate with single year time series syntax."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formula/evaluate",
                json={
                    "formula": "ROE[2023]",
                    "metrics": {"ROE": {2023: 15.5, 2022: 14.0, 2021: 13.0}},
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"] == 15.5

    @pytest.mark.asyncio
    async def test_evaluate_formula_with_functions(self, mock_atomic_update_json):
        """Test POST /formula/evaluate with aggregate functions."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formula/evaluate",
                json={
                    "formula": "AVG(roe, roi)",
                    "metrics": {"roe": 10.0, "roi": 5.0},
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"] == 7.5

    @pytest.mark.asyncio
    async def test_save_formula_endpoint(self, mock_atomic_update_json):
        """Test POST /formula/save endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formula/save",
                json={
                    "name": "Test Formula",
                    "formula": "roe + roi",
                    "description": "A test formula",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Formula"
        assert data["formula"] == "roe + roi"
        assert data["description"] == "A test formula"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_save_formula_invalid(self, mock_atomic_update_json):
        """Test POST /formula/save with invalid formula."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formula/save", json={"name": "Invalid Formula", "formula": "roe +"}
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_formula_endpoint(self, mock_atomic_update_json):
        """Test PUT /formula/{formula_id} endpoint - BUG-H7 fix verification."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            save_response = await client.post(
                "/api/v1/formula/save",
                json={
                    "name": "Original Formula",
                    "formula": "roe + roi",
                    "description": "Original description",
                },
            )
            assert save_response.status_code == 200
            saved_data = save_response.json()
            formula_id = saved_data["id"]

            update_response = await client.put(
                f"/api/v1/formula/{formula_id}",
                json={
                    "name": "Updated Formula",
                    "formula": "roe - roi",
                    "description": "Updated description",
                },
            )
            assert update_response.status_code == 200
            updated_data = update_response.json()
            assert updated_data["name"] == "Updated Formula"
            assert updated_data["formula"] == "roe - roi"
            assert updated_data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_formula_not_found(self, mock_atomic_update_json):
        """Test PUT /formula/{formula_id} with non-existent ID."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/v1/formula/nonexistent-id", json={"name": "Updated Name"}
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_formula_partial(self, mock_atomic_update_json):
        """Test PUT /formula/{formula_id} with partial update (only name)."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            save_response = await client.post(
                "/api/v1/formula/save",
                json={
                    "name": "Original Formula",
                    "formula": "roe + roi",
                    "description": "Original description",
                },
            )
            saved_data = save_response.json()
            formula_id = saved_data["id"]

            update_response = await client.put(
                f"/api/v1/formula/{formula_id}", json={"name": "New Name Only"}
            )
            assert update_response.status_code == 200
            updated_data = update_response.json()
            assert updated_data["name"] == "New Name Only"
            assert updated_data["formula"] == "roe + roi"
            assert updated_data["description"] == "Original description"

    @pytest.mark.asyncio
    async def test_get_saved_formulas_endpoint(self, mock_atomic_update_json):
        """Test GET /formula/saved endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/formula/saved")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_delete_formula_endpoint(self, mock_atomic_update_json):
        """Test DELETE /formula/{formula_id} endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            save_response = await client.post(
                "/api/v1/formula/save", json={"name": "To Be Deleted", "formula": "roe + roi"}
            )
            saved_data = save_response.json()
            formula_id = saved_data["id"]

            delete_response = await client.delete(f"/api/v1/formula/{formula_id}")
            assert delete_response.status_code == 200
            delete_data = delete_response.json()
            assert delete_data["deleted"] is True

    @pytest.mark.asyncio
    async def test_delete_formula_not_found(self, mock_atomic_update_json):
        """Test DELETE /formula/{formula_id} with non-existent ID."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/formula/nonexistent-id")
        assert response.status_code == 404
