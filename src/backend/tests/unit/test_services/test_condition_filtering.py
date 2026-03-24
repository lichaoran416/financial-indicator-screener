import pytest
from app.services.financial import FinancialService


class TestConditionFiltering:
    def test_compare_greater_than(self):
        service = FinancialService()
        assert service._compare(15.0, ">", 10.0) is True
        assert service._compare(10.0, ">", 15.0) is False
        assert service._compare(10.0, ">", 10.0) is False

    def test_compare_less_than(self):
        service = FinancialService()
        assert service._compare(5.0, "<", 10.0) is True
        assert service._compare(15.0, "<", 10.0) is False
        assert service._compare(10.0, "<", 10.0) is False

    def test_compare_greater_than_or_equal(self):
        service = FinancialService()
        assert service._compare(15.0, ">=", 10.0) is True
        assert service._compare(10.0, ">=", 10.0) is True
        assert service._compare(5.0, ">=", 10.0) is False

    def test_compare_less_than_or_equal(self):
        service = FinancialService()
        assert service._compare(5.0, "<=", 10.0) is True
        assert service._compare(10.0, "<=", 10.0) is True
        assert service._compare(15.0, "<=", 10.0) is False

    def test_compare_equal(self):
        service = FinancialService()
        assert service._compare(10.0, "==", 10.0) is True
        assert service._compare(10.0, "==", 10.0) is True
        assert service._compare(11.0, "==", 10.0) is False

    def test_compare_not_equal(self):
        service = FinancialService()
        assert service._compare(11.0, "!=", 10.0) is True
        assert service._compare(10.0, "!=", 10.0) is False

    def test_compare_between(self):
        service = FinancialService()
        assert service._compare(15.0, "between", 10.0, 20.0) is True
        assert service._compare(10.0, "between", 10.0, 20.0) is True
        assert service._compare(20.0, "between", 10.0, 20.0) is True
        assert service._compare(5.0, "between", 10.0, 20.0) is False
        assert service._compare(25.0, "between", 10.0, 20.0) is False

    def test_compare_between_missing_value2(self):
        service = FinancialService()
        assert service._compare(15.0, "between", 10.0, None) is False

    def test_compare_invalid_operator(self):
        service = FinancialService()
        assert service._compare(15.0, "invalid", 10.0) is False

    def test_evaluate_conditions_single_condition(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": 15.0,
                "roi": 8.3,
            }
        }
        conditions = [{"metric": "roe", "operator": ">", "value": 10}]
        assert service._evaluate_conditions(company, conditions) is True

        conditions_fail = [{"metric": "roe", "operator": ">", "value": 20}]
        assert service._evaluate_conditions(company, conditions_fail) is False

    def test_evaluate_conditions_multiple_conditions_all_pass(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": 15.0,
                "roi": 8.3,
                "gross_margin": 45.0,
            }
        }
        conditions = [
            {"metric": "roe", "operator": ">", "value": 10},
            {"metric": "roi", "operator": "<", "value": 10},
            {"metric": "gross_margin", "operator": ">", "value": 40},
        ]
        assert service._evaluate_conditions(company, conditions) is True

    def test_evaluate_conditions_multiple_conditions_one_fails(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": 15.0,
                "roi": 8.3,
            }
        }
        conditions = [
            {"metric": "roe", "operator": ">", "value": 10},
            {"metric": "roi", "operator": ">", "value": 10},
        ]
        assert service._evaluate_conditions(company, conditions) is False

    def test_evaluate_conditions_between_operator(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": 15.0,
            }
        }
        conditions = [{"metric": "roe", "operator": "between", "value": 10, "value2": 20}]
        assert service._evaluate_conditions(company, conditions) is True

        conditions_fail = [{"metric": "roe", "operator": "between", "value": 20, "value2": 30}]
        assert service._evaluate_conditions(company, conditions_fail) is False

    def test_evaluate_conditions_missing_metric(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": 15.0,
            }
        }
        conditions = [{"metric": "nonexistent", "operator": ">", "value": 10}]
        assert service._evaluate_conditions(company, conditions) is False

    def test_evaluate_conditions_none_metric_value(self):
        service = FinancialService()
        company = {
            "metrics": {
                "roe": None,
            }
        }
        conditions = [{"metric": "roe", "operator": ">", "value": 10}]
        assert service._evaluate_conditions(company, conditions) is False


class TestConditionFilteringIntegration:
    @pytest.mark.asyncio
    async def test_screen_with_conditions(self, sample_company_data, mock_redis):
        service = FinancialService()
        from unittest.mock import patch

        company = sample_company_data.copy()
        company["code"] = "000001"

        with patch.object(service, "get_company_list", return_value=[company]):
            with patch.object(
                service,
                "get_company_metrics",
                return_value={
                    "roe": 15.0,
                    "roi": 8.3,
                    "gross_margin": 45.0,
                },
            ):
                result = await service.screen_companies(
                    conditions=[{"metric": "roe", "operator": ">", "value": 10}],
                    limit=10,
                )
                assert result["total"] == 1
                assert result["companies"][0]["code"] == "000001"

    @pytest.mark.asyncio
    async def test_screen_no_results(self, sample_company_data, mock_redis):
        service = FinancialService()
        from unittest.mock import patch

        company = sample_company_data.copy()
        company["code"] = "000001"

        with patch.object(service, "get_company_list", return_value=[company]):
            with patch.object(
                service,
                "get_company_metrics",
                return_value={
                    "roe": 5.0,
                    "roi": 3.0,
                },
            ):
                result = await service.screen_companies(
                    conditions=[{"metric": "roe", "operator": ">", "value": 10}],
                    limit=10,
                )
                assert result["total"] == 0
                assert len(result["companies"]) == 0

    @pytest.mark.asyncio
    async def test_screen_with_st_exclusion(self, mock_redis):
        service = FinancialService()
        from unittest.mock import patch

        companies = [
            {
                "code": "000001",
                "name": "Normal Company",
                "status": "ACTIVE",
                "risk_flag": "NORMAL",
                "industry": "银行",
            },
            {
                "code": "000002",
                "name": "*ST Risky",
                "status": "ACTIVE",
                "risk_flag": "STAR_ST",
                "industry": "制造",
            },
        ]

        with patch.object(service, "get_company_list", return_value=companies):
            with patch.object(
                service,
                "get_company_metrics",
                return_value={"roe": 15.0},
            ):
                result = await service.screen_companies(
                    conditions=[{"metric": "roe", "operator": ">", "value": 10}],
                    limit=10,
                    include_st=False,
                )
                assert result["total"] == 1
                assert result["companies"][0]["name"] == "Normal Company"
