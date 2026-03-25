## Build & Run

**Frontend (Solid.js)**
```bash
cd src/frontend
npm install
npm run dev
npm run build  # Production build
```

**Backend (FastAPI)**
```bash
cd src/backend
source .venv/bin/activate
uvicorn main:app --reload
```

**Redis** (required for caching)
```bash
redis-server
```

## Validation

**Backend Tests**
```bash
cd src/backend && source .venv/bin/activate && pytest tests/ -v --tb=short
```

**Frontend Tests**
```bash
cd src/frontend
npm test
```

**Typecheck & Lint**
```bash
# Backend
mypy src/backend/
ruff check src/backend/

# Frontend
npm run typecheck
npm run lint
```

**E2E Testing (BDD with playwright-cli)**
```bash
# 1. 确保服务运行: backend (8000) + frontend (3000)
# 2. 依次学习并测试 e2e/ 下的每个 feature 文件

# 学习一个 feature 文件
# 例如: e2e/screen_companies.feature

# 使用 playwright-cli 手动执行测试步骤:
# a) 打开浏览器并导航到前端页面
playwright-cli open http://localhost:3000

# b) 根据 feature 文件的 scenario 逐步执行操作
#    使用 snapshot 获取页面元素引用 (e.g., e1, e2)
playwright-cli snapshot

# c) 根据 scenario 描述进行交互 (click, type, fill 等)
playwright-cli click e1
playwright-cli type e2 "搜索内容"

# d) 验证结果是否符合预期
# e) 如发现 bug，记录到 IMPLEMENTATION_PLAN.md 的待修改 bug 中

# 3. 处理完一个 feature 文件后，更新 bug 列表，然后继续下一个
```

**E2E Bug 记录格式**
在 IMPLEMENTATION_PLAN.md 中新增 `## E2E 测试发现的问题` 部分：
```markdown
## E2E 测试发现的问题

- [ ] **E2E-BUG-N** `e2e/xxx.feature:行号` - 描述
  - Feature: e2e/xxx.feature
  - Scenario: 场景名称
  - 实际结果: ...
  - 预期结果: ...
```

## Known Issues

- eslint-plugin-solid latest version is 0.14.5, not 8.x - ensure package.json uses correct version
- Python dependencies require pip which may not be available on all systems

## Operational Notes

- Backend runs on `http://localhost:8000`
- Frontend dev server on `http://localhost:3000`
- Redis cache TTL: 24 hours
- Force refresh cache: `POST /api/v1/cache/refresh`

## Codebase Patterns

### Project Structure
```
src/
├── frontend/              # Solid.js frontend
│   ├── src/              # Source code
│   │   ├── components/  # UI components
│   │   ├── stores/      # State management
│   │   └── api/         # API client
│   ├── tests/           # Frontend tests
│   └── dist/            # Production build output
│
└── backend/              # FastAPI backend
    ├── api/v1/           # API endpoints
    ├── core/             # Core config
    ├── models/           # Data models
    ├── services/         # Business logic
    ├── utils/            # Utilities
    ├── tests/            # Backend tests
    └── logs/             # Backend logs (app.log)
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/screen` | Screen companies by conditions |
| GET | `/api/v1/company/{code}` | Get company details |
| GET | `/api/v1/metrics` | List available metrics |
| POST | `/api/v1/screen/save` | Save screen conditions |
| GET | `/api/v1/screen/saved` | Get saved screens |

### Data Flow
```
Frontend -> FastAPI -> Redis (cache) -> akshare (data source)
```

### akshare Key Functions
- `stock_financial_analysis_indicator()` - Financial indicators
- `stock_financial_report_sina()` - Financial statements
- `stock_zh_a_hist()` - Stock price history
