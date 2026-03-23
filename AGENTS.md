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
pip install -r requirements.txt
uvicorn main:app --reload
```

**Redis** (required for caching)
```bash
redis-server
```

## Validation

- Tests: `pytest src/backend/tests/` (backend) / `npm test` (frontend)
- Typecheck: `mypy src/backend/` (backend) / `npm run typecheck` (frontend)
- Lint: `ruff check src/backend/` (backend) / `npm run lint` (frontend)

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
│   ├── components/       # UI components
│   ├── pages/            # Route pages
│   ├── stores/           # State management
│   ├── api/              # API client
│   └── tests/            # Frontend tests
│
└── backend/              # FastAPI backend
    ├── api/v1/           # API endpoints
    ├── core/             # Core config
    ├── models/           # Data models
    ├── services/         # Business logic
    ├── utils/            # Utilities
    └── tests/            # Backend tests
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
