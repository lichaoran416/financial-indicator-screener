## Topic 3: 数据来源 (Data Source)

### akshare 集成
**数据获取方式**: 通过 akshare Python 库获取A股财务数据

**主要接口**:
```
akshare.stock_financial_analysis_indicator()  # 财务指标
akshare.stock_financial_report_sina()        # 财务报表
akshare.stock_zh_a_hist()                     # 股票历史行情
```

### 数据更新策略
- **缓存策略**: Redis缓存，TTL 24小时
- **手动刷新**: 用户可触发强制更新
- **数据延迟**: 财报数据按实际披露时间更新
