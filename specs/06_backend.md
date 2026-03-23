## Topic 6: 后端API规格 (Backend)

### API 端点

#### 筛选公司
```
POST /api/v1/screen
Request: {
  "conditions": [
    {
      "metric": "roi",
      "operator": ">",
      "value": 30,
      "period": "annual",
      "years": 5
    }
  ],
  "sort_by": "roi",
  "order": "desc",
  "limit": 100
}
Response: {
  "companies": [...],
  "total": 150
}
```

#### 获取公司详情
```
GET /api/v1/company/{stock_code}
Response: {
  "code": "000001",
  "name": "平安银行",
  "metrics": {...}
}
```

#### 获取指标列表
```
GET /api/v1/metrics
Response: {
  "metrics": [
    {"id": "roi", "name": "投资回报率", "category": "profitability"},
    ...
  ]
}
```

#### 保存筛选条件
```
POST /api/v1/screen/save
Request: {
  "name": "高ROI公司",
  "conditions": [...]
}
```

#### 获取已保存的筛选
```
GET /api/v1/screen/saved
```
