from typing import Any, Optional
from app.utils.akshare_client import akshare_client
from app.core.redis import redis_manager
from app.models.schemas import Period, SortOrder, CompanyInfo, CompanyStatus, RiskFlag


CACHE_TTL = 86400


class FinancialService:
    METRIC_DEFINITIONS = {
        "roi": {
            "name": "投资回报率",
            "category": "盈利能力",
            "formula": "净利润 / 总投资 × 100%",
        },
        "roe": {
            "name": "净资产收益率",
            "category": "盈利能力",
            "formula": "净利润 / 股东权益 × 100%",
        },
        "gross_margin": {
            "name": "毛利率",
            "category": "盈利能力",
            "formula": "(营收 - 成本) / 营收 × 100%",
        },
        "net_profit_growth": {
            "name": "净利润增长率",
            "category": "成长能力",
            "formula": "(本期净利润 - 上期净利润) / 上期净利润 × 100%",
        },
        "revenue_growth": {
            "name": "营收增长率",
            "category": "成长能力",
            "formula": "(本期营收 - 上期营收) / 上期营收 × 100%",
        },
        "debt_ratio": {
            "name": "资产负债率",
            "category": "财务结构",
            "formula": "总负债 / 总资产 × 100%",
        },
        "current_ratio": {
            "name": "流动比率",
            "category": "偿债能力",
            "formula": "流动资产 / 流动负债",
        },
        "pe": {
            "name": "市盈率",
            "category": "估值指标",
            "formula": "市值 / 净利润",
        },
        "pb": {
            "name": "市净率",
            "category": "估值指标",
            "formula": "市值 / 净资产",
        },
    }

    def _determine_status(self, listing_status: str) -> str:
        if listing_status in ("暂停上市", "SUSPENDED"):
            return CompanyStatus.SUSPENDED.value
        elif listing_status in ("终止上市", "DELISTED"):
            return CompanyStatus.DELISTED.value
        return CompanyStatus.ACTIVE.value

    def _determine_risk_flag(self, name: str) -> str:
        name_upper = name.upper()
        if "*ST" in name_upper or "S*ST" in name_upper or "S ST" in name_upper:
            return RiskFlag.STAR_ST.value
        elif "ST" in name_upper or "SST" in name_upper:
            return RiskFlag.ST.value
        elif "退" in name or "DELIST" in name_upper:
            return RiskFlag.DELISTING_RISK.value
        return RiskFlag.NORMAL.value

    async def get_company_list(self) -> list[dict[str, Any]]:
        cache_key = "company:list:all"
        cached = await redis_manager.get_json(cache_key)
        if cached:
            return cached

        stocks = await akshare_client.get_stock_list()
        result = []
        for stock in stocks:
            code = stock.get("code", stock.get("证券代码", ""))
            name = stock.get("name", stock.get("证券名称", ""))
            listing_status = stock.get("listing_status", "上市")
            status = self._determine_status(listing_status)
            risk_flag = self._determine_risk_flag(name)
            result.append(
                {
                    "code": code,
                    "name": name,
                    "status": status,
                    "risk_flag": risk_flag,
                    "industry": stock.get("industry", None),
                }
            )

        await redis_manager.set_json(cache_key, result, CACHE_TTL)
        return result

    async def get_company_metrics(
        self, code: str, period: str = "annual", years: int = 5
    ) -> dict[str, Any]:
        financial_data = await akshare_client.get_financial_data(code, period, years)
        indicator_data = await akshare_client.get_financial_indicator(code, period, years)
        price_data = await akshare_client.get_stock_price(code)

        metrics = {}
        if indicator_data and isinstance(indicator_data, dict):
            if period == Period.TTM.value:
                metrics["roe"] = self._get_ttm_sum(
                    indicator_data, ["roe"], 4
                ) if "roe" in indicator_data else None
                metrics["roi"] = self._get_ttm_sum(
                    indicator_data, ["roic", "roi"], 4
                ) if "roic" in indicator_data or "roi" in indicator_data else None
                metrics["gross_margin"] = self._get_ttm_sum(
                    indicator_data, ["gross_profit_margin"], 4
                ) if "gross_profit_margin" in indicator_data else None
            else:
                if "roe" in indicator_data:
                    metrics["roe"] = self._safe_get_last_values(indicator_data.get("roe", []))
                if "roic" in indicator_data or "roi" in indicator_data:
                    metrics["roi"] = self._safe_get_last_values(
                        indicator_data.get("roic", indicator_data.get("roi", []))
                    )
                if "gross_profit_margin" in indicator_data:
                    metrics["gross_margin"] = self._safe_get_last_values(
                        indicator_data.get("gross_profit_margin", [])
                    )

        financial_metrics = self._extract_financial_metrics(financial_data, period)
        metrics.update(financial_metrics)

        if price_data:
            market_cap = await akshare_client.get_market_capital(code)
            if market_cap:
                metrics["market_cap"] = market_cap
                if period == Period.TTM.value:
                    net_profit = self._get_ttm_sum(
                        financial_data.get("income", {}), ["净利润", "归属母公司净利润"], 4
                    )
                else:
                    net_profit = self._get_net_profit(financial_data)
                if net_profit and net_profit > 0:
                    metrics["pe"] = market_cap / net_profit
                if period == Period.TTM.value:
                    total_equity = self._find_column_value(
                        financial_data.get("balance", {}), ["所有者权益合计", "股东权益", "净资产"]
                    )
                else:
                    total_equity = self._get_total_equity(financial_data)
                if total_equity and total_equity > 0:
                    metrics["pb"] = market_cap / total_equity

        return metrics

    def _safe_get_last_values(self, values: list) -> Optional[float]:
        if not values or len(values) == 0:
            return None
        valid_values = [v for v in values if v is not None and str(v) != "nan"]
        if not valid_values:
            return None
        return float(valid_values[-1])

    def _get_ttm_sum(
        self, data: dict[str, list], column_names: list[str], periods: int = 4
    ) -> Optional[float]:
        for col_name in column_names:
            for key, values in data.items():
                if isinstance(values, list) and len(values) > 0:
                    if col_name in key:
                        valid_values = [
                            float(v) for v in values[:periods]
                            if v is not None and str(v) != "nan"
                        ]
                        if len(valid_values) >= periods:
                            return sum(valid_values)
                        elif len(valid_values) > 0:
                            return sum(valid_values)
                        return None
        return None

    def _extract_financial_metrics(
        self, financial_data: dict[str, Any], period: str = "annual"
    ) -> dict[str, Any]:
        metrics = {}
        if not financial_data:
            return metrics

        income = financial_data.get("income")
        balance = financial_data.get("balance")

        if income and isinstance(income, dict):
            if period == Period.TTM.value:
                revenue = self._get_ttm_sum(income, ["营业总收入", "营业收入", "营收"], 4)
                total_cost = self._get_ttm_sum(income, ["营业总成本", "营业成本", "成本"], 4)
                net_profit = self._get_ttm_sum(income, ["净利润", "归属母公司净利润"], 4)
                previous_net_profit = None
                previous_revenue = None
            else:
                revenue = self._find_column_value(income, ["营业总收入", "营业收入", "营收"])
                total_cost = self._find_column_value(income, ["营业总成本", "营业成本", "成本"])
                net_profit = self._find_column_value(income, ["净利润", "归属母公司净利润"])
                previous_net_profit = self._find_previous_value(income, ["净利润", "归属母公司净利润"])
                previous_revenue = self._find_previous_value(income, ["营业总收入", "营业收入", "营收"])

            if revenue and total_cost and revenue > 0:
                metrics["gross_margin"] = (revenue - total_cost) / revenue * 100

            if period != Period.TTM.value:
                if net_profit and previous_net_profit and previous_net_profit != 0:
                    metrics["net_profit_growth"] = (
                        (net_profit - previous_net_profit) / abs(previous_net_profit) * 100
                    )

                if revenue and previous_revenue and previous_revenue != 0:
                    metrics["revenue_growth"] = (
                        (revenue - previous_revenue) / abs(previous_revenue) * 100
                    )

        if balance and isinstance(balance, dict):
            total_debt = self._find_column_value(balance, ["负债合计", "总负债", "负债总额"])
            total_assets = self._find_column_value(balance, ["资产合计", "总资产", "资产总额"])
            current_assets = self._find_column_value(balance, ["流动资产合计", "流动资产"])
            current_liabilities = self._find_column_value(balance, ["流动负债合计", "流动负债"])
            total_equity = self._find_column_value(
                balance, ["所有者权益合计", "股东权益", "净资产"]
            )

            if total_debt and total_assets and total_assets > 0:
                metrics["debt_ratio"] = total_debt / total_assets * 100

            if current_assets and current_liabilities and current_liabilities > 0:
                metrics["current_ratio"] = current_assets / current_liabilities

            if net_profit and total_equity and total_equity > 0:
                metrics["roe"] = net_profit / total_equity * 100

            if total_equity:
                metrics["total_equity"] = total_equity

        return metrics

    def _find_column_value(self, data: dict[str, list], column_names: list[str]) -> Optional[float]:
        for col_name in column_names:
            for key, values in data.items():
                if isinstance(values, list) and len(values) > 0:
                    if col_name in key:
                        try:
                            val = values[-1]
                            if val is not None and str(val) != "nan":
                                return float(val)
                        except (ValueError, TypeError):
                            continue
        return None

    def _find_previous_value(
        self, data: dict[str, list], column_names: list[str]
    ) -> Optional[float]:
        for col_name in column_names:
            for key, values in data.items():
                if isinstance(values, list) and len(values) > 1:
                    if col_name in key:
                        try:
                            val = values[-2]
                            if val is not None and str(val) != "nan":
                                return float(val)
                        except (ValueError, TypeError):
                            continue
        return None

    def _get_net_profit(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        if not income:
            return None
        return self._find_column_value(income, ["净利润", "归属母公司净利润"])

    def _get_total_equity(self, financial_data: dict[str, Any]) -> Optional[float]:
        balance = financial_data.get("balance")
        if not balance:
            return None
        return self._find_column_value(balance, ["所有者权益合计", "股东权益", "净资产"])

    async def screen_companies(
        self,
        conditions: list[dict[str, Any]],
        sort_by: Optional[str] = None,
        order: str = "desc",
        limit: int = 50,
        page: int = 1,
        industry: Optional[str] = None,
        include_suspended: bool = False,
        profit_only: bool = False,
        include_st: bool = True,
        require_complete_data: bool = False,
    ) -> dict[str, Any]:
        cache_key = f"screen:{hash(str(conditions))}:{sort_by}:{order}:{limit}:{page}:{industry}:{include_suspended}:{profit_only}:{include_st}:{require_complete_data}"
        cached = await redis_manager.get_json(cache_key)
        if cached:
            return cached

        companies = await self.get_company_list()
        screened = []

        for company in companies:
            code = company.get("code")
            if not code:
                continue

            status = company.get("status", CompanyStatus.ACTIVE.value)
            risk_flag = company.get("risk_flag", RiskFlag.NORMAL.value)
            company_industry = company.get("industry")

            if not include_suspended and status in (
                CompanyStatus.SUSPENDED.value,
                CompanyStatus.DELISTED.value,
            ):
                continue

            if not include_st and risk_flag in (
                RiskFlag.ST.value,
                RiskFlag.STAR_ST.value,
                RiskFlag.DELISTING_RISK.value,
            ):
                continue

            if industry and company_industry and industry.lower() not in company_industry.lower():
                continue

            period = conditions[0].get("period", "annual") if conditions else "annual"
            metrics = await self.get_company_metrics(code, period=period)
            company["metrics"] = metrics

            if profit_only:
                net_profit = metrics.get("net_profit") or metrics.get("roe", 0)
                if net_profit is None or net_profit <= 0:
                    continue

            if require_complete_data:
                if not self._has_complete_metrics(metrics, len(conditions)):
                    continue

            if self._evaluate_conditions(company, conditions):
                screened.append(company)

        if sort_by:
            reverse = order.lower() == "desc"
            screened = sorted(
                screened,
                key=lambda x: x.get("metrics", {}).get(sort_by) or 0,
                reverse=reverse,
            )

        total = len(screened)
        start = (page - 1) * limit
        end = start + limit
        paginated = screened[start:end]

        result = {
            "companies": paginated,
            "total": total,
        }
        await redis_manager.set_json(cache_key, result, CACHE_TTL)
        return result

    def _has_complete_metrics(self, metrics: dict[str, Any], num_conditions: int) -> bool:
        if not metrics:
            return False
        required_metrics = ["roe", "roi", "gross_margin", "net_profit_growth", "revenue_growth"]
        present_count = sum(1 for m in required_metrics if metrics.get(m) is not None)
        return present_count >= min(num_conditions, 3)

    def _evaluate_conditions(
        self, company: dict[str, Any], conditions: list[dict[str, Any]]
    ) -> bool:
        metrics = company.get("metrics", {})

        for condition in conditions:
            metric = condition.get("metric")
            operator = condition.get("operator")
            value = condition.get("value")

            if not metric or metric not in metrics:
                return False

            metric_value = metrics.get(metric)
            if metric_value is None:
                return False

            if not self._compare(metric_value, operator, value):
                return False

        return True

    def _compare(self, metric_value: float, operator: str, target_value: float) -> bool:
        if operator == ">":
            return metric_value > target_value
        elif operator == "<":
            return metric_value < target_value
        elif operator == ">=":
            return metric_value >= target_value
        elif operator == "<=":
            return metric_value <= target_value
        elif operator == "==":
            return abs(metric_value - target_value) < 1e-9
        elif operator == "!=":
            return abs(metric_value - target_value) >= 1e-9
        return False

    def calculate_metric(self, metric_id: str, financial_data: dict[str, Any]) -> Optional[float]:
        if metric_id not in self.METRIC_DEFINITIONS:
            return None

        if metric_id == "roi":
            return self._calculate_roi(financial_data)
        elif metric_id == "roe":
            return self._calculate_roe(financial_data)
        elif metric_id == "gross_margin":
            return self._calculate_gross_margin(financial_data)
        elif metric_id == "net_profit_growth":
            return self._calculate_net_profit_growth(financial_data)
        elif metric_id == "revenue_growth":
            return self._calculate_revenue_growth(financial_data)
        elif metric_id == "debt_ratio":
            return self._calculate_debt_ratio(financial_data)
        elif metric_id == "current_ratio":
            return self._calculate_current_ratio(financial_data)
        elif metric_id == "pe":
            return self._calculate_pe(financial_data)
        elif metric_id == "pb":
            return self._calculate_pb(financial_data)

        return None

    def _calculate_roi(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        if not income:
            return None
        net_profit = self._find_column_value(income, ["净利润"])
        total_investment = self._find_column_value(financial_data.get("balance", {}), ["资产合计"])
        if net_profit and total_investment and total_investment > 0:
            return net_profit / total_investment * 100
        return None

    def _calculate_roe(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        balance = financial_data.get("balance")
        if not income or not balance:
            return None
        net_profit = self._find_column_value(income, ["净利润"])
        equity = self._find_column_value(balance, ["所有者权益合计", "股东权益"])
        if net_profit and equity and equity > 0:
            return net_profit / equity * 100
        return None

    def _calculate_gross_margin(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        if not income:
            return None
        revenue = self._find_column_value(income, ["营业总收入", "营业收入"])
        cost = self._find_column_value(income, ["营业成本"])
        if revenue and cost and revenue > 0:
            return (revenue - cost) / revenue * 100
        return None

    def _calculate_net_profit_growth(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        if not income:
            return None
        current_net_profit = self._find_column_value(income, ["净利润"])
        previous_net_profit = self._find_previous_value(income, ["净利润"])
        if current_net_profit and previous_net_profit and previous_net_profit != 0:
            return (current_net_profit - previous_net_profit) / abs(previous_net_profit) * 100
        return None

    def _calculate_revenue_growth(self, financial_data: dict[str, Any]) -> Optional[float]:
        income = financial_data.get("income")
        if not income:
            return None
        current_revenue = self._find_column_value(income, ["营业总收入", "营业收入"])
        previous_revenue = self._find_previous_value(income, ["营业总收入", "营业收入"])
        if current_revenue and previous_revenue and previous_revenue != 0:
            return (current_revenue - previous_revenue) / abs(previous_revenue) * 100
        return None

    def _calculate_debt_ratio(self, financial_data: dict[str, Any]) -> Optional[float]:
        balance = financial_data.get("balance")
        if not balance:
            return None
        total_debt = self._find_column_value(balance, ["负债合计", "总负债"])
        total_assets = self._find_column_value(balance, ["资产合计"])
        if total_debt and total_assets and total_assets > 0:
            return total_debt / total_assets * 100
        return None

    def _calculate_current_ratio(self, financial_data: dict[str, Any]) -> Optional[float]:
        balance = financial_data.get("balance")
        if not balance:
            return None
        current_assets = self._find_column_value(balance, ["流动资产合计", "流动资产"])
        current_liabilities = self._find_column_value(balance, ["流动负债合计", "流动负债"])
        if current_assets and current_liabilities and current_liabilities > 0:
            return current_assets / current_liabilities
        return None

    def _calculate_pe(self, financial_data: dict[str, Any]) -> Optional[float]:
        market_cap = None
        if "metrics" in financial_data:
            market_cap = financial_data["metrics"].get("market_cap")
        if not market_cap:
            return None
        income = financial_data.get("income")
        if not income:
            return None
        net_profit = self._find_column_value(income, ["净利润"])
        if net_profit and net_profit > 0:
            return market_cap / net_profit
        return None

    def _calculate_pb(self, financial_data: dict[str, Any]) -> Optional[float]:
        market_cap = None
        if "metrics" in financial_data:
            market_cap = financial_data["metrics"].get("market_cap")
        if not market_cap:
            return None
        balance = financial_data.get("balance")
        if not balance:
            return None
        equity = self._find_column_value(balance, ["所有者权益合计", "股东权益", "净资产"])
        if equity and equity > 0:
            return market_cap / equity
        return None


financial_service = FinancialService()
