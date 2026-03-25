# language: zh-CN
功能: JTB-010 处理数据缺失

  背景:
    假设 系统已连接数据源
    假设 筛选API支持 "require_complete_data" 参数
    假设 系统返回数据包含 "available_years" 字段

  场景: U01-010-01 缺失数据显示为N/A
    当 数据中缺少某个字段值
    那么 该字段显示为 "N/A"
    或者 使用虚线 "--" 表示

  场景: U01-010-02 缺失数据显示为虚线
    当 用户查看财务指标图表
    那么 缺失数据点使用虚线连接
    或者 显示为断点

  场景: U01-010-03 可选"要求完整数据"过滤器
    当 用户开启 "要求完整数据" 过滤器
    那么 筛选结果仅包含所有年份数据完整的公司
    并且 API请求包含 "require_complete_data": true

  场景: U01-010-04 缺失年份在结果中标注
    当 公司缺少某些年份数据
    那么 结果列表中标注缺失的年份
    并且 标注使用星号或特定颜色标记

  场景: U01-010-05 API返回可用年份信息
    当 调用筛选API
    那么 返回数据包含 "available_years" 字段
    并且 标识每个公司实际拥有数据的年份

  场景: U01-010-06 筛选API处理require_complete_data参数
    当 调用筛选API且 require_complete_data=false
    那么 返回所有公司无论数据是否完整
    当 调用筛选API且 require_complete_data=true
    那么 仅返回所有必需年份数据完整的公司
