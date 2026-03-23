import asyncio
from typing import Any, Optional
import pandas as pd
import akshare as ak


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
