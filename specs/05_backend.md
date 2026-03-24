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
  "logic": "and",
  "sort_by": "roi",
  "order": "desc",
  "sort_by_2": "roe",
  "order_2": "desc",
  "limit": 100,
  "page": 1,
  "industry": null,
  "exclude_industry": null,
  "industries": null,
  "exclude_industries": null,
  "include_suspended": false,
  "profit_only": false,
  "include_st": true,
  "require_complete_data": false
}
Response: {
  "companies": [
    {
      "code": "000001",
      "name": "平安银行",
      "status": "ACTIVE",
      "risk_flag": "NORMAL",
      "industry": "银行",
      "metrics": {"roi": 15.5, "roe": 12.3, ...},
      "available_years": 5
    }
  ],
  "total": 150
}
```

#### 获取公司详情
```
GET /api/v1/company/{stock_code}
Response: {
  "code": "000001",
  "name": "平安银行",
  "industry": "银行",
  "status": "ACTIVE",
  "risk_flag": "NORMAL",
  "metrics": {...}
}
```

#### 获取财报披露日期
```
POST /api/v1/company/disclosure-dates
Request: {
  "codes": ["000001", "600000"],
  "period": "annual"
}
Response: {
  "companies": [
    {
      "code": "000001",
      "name": "平安银行",
      "disclosure_dates": {
        "annual": {
          "2024": {"report_date": "2025-04-30", "disclosure_date": "2025-04-30"},
          "2023": {"report_date": "2024-04-30", "disclosure_date": "2024-04-30"}
        },
        "quarterly": {
          "2024Q1": {"report_date": "2025-04-30", "disclosure_date": "2025-04-30"}
        }
      }
    }
  ]
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
Response: {
  "id": "uuid",
  "name": "高ROI公司",
  "conditions": [...],
  "created_at": "2024-01-01T00:00:00"
}
```

#### 获取已保存的筛选
```
GET /api/v1/screen/saved
Response: [
  {
    "id": "uuid",
    "name": "高ROI公司",
    "conditions": [...],
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### 删除已保存的筛选
```
DELETE /api/v1/screen/saved/{screen_id}
Response: {"deleted": true}
```

#### 获取CSRC行业分类
```
GET /api/v1/industry/csrc
Response: [
  {"code": "A", "name": "农、林、牧、渔业", "level": "csrc"},
  {"code": "B", "name": "采矿业", "level": "csrc"},
  ...
]
```

#### 获取申万一级行业分类
```
GET /api/v1/industry/sw-one
Response: [
  {"code": "801010", "name": "农林牧渔", "level": "1"},
  ...
]
```

#### 获取申万三级行业分类
```
GET /api/v1/industry/sw-three
Response: [
  {"code": "801010", "name": "林业", "level": "3"},
  ...
]
```

#### 获取同花顺行业分类
```
GET /api/v1/industry/ths
Response: [
  {"code": "881001", "name": "银行", "level": "ths"},
  ...
]
```

#### 同行对比分析
```
POST /api/v1/company/compare
Request: {
  "code": "000001",
  "industry_type": "csrc",
  "metrics": ["roi", "roe", "gross_margin"]
}
Response: {
  "code": "000001",
  "name": "平安银行",
  "industry": "银行",
  "peers_count": 42,
  "metrics": [
    {
      "metric": "roi",
      "value": 15.5,
      "industry_avg": 12.3,
      "industry_median": 11.8,
      "percentile": 75.5
    }
  ]
}
```

#### 多公司趋势对比
```
POST /api/v1/company/trend
Request: {
  "codes": ["000001", "600000"],
  "metrics": ["roi", "roe"],
  "period": "annual",
  "years": 5
}
Response: {
  "companies": [
    {
      "code": "000001",
      "name": "平安银行",
      "trends": [
        {
          "metric": "roi",
          "data": [
            {"date": "2019", "value": 12.5},
            {"date": "2020", "value": 13.1},
            ...
          ]
        }
      ]
    }
  ],
  "period": "annual",
  "years": 5
}
```

#### 验证公式语法
```
POST /api/v1/formula/validate
Request: {
  "formula": "roe / roi"
}
Response: {
  "valid": true,
  "error": null,
  "ast": {...}
}
```

#### 计算公式结果
```
POST /api/v1/formula/evaluate
Request: {
  "formula": "roe / roi",
  "metrics": {"roe": 12.5, "roi": 8.3}
}
Response: {
  "success": true,
  "error": null,
  "result": 1.506
}
```

#### 保存自定义公式
```
POST /api/v1/formula/save
Request: {
  "name": "资产收益率",
  "formula": "roe / debt_ratio",
  "description": "ROE除以负债率"
}
Response: {
  "id": "uuid",
  "name": "资产收益率",
  "formula": "roe / debt_ratio",
  "description": "ROE除以负债率",
  "created_at": "2024-01-01T00:00:00"
}
```

#### 获取已保存的公式
```
GET /api/v1/formula/saved
Response: [
  {
    "id": "uuid",
    "name": "资产收益率",
    "formula": "roe / debt_ratio",
    "description": "ROE除以负债率",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### 更新自定义公式
```
PUT /api/v1/formula/{formula_id}
Request: {
  "name": "新的名称",
  "formula": "新的公式",
  "description": "新的描述"
}
Response: {
  "id": "uuid",
  "name": "新的名称",
  "formula": "新的公式",
  "description": "新的描述",
  "created_at": "2024-01-01T00:00:00"
}
```

#### 删除自定义公式
```
DELETE /api/v1/formula/{formula_id}
Response: {"deleted": true}
```

#### 刷新缓存
```
POST /api/v1/cache/refresh
Response: {"status": "success", "message": "Cache refreshed, cleared 123 keys"}
```
