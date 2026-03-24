## Topic 4: 技术架构 (Technical Architecture)

### 技术栈
- **前端**: Solid.js + Solid Router + Vite
- **后端**: FastAPI (Python 3.10+)
- **缓存**: Redis
- **数据源**: akshare

### 系统架构图
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   FastAPI   │────▶│    Redis    │
│  (Solid.js) │◀────│   Backend   │◀────│   (Cache)   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   akshare   │
                   │  (数据源)    │
                   └─────────────┘
```

### 项目目录结构

```
stock-analysis-1/
├── src/
│   ├── frontend/                    # Solid.js 前端
│   │   ├── src/
│   │   │   ├── components/         # 可复用UI组件
│   │   │   │   ├── common/         # 通用组件
│   │   │   │   ├── condition/      # 条件配置组件
│   │   │   │   ├── results/        # 结果展示组件
│   │   │   │   ├── visualization/  # 图表组件
│   │   │   │   └── comparison/     # 对比组件
│   │   │   ├── pages/              # 页面组件
│   │   │   ├── stores/             # 状态管理
│   │   │   ├── api/                # API客户端
│   │   │   └── lib/                # 工具函数和类型
│   │   ├── tests/                  # 前端测试
│   │   └── dist/                   # 生产构建输出
│   │
│   └── backend/                    # FastAPI 后端
│       ├── app/
│       │   ├── api/
│       │   │   └── v1/
│       │   │       ├── endpoints/  # API路由
│       │   │       └── router.py   # 路由聚合
│       │   ├── core/
│       │   │   ├── config.py       # 配置管理
│       │   │   ├── redis.py        # Redis连接
│       │   │   └── logging.py      # 日志中间件
│       │   ├── models/
│       │   │   └── schemas.py      # Pydantic模型
│       │   ├── services/
│       │   │   ├── financial.py     # 财务服务
│       │   │   └── formula_service.py  # 公式服务
│       │   └── utils/
│       │       ├── akshare_client.py   # akshare封装
│       │       ├── formula_lexer.py    # 公式词法分析
│       │       ├── formula_parser.py   # 公式语法分析
│       │       └── formula_evaluator.py # 公式计算
│       └── tests/                  # 后端测试
│           ├── unit/
│           └── integration/
│
├── specs/                          # 规格文档
├── package.json                    # 前端依赖
├── requirements.txt                # 后端依赖
└── pyproject.toml                  # 后端项目配置
```

**注意**: 所有业务代码必须放在 `src/` 目录下。

### 核心模块职责

#### 前端模块
| 模块 | 职责 |
|------|------|
| `components/` | 筛选器、表格、图表等UI组件 |
| `pages/` | 路由页面（筛选页、详情页、历史页） |
| `stores/` | 全局状态（筛选条件、结果缓存） |
| `api/` | 调用后端API的客户端封装 |

#### 后端模块
| 模块 | 职责 |
|------|------|
| `api/v1/endpoints/` | API路由处理（screen, company, metrics） |
| `core/config.py` | 环境变量、配置项管理 |
| `core/redis.py` | Redis连接与缓存操作封装 |
| `models/` | 请求/响应数据模型（Pydantic） |
| `services/` | 业务逻辑（筛选计算、数据处理） |
| `utils/` | 公式解析、数据转换工具 |

### 数据流

```
1. 用户配置筛选条件（前端）
   ↓ POST /api/v1/screen
2. FastAPI 接收请求，校验参数
3. 检查Redis缓存
   ├─ 命中 → 直接返回缓存结果
   └─ 未命中 → 调用akshare获取数据 → 计算 → 存入Redis → 返回
