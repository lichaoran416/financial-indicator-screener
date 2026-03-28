import pytest
from unittest.mock import patch
from app.services.financial import FinancialService


class TestFinancialServiceMetrics:
    def test_calculate_metric_roi(self, sample_financial_data):
        service = FinancialService()
        result = service.calculate_metric("roi", sample_financial_data)
        assert result is not None
        assert result == pytest.approx(3.947, rel=0.01)

    def test_calculate_metric_roe(self, sample_financial_data):
        service = FinancialService()
        result = service.calculate_metric("roe", sample_financial_data)
        assert result is not None
        assert result == 25.0

    def test_calculate_metric_gross_margin(self, sample_financial_data):
        service = FinancialService()
        result = service.calculate_metric("gross_margin", sample_financial_data)
        assert result is not None
        assert result == pytest.approx(45.26, rel=0.01)

    def test_calculate_metric_debt_ratio(self, sample_financial_data):
        service = FinancialService()
        result = service.calculate_metric("debt_ratio", sample_financial_data)
        assert result is not None
        assert result == pytest.approx(87.92, rel=0.01)

    @pytest.mark.asyncio
    async def test_screen_companies_empty_conditions(self, sample_company_data, mock_redis):
        service = FinancialService()
        with patch.object(service, "get_company_list", return_value=[sample_company_data]):
            with patch.object(
                service, "get_company_metrics", return_value=sample_company_data["metrics"]
            ):
                result = await service.screen_companies(conditions=[], limit=10)
                assert result["total"] == 1
                assert len(result["companies"]) == 1
                assert result["companies"][0]["code"] == "000001"
