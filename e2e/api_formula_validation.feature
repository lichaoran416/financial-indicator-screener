# language: zh-CN
功能: POST /api/v1/formula/validate 公式校验API

  背景:
    假如 系统正常运行
    并且 API服务已启动
    并且 请求头 Content-Type 为 "application/json"

  场景: 有效公式校验返回valid=true
    假如 请求体包含公式 "净利润 / 营业收入"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 有效公式包含单个指标引用
    假如 请求体包含公式 "市盈率"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 无效语法返回错误信息
    假如 请求体包含无效公式 "净利润 / / 营业收入"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false
    并且 响应体中 "error" 应包含 "语法错误"

  场景: 括号不匹配返回错误
    假如 请求体包含公式 "净利润 / (营业收入"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false
    并且 响应体中 "error" 应包含 "括号"

  场景: 空公式处理
    假如 请求体包含空公式 ""
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false
    并且 响应体中 "error" 应包含 "空公式"

  场景: 空公式处理-仅空格
    假如 请求体包含公式 "   "
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false

  场景: 缺少指标引用处理-未知指标名
    假如 请求体包含公式 "某未知指标 + 营业收入"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false
    并且 响应体中 "error" 应包含 "未知指标"

  场景: 缺少指标引用处理-部分指标不存在
    假如 请求体包含公式 "净利润 + 不存在的指标"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 false
    并且 响应体中 "error" 应包含 "不存在"

  场景: 支持内置函数AVG
    假如 请求体包含公式 "AVG(市盈率, 市净率, 每股收益)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 支持内置函数SUM
    假如 请求体包含公式 "SUM(净利润, 营业利润, 净利润)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 支持内置函数MIN
    假如 请求体包含公式 "MIN(市盈率, 市净率)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 支持内置函数MAX
    假如 请求体包含公式 "MAX(每股收益, 每股净资产)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 支持内置函数STD
    假如 请求体包含公式 "STD(市盈率)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 内置函数嵌套使用
    假如 请求体包含公式 "AVG(SUM(净利润, 营业利润), 每股收益)"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 混合使用函数和运算符
    假如 请求体包含公式 "AVG(市盈率, 市净率) / 每股收益"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 除零错误检测
    假如 请求体包含公式 "净利润 / 0"
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 200
    并且 响应体中 "valid" 应为 true
    并且 响应体中 "error" 应为空

  场景: 缺失必需参数
    假如 请求体不包含 formula 字段
    当 用户发送POST请求到 "/api/v1/formula/validate"
    那么 响应状态码应为 400
    并且 响应体应包含错误信息 "formula"

  例子: 各种有效公式验证
    | 公式                              |
    | 净利润 / 营业收入                 |
    | 市盈率 + 市净率                   |
    | (净利润 - 营业成本) / 营业收入    |
    | AVG(市盈率, 市净率)               |
    | MIN(净利润, 营业利润) / 营业收入  |
