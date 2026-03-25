# language: zh-CN
功能: 保存/获取/删除筛选条件API
  作为前端应用
  我需要通过API管理已保存的筛选条件
  以便用户在界面上查看和使用

  背景:
    假如 API服务已启动
    并且 Redis缓存服务已运行

  场景: 保存有效的筛选条件
    假如 用户设置了一个筛选条件
      | 字段 | 值 |
      | name | 低估值高成长 |
      | conditions | [{"field":"pe","operator":"lt","value":20}] |
      | tags | 价值投资,高成长 |
    当 发送POST请求到 /api/v1/screen/save
    那么 响应状态码为200
    并且 响应包含筛选条件ID
    并且 响应消息为"保存成功"

  场景: 保存筛选条件时不提供name参数
    假如 用户设置了筛选条件但未提供name
      | 字段 | 值 |
      | conditions | [{"field":"pe","operator":"lt","value":20}] |
    当 发送POST请求到 /api/v1/screen/save
    那么 响应状态码为400
    并且 响应消息包含"name为必填字段"

  场景: 保存筛选条件时name为空字符串
    假如 用户设置了筛选条件但name为空
      | 字段 | 值 |
      | name |   |
      | conditions | [{"field":"pe","operator":"lt","value":20}] |
    当 发送POST请求到 /api/v1/screen/save
    那么 响应状态码为400
    并且 响应消息包含"name不能为空"

  场景: 获取已保存的筛选条件列表
    假如 系统中已存在以下筛选条件:
      | name | tags |
      | 低估值高成长 | 价值投资 |
      | 稳健收益型 | 稳健 |
    当 发送GET请求到 /api/v1/screen/saved
    那么 响应状态码为200
    并且 响应包含2个筛选条件
    并且 列表中包含"低估值高成长"
    并且 列表中包含"稳健收益型"

  场景: 获取空的筛选条件列表
    假如 系统中没有保存任何筛选条件
    当 发送GET请求到 /api/v1/screen/saved
    那么 响应状态码为200
    并且 响应列表为空

  场景: 删除已存在的筛选条件
    假如 系统中已存在一个筛选条件
      | name |
      | 测试筛选 |
    并且 该筛选条件的ID为 "test_screen_id_001"
    当 发送DELETE请求到 /api/v1/screen/saved/test_screen_id_001
    那么 响应状态码为200
    并且 响应消息为"删除成功"
    当 发送GET请求到 /api/v1/screen/saved
    那么 该筛选条件不再出现在列表中

  场景: 删除不存在的筛选条件ID
    假如 系统中不存在ID为 "non_existent_id_999"
    当 发送DELETE请求到 /api/v1/screen/saved/non_existent_id_999
    那么 响应状态码为404
    并且 响应消息包含"筛选条件不存在"

  场景: 删除已存在的筛选条件后再次删除
    假如 系统中已存在一个筛选条件
      | name |
      | 待删除筛选 |
   并且 该筛选条件的ID为 "to_be_deleted_id"
   当 发送DELETE请求到 /api/v1/screen/saved/to_be_deleted_id
   那么 响应状态码为200
   当 再次发送DELETE请求到 /api/v1/screen/saved/to_be_deleted_id
   那么 响应状态码为404
   并且 响应消息包含"筛选条件不存在"

  场景: 保存多个筛选条件后获取列表
    假如 用户依次保存了以下筛选条件:
      | name | conditions |
      | 筛选A | [{"field":"pe","operator":"lt","value":15}] |
      | 筛选B | [{"field":"pb","operator":"lt","value":2}] |
      | 筛选C | [{"field":"roe","operator":"gt","value":10}] |
    当 发送GET请求到 /api/v1/screen/saved
    那么 响应状态码为200
    并且 响应包含3个筛选条件
    并且 列表按创建时间降序排列

  场景: 使用无效的筛选条件格式保存
    假如 用户设置了无效格式的筛选条件
      | 字段 | 值 |
      | name | 测试 |
      | conditions | invalid_format |
    当 发送POST请求到 /api/v1/screen/save
    那么 响应状态码为400
    并且 响应消息包含"无效的筛选条件格式"

  场景: 保存带特殊字符名称的筛选条件
    假如 用户设置了包含特殊字符的名称
      | 字段 | 值 |
      | name | 测试"筛选'<>& |
      | conditions | [{"field":"pe","operator":"lt","value":20}] |
    当 发送POST请求到 /api/v1/screen/save
    那么 响应状态码为200
    并且 响应消息为"保存成功"
    当 发送GET请求到 /api/v1/screen/saved
    那么 返回的筛选条件名称正确转义

  例子:
    | 操作类型 | 端点 | 方法 |
    | 保存筛选 | /api/v1/screen/save | POST |
    | 获取列表 | /api/v1/screen/saved | GET |
    | 删除筛选 | /api/v1/screen/saved/{id} | DELETE |
