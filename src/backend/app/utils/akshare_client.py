import asyncio
from typing import Any, Optional, cast
import pandas as pd  # type: ignore[import-untyped]
import akshare as ak  # type: ignore[import-untyped]


class AkshareAPIError(Exception):
    pass


class AkshareClient:
    def __init__(self, max_retries: int = 3, retry_delay: float = 2.0):
        self._lock = asyncio.Lock()
        self._max_retries = max_retries
        self._retry_delay = retry_delay

    async def _retry_async(self, func, *args, **kwargs):
        last_error = None
        for attempt in range(self._max_retries):
            try:
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, func, *args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self._max_retries - 1:
                    await asyncio.sleep(self._retry_delay * (attempt + 1))
        raise AkshareAPIError(f"Failed after {self._max_retries} attempts: {last_error}")

    async def get_financial_indicators(
        self, symbol: str, start_year: int, end_year: int
    ) -> pd.DataFrame:
        try:
            df = await self._retry_async(
                ak.stock_financial_analysis_indicator,
                symbol,
                start_year,
                end_year,
            )
            if df is None or df.empty:
                raise AkshareAPIError(f"No financial indicators data for {symbol}")
            return df
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get financial indicators for {symbol}: {str(e)}")

    async def get_financial_statements(
        self, symbol: str, start_year: int, end_year: int
    ) -> pd.DataFrame:
        try:
            normalized_symbol = self._normalize_symbol(symbol)
            df = await self._retry_async(
                ak.stock_financial_report_sina,
                normalized_symbol,
            )
            if df is None or df.empty:
                raise AkshareAPIError(f"No financial statements data for {symbol}")
            return self._filter_by_year(df, start_year, end_year)
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get financial statements for {symbol}: {str(e)}")

    async def get_stock_price(
        self,
        symbol: str,
        period: str = "daily",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> pd.DataFrame:
        try:
            normalized_symbol = self._normalize_symbol(symbol)
            df = await self._retry_async(
                ak.stock_zh_a_hist,
                normalized_symbol,
                period,
                start_date or "",
                end_date or "20500101",
            )
            if df is None or df.empty:
                raise AkshareAPIError(f"No stock price data for {symbol}")
            return df
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get stock price for {symbol}: {str(e)}")

    async def get_company_info(self, symbol: str) -> dict[str, Any]:
        try:
            normalized_symbol = self._normalize_symbol(symbol)
            df = await self._retry_async(
                ak.stock_individual_info_ths,
                normalized_symbol,
            )
            if df is None or df.empty:
                raise AkshareAPIError(f"No company info for {symbol}")
            return self._parse_company_info(df)
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get company info for {symbol}: {str(e)}")

    async def get_stock_list(self) -> list[dict[str, Any]]:
        try:
            df = await self._retry_async(ak.stock_zh_a_spot_em)
            if df is None or df.empty:
                raise AkshareAPIError("No stock list data available")
            result = []
            for _, row in df.iterrows():
                code = str(row.get("代码", ""))
                name = str(row.get("名称", ""))
                industry = str(row.get("行业", "")) if pd.notna(row.get("行业")) else None
                listing_status = (
                    str(row.get("上市状态", "上市")) if pd.notna(row.get("上市状态")) else "上市"
                )
                result.append(
                    {
                        "code": code,
                        "name": name,
                        "industry": industry,
                        "listing_status": listing_status,
                    }
                )
            return result
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get stock list: {str(e)}")

    async def get_financial_data(
        self, symbol: str, period: str = "annual", years: int = 5
    ) -> dict[str, Any]:
        try:
            normalized_symbol = self._normalize_symbol(symbol)

            income_df = await self._retry_async(
                ak.stock_profit_sheet_by_report_em,
                normalized_symbol,
            )

            balance_df = await self._retry_async(
                ak.stock_balance_sheet_by_report_em,
                normalized_symbol,
            )

            result = {}
            if income_df is not None and not income_df.empty:
                result["income"] = income_df.to_dict(orient="list")
            if balance_df is not None and not balance_df.empty:
                result["balance"] = balance_df.to_dict(orient="list")

            if not result:
                raise AkshareAPIError(f"No financial data for {symbol}")

            return result
        except AkshareAPIError:
            raise
        except Exception as e:
            raise AkshareAPIError(f"Failed to get financial data for {symbol}: {str(e)}")

    async def get_financial_indicator(
        self, symbol: str, period: str = "annual", years: int = 5
    ) -> dict[str, Any]:
        try:
            end_year = pd.Timestamp.now().year
            start_year = end_year - years + 1
            df = await self.get_financial_indicators(symbol, start_year, end_year)
            if df is None or df.empty:
                return {}
            return cast(dict[str, Any], df.to_dict(orient="list"))
        except AkshareAPIError:
            return {}
        except Exception as e:
            raise AkshareAPIError(f"Failed to get financial indicator for {symbol}: {str(e)}")

    async def get_market_capital(self, symbol: str) -> Optional[float]:
        try:
            normalized_symbol = self._normalize_symbol(symbol)
            df = await self._retry_async(
                ak.stock_individual_info_em,
                normalized_symbol,
            )
            if df is None or df.empty:
                return None
            info_dict = {}
            for _, row in df.iterrows():
                if "item" in df.columns and "value" in df.columns:
                    info_dict[row["item"]] = row["value"]

            market_cap_str = info_dict.get("总市值") or info_dict.get("流通市值")
            if market_cap_str:
                market_cap_str = str(market_cap_str).replace(",", "")
                if "亿" in market_cap_str:
                    return float(market_cap_str.replace("亿", "")) * 1e8
                elif "万" in market_cap_str:
                    return float(market_cap_str.replace("万", "")) * 1e4
            return None
        except AkshareAPIError:
            return None
        except Exception:
            return None

    async def get_industry_csrc(self) -> list[dict[str, Any]]:
        try:
            df = await self._retry_async(ak.stock_info_csrc_main)
            if df is None or df.empty:
                return []
            result = []
            for _, row in df.iterrows():
                result.append(
                    {
                        "code": str(row.get("股票代码", "")),
                        "name": str(row.get("股票简称", "")),
                        "industry_csrc": str(row.get("行业分类", "")),
                    }
                )
            return result
        except AkshareAPIError:
            return []
        except Exception:
            return []

    async def get_industry_sw_one(self) -> list[dict[str, Any]]:
        try:
            df = await self._retry_async(ak.sw_index_one)
            if df is None or df.empty:
                return []
            result = []
            for _, row in df.iterrows():
                result.append(
                    {
                        "code": str(row.get("行业代码", "")),
                        "name": str(row.get("行业名称", "")),
                        "level": "1",
                    }
                )
            return result
        except AkshareAPIError:
            return []
        except Exception:
            return []

    async def get_industry_sw_three(self) -> list[dict[str, Any]]:
        try:
            df = await self._retry_async(ak.sw_index_three)
            if df is None or df.empty:
                return []
            result = []
            for _, row in df.iterrows():
                result.append(
                    {
                        "code": str(row.get("行业代码", "")),
                        "name": str(row.get("行业名称", "")),
                        "level": "3",
                    }
                )
            return result
        except AkshareAPIError:
            return []
        except Exception:
            return []

    async def get_industry_peers(self, symbol: str, industry_type: str = "csrc") -> list[str]:
        try:
            normalized_symbol = self._normalize_symbol(symbol)
            if industry_type == "csrc":
                df = await self._retry_async(ak.stock_info_csrc_main)
                if df is None or df.empty:
                    return []
                company_industry = None
                for _, row in df.iterrows():
                    if str(row.get("股票代码", "")) == normalized_symbol.replace("SH", "").replace(
                        "SZ", ""
                    ).replace("BJ", ""):
                        company_industry = str(row.get("行业分类", ""))
                        break
                if not company_industry:
                    return []
                peers = []
                for _, row in df.iterrows():
                    if str(row.get("行业分类", "")) == company_industry:
                        peer_code = str(row.get("股票代码", ""))
                        if not peer_code.startswith(("SH", "SZ", "BJ")):
                            if peer_code.startswith(("6", "5", "9")):
                                peer_code = f"SH{peer_code}"
                            elif peer_code.startswith(("0", "1", "2", "3", "4")):
                                peer_code = f"SZ{peer_code}"
                        peers.append(peer_code)
                return peers
            return []
        except AkshareAPIError:
            return []
        except Exception:
            return []

    def _normalize_symbol(self, symbol: str) -> str:
        symbol = symbol.strip().upper()
        if symbol.startswith(("SH", "SZ", "BJ")):
            return symbol
        if symbol.startswith(("6", "5", "9")):
            return f"SH{symbol}"
        if symbol.startswith(("0", "1", "2", "3", "4")):
            return f"SZ{symbol}"
        if symbol.startswith(("8", "4")):
            return f"BJ{symbol}"
        return symbol

    def _filter_by_year(self, df: pd.DataFrame, start_year: int, end_year: int) -> pd.DataFrame:
        date_col = None
        for col in ["报告日期", "日期", "time", "date"]:
            if col in df.columns:
                date_col = col
                break
        if date_col is None:
            return df
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col])
        return df[(df[date_col].dt.year >= start_year) & (df[date_col].dt.year <= end_year)]

    def _parse_company_info(self, df: pd.DataFrame) -> dict[str, Any]:
        result = {}
        for _, row in df.iterrows():
            if "item" in df.columns and "value" in df.columns:
                result[row["item"]] = row["value"]
            else:
                result[row.iloc[0]] = row.iloc[1]
        return result


akshare_client = AkshareClient()
