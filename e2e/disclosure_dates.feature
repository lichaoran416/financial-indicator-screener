# language: zh-CN
功能: 财务信息披露日期追踪

  背景:
    假设 API 服务运行在 "http://localhost:8000"
    假设 请求需要有效的认证令牌

  场景: 获取单只股票的信息披露日期
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH600519"],
        "period": "annual"
      }
      """
    那么 响应状态码应为 200
    且 响应应包含 "SH600519" 的信息披露日期
    且 每个股票应包含 "report_date" 和 "disclosure_date" 字段

  场景: 批量获取多只股票的信息披露日期
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH600519", "SH600036", "SZ000858"],
        "period": "annual"
      }
      """
    那么 响应状态码应为 200
    且 响应应包含所有请求股票的数据
    且 每只股票数据格式一致

  场景: 按年度周期获取信息披露日期
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH600519"],
        "period": "annual",
        "years": 3
      }
      """
    那么 响应应包含最近3年的年度报告披露日期
    且 数据应按年份分组

  场景: 按季度周期获取信息披露日期
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH600519"],
        "period": "quarterly"
      }
      """
    那么 响应应包含季度报告披露日期
    且 数据应按年和季度分组

  场景: 获取的信息披露日期包含年报和季报
    假设 请求 "SH600519" 的所有报告类型
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH600519"],
        "period": "all"
      }
      """
    那么 响应应包含年度报告和季度报告的披露日期
    且 每种报告类型应有明确标识

  场景: 不存在的股票代码返回空数据
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": ["SH999999"],
        "period": "annual"
      }
      """
    那么 响应状态码应为 200
    且 该代码应返回空或null数据
    且 其他有效代码的数据应正常返回

  场景: 信息披露日期格式验证
    假设 响应包含日期字段
    当 用户获取信息披露日期
    那么 "report_date" 应为有效日期格式
    且 "disclosure_date" 应为有效日期格式
    且 "disclosure_date" 应晚于或等于 "report_date"

  场景: 空股票代码数组返回400错误
    当 用户发送 POST 请求到 "/api/v1/company/disclosure-dates"
      """
      {
        "codes": [],
        "period": "annual"
      }
      """
    那么 响应状态码应为 422
    且 响应应包含 "codes" 不能为空的错误

  场景: 缓存的信息披露日期在24小时内有效
    假设 已请求过某些股票的信息披露日期
    当 用户在24小时内再次请求相同股票
    那么 响应应来自缓存
    且 响应时间应小于 500 毫秒
