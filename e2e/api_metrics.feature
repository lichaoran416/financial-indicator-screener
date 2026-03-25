# language: zh-CN

功能: GET /api/v1/metrics 指标列表API
  作为前端开发者
  我需要获取股票指标列表
  以便在筛选器中展示可选的财务指标

  背景:
    假如 API 服务已启动
    并且 Redis 缓存服务已启动

  场景: 获取所有指标列表
    假如 用户未指定任何筛选条件
    当 发送 GET 请求到 /api/v1/metrics
    那么 响应状态码应为 200
    并且 响应 body 应包含指标列表
    并且 指标列表长度应大于 0
    并且 每个指标应包含 id, name, category 字段

  场景: 按类别筛选指标
    假如 用户指定 category 参数为 " profitability "
    当 发送 GET 请求到 /api/v1/metrics?category=profitability
    那么 响应状态码应为 200
    并且 响应 body 中的指标 category 字段值应为 " profitability "
    并且 响应时间应少于 500ms

  场景: 指标结构验证
    假如 用户请求获取所有指标
    当 发送 GET 请求到 /api/v1/metrics
    那么 每个指标应包含必填字段 id
    并且 每个指标应包含必填字段 name
    并且 每个指标应包含必填字段 category
    并且 id 字段类型应为字符串或数字
    并且 name 字段类型应为字符串
    并且 category 字段类型应为字符串

  场景: 缓存命中 - 第二次请求相同参数
    假如 用户首次请求 /api/v1/metrics?category=valuation
    当 再次发送 GET 请求到 /api/v1/metrics?category=valuation
    那么 响应状态码应为 200
    并且 第二次响应时间应快于首次响应时间
    并且 两次响应的指标列表应完全一致

  场景: 缓存未命中 - 不同参数请求
    假如 用户请求 category=profitability 的指标
    当 发送 GET 请求到 /api/v1/metrics?category=profitability
    那么 响应状态码应为 200
    并且 缓存中应记录此次请求的 key
    假如 用户请求 category=growth 的指标
    当 发送 GET 请求到 /api/v1/metrics?category=growth
    那么 响应状态码应为 200
    并且 返回的指标列表应与 category=profitability 的结果不同

  例子:
    | category      | 预期包含的指标关键词 |
    | profitability | 毛利率, 净利率, ROE   |
    | valuation     | 市盈率, 市净率        |
    | growth        | 营收增长率, 净利润增长率 |
    | liquidity     | 流动比率, 速动比率    |
