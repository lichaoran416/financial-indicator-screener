# language: zh-CN

功能: 行业分类API
  作为前端开发者和数据分析师
  我需要通过API获取各种行业分类数据
  以便进行行业分析和公司对比

  背景:
    假如 API 服务已启动
    并且 Redis 缓存服务已启动
    并且 基础 URL 为 "http://localhost:8000"

  规则: 行业分类数据必须正确返回

    场景: 获取证监会行业分类
      当 我发送 GET 请求到 "/api/v1/industry/csrc"
      那么 响应状态码应为 200
      并且 响应体应包含行业分类数据
      并且 响应时间应小于 3 秒

    场景: 获取申万一级行业分类
      当 我发送 GET 请求到 "/api/v1/industry/sw-one"
      那么 响应状态码应为 200
      并且 响应体应包含申万一级行业列表
      并且 每个行业应包含 "code" 和 "name" 字段

    场景: 获取申万三级行业分类
      当 我发送 GET 请求到 "/api/v1/industry/sw-three"
      那么 响应状态码应为 200
      并且 响应体应包含申万三级行业列表
      并且 响应数据应包含层级关系

    场景: 获取同花顺行业分类
      当 我发送 GET 请求到 "/api/v1/industry/ths"
      那么 响应状态码应为 200
      并且 响应体应包含同花顺行业数据
      并且 行业分类应包含板块信息

  规则: 公司对比分析功能

    场景: 同行对比分析
      假如 我有股票代码 "000001" 和 "000002"
      当 我发送 POST 请求到 "/api/v1/company/compare"
      并且 请求体为:
        """
        {
          "codes": ["000001", "000002"],
          "metrics": ["pe", "pb", "roe"]
        }
        """
      那么 响应状态码应为 200
      并且 响应体应包含对比数据
      并且 对比结果应包含两个公司的指标

    场景: 趋势对比分析
      假如 我有股票代码 "000001"
      当 我发送 POST 请求到 "/api/v1/company/trend"
      并且 请求体为:
        """
        {
          "code": "000001",
          "metrics": ["revenue", "profit"],
          "period": "quarter"
        }
        """
      那么 响应状态码应为 200
      并且 响应体应包含时间序列数据
      并且 数据应按时间排序

  规则: 缓存性能测试

    场景: 行业分类数据缓存验证
      当 我第一次请求 "/api/v1/industry/sw-one"
      那么 响应头应包含缓存相关 header

      当 我第二次请求 "/api/v1/industry/sw-one"
      那么 第二次响应时间应明显快于第一次
      并且 数据应保持一致

    场景: 缓存过期后重新获取
      假如 缓存已过期
      当 我请求行业分类 API
      那么 系统应从数据源重新获取数据
      并且 新数据应被缓存

  例子: 行业分类 API 端点验证

    | 端点                    | 预期状态码 |
    | /api/v1/industry/csrc   | 200        |
    | /api/v1/industry/sw-one | 200        |
    | /api/v1/industry/sw-three | 200      |
    | /api/v1/industry/ths    | 200        |

  场景 Outline: 各种行业分类接口性能测试

    假如 我访问 "<端点>" 接口
    当 发送 GET 请求
    那么 响应状态码应为 <预期状态码>
    并且 响应时间应小于 5 秒
    并且 响应体应为有效 JSON

    例子:
      | 端点                      | 预期状态码 |
      | /api/v1/industry/csrc     | 200        |
      | /api/v1/industry/sw-one   | 200        |
      | /api/v1/industry/sw-three | 200        |
      | /api/v1/industry/ths      | 200        |
