# language: zh-CN
功能: 结构化日志输出

  背景: 
    假设 后端服务已启动
    并且 日志系统配置为JSON格式输出

  场景: 输出包含标准时间戳字段
    当 记录任意日志
    那么 JSON输出应包含"timestamp"字段
    并且 时间戳格式应为ISO8601标准

  场景: 输出包含日志级别字段
    当 记录不同级别的日志
    那么 JSON输出应包含"level"字段
    并且 level值应为DEBUG/INFO/WARNING/ERROR/CRITICAL之一

  场景: 输出包含模块名称字段
    当 从api模块记录日志
    那么 JSON输出应包含"module"字段
    并且 module值应为"api"

  场景: 输出包含消息内容字段
    当 记录日志消息"请求处理完成"
    那么 JSON输出应包含"message"字段
    并且 message值应为"请求处理完成"

  场景: 输出包含请求ID字段
    当 处理HTTP请求时记录日志
    那么 JSON输出应包含"request_id"字段
    并且 request_id应为UUIDv4格式

  场景: 完整JSON结构示例
    当 记录一条完整的结构化日志
    那么 JSON输出应包含:
      | 字段名 | 说明 |
      | timestamp | ISO8601格式时间戳 |
      | level | 日志级别 |
      | module | 模块名称 |
      | message | 日志消息 |
      | request_id | 请求追踪ID |
      | duration_ms | 请求耗时（毫秒） |
    并且 JSON输出应为有效格式

  场景: 促进日志聚合与分析
    当 系统产生大量日志
    那么 日志格式应支持日志聚合平台直接导入
    并且 每个日志条目的结构应保持一致
