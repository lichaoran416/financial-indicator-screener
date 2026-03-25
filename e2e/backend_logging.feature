# language: zh-CN
功能: JTB-101 到 JTB-108 后端日志规格

  作为后端开发者和运维人员
  我需要统一的日志记录规范
  以便追踪请求、诊断问题和监控系统健康状态

  背景:
    假如 FastAPI 应用正在运行
    并且 Redis 缓存服务已启动

  规则: 日志格式统一为结构化 JSON

    场景: JTB-101 记录API请求日志
      假如 客户端发送 GET 请求到 "/api/v1/metrics"
      当 请求被处理时
      那么 应该记录包含以下字段的日志:
        | 字段 | 描述 |
        | method | HTTP 方法 |
        | path | 请求路径 |
        | params | 查询参数 |
        | duration_ms | 请求耗时(毫秒) |

    场景: JTB-102 记录错误日志
      假如 API 端点发生异常
      当 错误被捕获时
      那么 应该记录包含以下字段的日志:
        | 字段 | 描述 |
        | error_type | 错误类型名称 |
        | stack_trace | 堆栈跟踪信息 |
        | context | 请求上下文信息 |

    场景: JTB-103 记录数据获取日志
      假如 系统从 akshare 获取数据
      当 数据获取完成时
      那么 应该记录包含以下字段的日志:
        | 字段 | 描述 |
        | source | 数据源名称(akshare) |
        | function | 调用的函数名 |
        | status | 响应状态(success/failed) |
        | response_time_ms | 响应时间 |

    场景: JTB-104 日志分级管理
      假如 日志系统已配置
      当 记录不同级别的日志时
      那么 应该根据级别正确分类:
        | 日志级别 | 使用场景 |
        | DEBUG | 调试信息,仅开发环境可见 |
        | INFO | 正常操作信息 |
        | WARNING | 警告信息,但不影响功能 |
        | ERROR | 错误信息,功能受影响 |
        | CRITICAL | 严重错误,系统不可用 |

    场景: JTB-105 结构化JSON日志输出
      假如 日志记录器已配置为 JSON 格式
      当 记录日志时
      那么 输出应该符合以下 JSON 结构:
        """
        {
          "timestamp": "2026-03-25T10:30:00.000Z",
          "level": "INFO",
          "message": "日志消息",
          "request_id": "uuid",
          "额外字段": "其他上下文数据"
        }
        """

    场景: JTB-106 请求追踪(UUID贯穿整个请求)
      假如 客户端发送请求到 API
      当 请求进入系统时
      那么 应该生成唯一的 request_id (UUID)
     并且 该 request_id 应该贯穿整个请求链路
     并且 所有相关日志都应包含此 request_id

    场景: JTB-107 敏感信息保护
      假如 请求包含敏感信息
      当 日志记录时
      那么 以下敏感字段应该被脱敏:
        | 字段 | 脱敏规则 | 示例 |
        | password | 显示为 **** | "****" |
        | token | 只显示前4位 | "eyJ****" |
        | ip | 只显示第一段 | "192.xxx.xxx.xxx" |
      但是 脱敏后的值仍应可被识别

    场景: JTB-108 慢请求告警
      假如 配置了慢请求阈值(默认 1000ms)
      当 请求耗时超过阈值时
      那么 应该记录 WARNING 级别日志
     并且 日志应包含:
        | 字段 | 描述 |
        | threshold_ms | 配置的阈值 |
        | actual_duration_ms | 实际耗时 |
        | slow_request | true |
