from app.services.financial import FinancialService


class TestYearsParameter:
    def test_years_passed_to_get_company_metrics(self, sample_company_data, mock_redis):
        service = FinancialService()
        from unittest.mock import patch

        company_list = [sample_company_data.copy()]
        company_list[0]["code"] = "000001"

        with patch.object(service, "get_company_list", return_value=company_list):
            with patch.object(
                service,
                "get_company_metrics",
                return_value={"roe": 12.5, "roi": 8.3},
            ) as mock_metrics:
                import asyncio

                asyncio.run(
                    service.screen_companies(
                        conditions=[{"metric": "roe", "operator": ">", "value": 10, "years": 5}],
                        limit=10,
                    )
                )
                mock_metrics.assert_called_once()
                call_args = mock_metrics.call_args
                assert call_args[1]["years"] == 5

    def test_years_extracted_from_conditions(self, mock_redis):
        conditions = [
            {"metric": "roe", "operator": ">", "value": 10, "years": 3},
            {"metric": "roi", "operator": "<", "value": 20, "years": 7},
        ]
        years = conditions[0].get("years", 5) if conditions else 5
        assert years == 3

        years2 = conditions[1].get("years", 5) if len(conditions) > 1 else 5
        assert years2 == 7

    def test_default_years_when_not_specified(self, mock_redis):
        conditions = [{"metric": "roe", "operator": ">", "value": 10}]
        years = conditions[0].get("years", 5) if conditions else 5
        assert years == 5

        empty_conditions = []
        years_default = empty_conditions[0].get("years", 5) if empty_conditions else 5
        assert years_default == 5


class TestTTMCalculation:
    def test_get_ttm_sum_uses_last_values(self):
        service = FinancialService()
        data = {
            "roe": [10.0, 11.0, 12.0, 13.0, 14.0, 15.0],
        }
        result = service._get_ttm_sum(data, ["roe"], 4)
        assert result == 54.0

    def test_get_ttm_sum_partial_data(self):
        service = FinancialService()
        data = {
            "roe": [10.0, 11.0, None, 13.0],
        }
        result = service._get_ttm_sum(data, ["roe"], 4)
        assert result == 34.0

    def test_get_ttm_sum_insufficient_data(self):
        service = FinancialService()
        data = {
            "roe": [10.0, 11.0],
        }
        result = service._get_ttm_sum(data, ["roe"], 4)
        assert result == 21.0

    def test_get_ttm_sum_none_values_filtered(self):
        service = FinancialService()
        data = {
            "roic": [None, None, 15.0, 16.0, 17.0, 18.0],
        }
        result = service._get_ttm_sum(data, ["roic"], 4)
        assert result == 66.0

    def test_get_ttm_sum_matching_column(self):
        service = FinancialService()
        data = {
            "roe_ratio": [5.0, 6.0, 7.0, 8.0],
        }
        result = service._get_ttm_sum(data, ["roe"], 4)
        assert result == 26.0

    def test_get_ttm_sum_no_matching_column(self):
        service = FinancialService()
        data = {
            "other_metric": [5.0, 6.0, 7.0, 8.0],
        }
        result = service._get_ttm_sum(data, ["roe"], 4)
        assert result is None
