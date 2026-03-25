# language: zh-CN
功能: JTB-011 行业分类展示

  背景:
    假设 系统已启动
    并且 API服务运行在 http://localhost:8000
    并且 用户已打开股票分析系统

  场景: 获取CSRC行业分类列表
    当 用户请求获取CSRC行业分类
    那么 API返回 /api/v1/industry/csrc 数据
    And 返回数据包含门类、大类、中类三个层级
    And 每个分类项包含 code 和 name 字段
    And 响应状态码为 200

  场景: 获取申万一级行业分类
    当 用户请求获取申万一级行业分类
    Then API返回 /api/v1/industry/sw-one 数据
    And 返回数据为L1级别行业分类
    And 每个分类项包含 code 和 name 字段
    And 响应状态码为 200

  场景: 获取申万三级行业分类
    当 用户请求获取申万三级行业分类
    Then API返回 /api/v1/industry/sw-three 数据
    And 返回数据为L3级别行业分类
    And 每个分类项包含 code 和 name 字段
    And 响应状态码为 200

  场景: 获取同花顺行业分类
    当 用户请求获取同花顺行业分类
    Then API返回 /api/v1/industry/ths 数据
    And 每个分类项包含 code 和 name 字段
    And 响应状态码为 200

  场景: 查看公司详情时显示行业分类信息
    假设 存在股票代码为 "000001" 的公司
    当 用户查看该公司详情
    Then 响应数据包含行业分类信息
    And 显示该公司所属的CSRC行业
    And 显示该公司所属的申万行业
    And 显示该公司所属的同花顺行业
    And 行业信息来自不同的分类体系可切换查看

  场景: 行业分类数据缓存
    假设 CSRC行业分类数据已被缓存
    When 用户再次请求获取CSRC行业分类
    Then API从缓存返回数据
    And 响应时间更短
    And 数据内容与首次请求一致

  场景: 不同行业分类体系的区别显示
    When 用户查看CSRC分类
    Then 显示"门类-大类-中类"层级结构
    When 用户查看申万分类
    Then 显示L1和L3两个级别的分类
    When 用户查看同花顺分类
    Then 显示同花顺自定义行业分类
