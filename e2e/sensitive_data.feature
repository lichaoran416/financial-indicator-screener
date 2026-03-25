# language: zh-CN
功能: 敏感信息保护

  背景: 
    假设 后端服务已启动
    并且 敏感信息过滤功能已启用

  场景: 自动过滤密码字段
    当 日志记录包含用户登录请求
    令 请求体为{"username":"user1","password":"secret123"}"
    那么 日志中的password值应被替换为"***"
    并且 过滤后的日志应为{"username":"user1","password":"***"}"

  场景: 自动过滤API密钥和令牌
    当 日志记录包含API请求
    令 请求头为{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"}"
    那么 Authorization令牌应被部分掩码显示
    并且 不应暴露完整的令牌内容

  场景: 自动过滤内部IP地址
    当 日志记录包含内部系统调用信息
    令 内部IP为"192.168.1.100"
    那么 日志中的内部IP应被替换为"***.***.***.***"
    并且 不应暴露真实的内部网络地址

  场景: 过滤数据库连接字符串中的密码
    当 日志记录数据库连接信息
    令 连接字符串为"postgresql://user:password123@localhost:5432/db"
    那么 日志中的密码部分应被替换为"***"
    并且 过滤后应为"postgresql://user:***@localhost:5432/db"

  场景: 过滤请求头中的Cookie信息
    当 日志记录请求头
    令 Cookie为"session=abc123; token=xyz789"
    那么 Cookie值应被完全过滤
    并且 不应出现在日志输出中

  场景: 可配置的敏感字段白名单
    当 管理员配置敏感字段列表
    那么 系统应只过滤列表中定义的字段
    并且 非敏感字段应正常记录

  场景: 日志中发现敏感信息泄露时记录警告
    当 敏感信息过滤失败或遗漏
    那么 系统应记录安全警告
    并且 警告应提示需要人工审查