4. 前端渲染结果表格/图表
```

### API路由结构

```
/api/v1/
├── screen                           # 筛选相关
│   ├── POST /screen                 # 执行筛选
│   ├── POST /screen/save            # 保存条件
│   ├── GET  /screen/saved           # 获取已保存条件
│   └── DELETE /screen/saved/{id}    # 删除已保存条件
├── company/
│   ├── GET  /company/{code}         # 公司详情
│   ├── POST /company/compare        # 同行对比
│   └── POST /company/trend          # 趋势对比
├── industry/
│   ├── GET /industry/csrc           # 证监会行业分类
│   ├── GET /industry/sw-one         # 申万一级行业
│   ├── GET /industry/sw-three       # 申万三级行业
│   └── GET /industry/ths           # 同花顺行业分类
├── formula/
│   ├── POST /formula/validate       # 验证公式
│   ├── POST /formula/evaluate       # 计算公式
│   ├── POST /formula/save           # 保存公式
│   ├── GET  /formula/saved          # 获取已保存公式
│   ├── PUT  /formula/{id}           # 更新公式
│   └── DELETE /formula/{id}         # 删除公式
├── metrics                          # 指标列表
└── cache/refresh                    # 刷新缓存
```

### 公式引擎架构

公式引擎负责解析和计算自定义财务指标表达式。

#### 组件结构

| 组件 | 文件 | 职责 |
|------|------|------|
| 词法分析器 | `formula_lexer.py` | 将公式字符串分解为Token流 |
| 语法分析器 | `formula_parser.py` | 将Token流转换为AST抽象语法树 |
| 求值器 | `formula_evaluator.py` | 根据AST和财务数据计算公式结果 |

#### 支持的语法

**基本运算符**: `+`, `-`, `*`, `/`, `()` (括号优先级)

**内置函数**:
- `AVG(metric)` - 平均值
- `SUM(metric)` - 求和
- `MIN(metric)` - 最小值
- `MAX(metric)` - 最大值
- `STD(metric)` - 标准差

**时间序列语法**:
- `ROE[2023]` - 指定年份的值
- `ROE[2020:2024]` - 年份范围 (包含两端)
- `AVG(ROE[2020:2024])` - 组合使用

#### 数据类型

- **标量值**: 单个数值 (如 `roe / roi`)
- **列表值**: 时间序列 (如 `ROE[2020:2024]`)

#### 示例

```
# 简单计算
roe / roi

# 使用时间序列
AVG(ROE[2020:2024])

# 复杂嵌套
(净利润 / 总资产) * 100
```

### 依赖版本

**前端**
```json
{
  "solid-js": "^1.8.0",
  "@solidjs/router": "^0.10.0",
  "vite": "^5.0.0"
}
```

**后端**
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
redis>=5.0.0
akshare>=1.12.0
pydantic>=2.0.0
```

### 部署方案

**开发环境**
```bash
# 终端1 - 前端
cd frontend && npm run dev

# 终端2 - 后端
cd backend && uvicorn main:app --reload

# 终端3 - Redis
redis-server
```

**生产环境**
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    nginx: ...
  backend:
    build: ./backend
    depends_on: [redis]
  redis:
    image: redis:7-alpine
```

### 安全考虑
- CORS配置限制前端域名
- API请求频率限制
- 敏感数据不上传Git
- 环境变量管理 secrets

### 性能考虑
- Redis缓存避免重复计算
- 异步IO处理akshare请求
- 前端虚拟列表处理大数据量
- 筛选计算超时机制（30秒）

### 测试方案

#### 后端测试 (pytest)

| 测试类型 | 覆盖范围 | 命令 |
|---------|---------|------|
| 单元测试 | services/utils模块 | `pytest src/backend/tests/unit/` |
| 集成测试 | API端点 | `pytest src/backend/tests/integration/` |
| 覆盖率报告 | >80%目标 | `pytest --cov=src/backend` |

**测试文件结构**
```
src/backend/tests/
├── conftest.py              # pytest fixtures
├── unit/
│   ├── test_services/       # 业务逻辑测试
│   └── test_utils/          # 工具函数测试
└── integration/
    └── test_api/            # API接口测试
```

**关键测试用例**
- 筛选条件解析与计算
- Redis缓存命中/未命中
- 边界数据处理（亏损、ST、停牌）
- API参数校验

#### 前端测试 (Vitest + Testing Library)

| 测试类型 | 覆盖范围 | 命令 |
|---------|---------|------|
| 单元测试 | components/stores | `vitest src/frontend/` |
| 组件测试 | UI组件渲染 | `vitest src/frontend/components` |
| E2E测试 | 完整流程 | `playwright test` |

**测试文件结构**
```
src/frontend/tests/
├── components/              # 组件测试
├── stores/                  # 状态测试
└── utils/                   # 工具函数测试
```

**关键测试用例**
- 筛选条件组件交互
- 结果表格渲染与分页
- 图表组件数据映射
- 状态管理数据流

#### 持续集成
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: pytest src/backend/tests/ --cov
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run frontend tests
        run: npm test --prefix src/frontend
```
