## Topic 3: 数据来源 (Data Source)

### aksshare 集成
**数据获取方式**: 通过 akshare Python 库获取A股财务数据

**主要接口**:
```
akshare.stock_financial_analysis_indicator()  # 财务指标分析
akshare.stock_profit_sheet_by_report_em()      # 利润表（通过akshare_client.get_financial_data）
akshare.stock_balance_sheet_by_report_em()      # 资产负债表（通过akshare_client.get_financial_data）
akshare.stock_zh_a_hist()                      # 股票历史行情
akshare.stock_individual_info_em()              # 公司基本信息
akshare.stock_zh_a_spot_em()                   # A股实时行情
akshare.stock_industry_category_cninfo()       # 证监会行业分类
akshare.stock_board_industry_name_ths()        # 同花顺行业分类
akshare.sw_index_one()                         # 申万一级行业
akshare.sw_index_three()                       # 申万三级行业
```

**akshare_client 封装**:
- `get_financial_indicators()` - 获取财务指标（调用 `stock_financial_analysis_indicator`）
- `get_financial_statements()` - 获取财务报表（调用 `stock_financial_report_sina`）
- `get_financial_data()` - 获取财务数据（调用 `stock_profit_sheet_by_report_em` 和 `stock_balance_sheet_by_report_em`）
- `get_company_info()` - 获取公司信息（调用 `stock_individual_info_em`）
- `get_stock_list()` - 获取股票列表（调用 `stock_zh_a_spot_em`）
- `get_industry_csrc()` - 获取证监会行业分类
- `get_industry_ths()` - 获取同花顺行业分类
- `get_industry_sw_one()` - 获取申万一级行业
- `get_industry_sw_three()` - 获取申万三级行业
- `get_industry_peers()` - 获取同行业公司列表

### 数据更新策略
- **缓存策略**: Redis缓存，TTL 24小时
- **手动刷新**: 用户可触发强制更新（`POST /api/v1/cache/refresh`）
- **数据延迟**: 财报数据按实际披露时间更新
