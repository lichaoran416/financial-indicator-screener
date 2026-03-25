# language: zh-CN
功能: API参数验证

  背景:
    假设 API 服务运行在 "http://localhost:8000"
    假设 Redis 缓存服务可用

  场景: 筛选API验证条件数组结构
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "gt", "value": 10}
        ]
      }
      """
    那么 响应状态码应为 200
    且 响应包含 "results" 字段

  场景: 缺少必填字段时返回422错误
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "gt"}
        ]
      }
      """
    那么 响应状态码应为 422
    且 响应包含错误详情 "value" 为必填字段

  场景: 无效操作符返回422错误
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "invalid_op", "value": 10}
        ]
      }
      """
    那么 响应状态码应为 422
    且 响应包含错误信息包含 "operator"

  场景: 无效指标名称返回400错误
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "invalid_metric_name", "operator": "gt", "value": 10}
        ]
      }
      """
    那么 响应状态码应为 400
    且 响应包含错误信息 "metric" 相关

  场景: 周期验证-年份超出范围
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "gt", "value": 10}
        ],
        "period": "annual",
        "years": 100
      }
      """
    那么 响应状态码应为 422
    且 响应包含验证错误 "years" 超出有效范围

  场景: 周期验证-无效周期类型
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "gt", "value": 10}
        ],
        "period": "invalid_period"
      }
      """
    那么 响应状态码应为 422
    且 响应包含 "period" 验证错误

  场景: 空条件数组返回验证错误
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": []
      }
      """
    那么 响应状态码应为 422
    且 响应包含 "conditions" 不能为空

  场景: 支持的操作符列表完整
    假设 有效操作符为 "eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in"
    当 用户发送 POST 请求到 "/api/v1/screen" 带以下JSON数据
      """
      {
        "conditions": [
          {"metric": "pe_ratio", "operator": "in", "value": [5, 10, 15]}
        ]
      }
      """
    那么 响应状态码应为 200
