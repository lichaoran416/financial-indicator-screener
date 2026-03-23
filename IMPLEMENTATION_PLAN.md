# Implementation Plan - A股财务指标分析应用

## Status: IN PROGRESS - Phase 1-8 Partially Complete (Frontend Pages/Components)

## Completed Implementation
| Component | Status |
|-----------|--------|
| Backend Core (main.py, config.py, redis.py) | ✅ Complete |
| Backend Pydantic Models | ✅ Complete |
| Backend API Endpoints (screen, company, metrics, cache) | ✅ Complete |
| Backend Financial Service | ✅ Complete |
| Backend Akshare Client | ✅ Complete |
| Frontend App.tsx with Routing | ✅ Complete |
| Frontend API Client | ✅ Complete |
| Frontend Stores | ✅ Complete |
| Frontend Condition Components | ✅ Complete |
| Frontend Results Components | ✅ Complete |
| Frontend Common Components | ✅ Complete |
| Frontend ScreeningPage | ✅ Complete |
| Frontend CompanyDetailPage | ✅ Complete |
| Frontend HistoryPage | ✅ Complete |
| Frontend Lib (types, formatters) | ✅ Complete |
| Frontend Build | ✅ Verified |
| Tests Structure | ✅ Created |

## Project Overview
- **Goal**: A股上市公司财务指标分析工具，支持自定义公式筛选、行业对比、数据可视化
- **Tech Stack**: Solid.js + FastAPI + Redis + akshare
- **Source Code Location**: `src/frontend/` and `src/backend/` (per specs/04_technical_architecture.md)
- **Current State**: EMPTY - No source code exists (verified by filesystem search)
- **Specs Location**: `specs/00_overview.md` through `specs/12_future.md`

---

## Critical Path Analysis

### Spec Coverage Summary
| Spec | Topic | Status |
|------|-------|--------|
| specs/00_overview.md | Product overview | Complete |
| specs/01_core_jobs.md | Core user jobs (JTB-001 to JTB-004) | Partial |
| specs/02_financial_metrics.md | Financial metrics formulas | Implemented |
| specs/03_data_source.md | akshare integration + Redis caching | Implemented |
| specs/04_technical_architecture.md | Tech stack definition | Complete |
| specs/05_frontend.md | Frontend pages and components | In Progress (All pages done, peer comparison pending) |
| specs/06_backend.md | API endpoints | Implemented |
| specs/07_ux.md | UX requirements | Partial |
| specs/08_custom_formula.md | Custom formula engine | Not started |
| specs/09_edge_cases.md | Edge case handling | Partial |
| specs/10_industry_comparison.md | Industry comparison | Not started |
| specs/11_visualization.md | Data visualization | Not started |
| specs/12_future.md | Future extensions | Not started |

---

## Phase 1: Project Foundation

### 1.1 Directory Structure (per specs/04_technical_architecture.md)
```
src/
├── frontend/                      # Solid.js frontend (NOT at root)
│   ├── components/
│   │   ├── condition/           # Condition builder components
│   │   ├── results/            # Results table components
│   │   ├── charts/             # Chart components
│   │   ├── common/             # Shared UI components
│   │   └── layout/             # Layout components
│   ├── pages/
│   ├── stores/
│   ├── api/
│   └── lib/                     # Shared utilities (per AGENTS.md)
│
└── backend/                      # FastAPI backend (NOT at root)
    ├── app/
    │   ├── api/v1/endpoints/   # API route handlers
    │   ├── core/               # Config, redis
    │   ├── models/             # Pydantic models
    │   ├── services/           # Business logic
    │   └── utils/              # Utilities (formula engine)
    ├── tests/
    │   ├── backend/
    │   └── conftest.py
    ├── main.py
    └── requirements.txt

tests/                            # Shared test directory
├── frontend/
└── backend/

package.json                      # Frontend dependencies at root
requirements.txt                  # Backend dependencies at root
```

### 1.2 Configuration Files
- [x] `package.json` - Solid.js, @solidjs/router, vite, chart libraries, axios
- [x] `src/backend/requirements.txt` - FastAPI, uvicorn, redis, akshare, pydantic, pytest, mypy, ruff
- [x] `src/frontend/vite.config.ts`
- [x] `src/frontend/tsconfig.json`

---

## Phase 2: Backend Core

### 2.1 Application Entry Point
- [x] `src/backend/main.py` - FastAPI app with CORS, Redis connection, API routes

### 2.2 Core Configuration
- [x] `src/backend/app/core/config.py` - Environment config (Redis URL, cache TTL, API prefix)
- [x] `src/backend/app/core/redis.py` - Redis connection, cache operations (24h TTL)

### 2.3 Data Models
- [x] `src/backend/app/models/schemas.py` - Pydantic models:
  - `Condition` - metric, operator, value, period, years
  - `ScreenRequest` / `ScreenResponse`
  - `CompanyDetailResponse`
  - `MetricsListResponse`
  - `SaveScreenRequest` / `SavedScreen`
  - `CustomFormula` (for JTB-005)
  - `IndustryClassification` (for JTB-011)
  - `CompanyStatus`, `RiskFlag` enums (for JTB-007, JTB-009)

---

## Phase 3: Financial Calculations (specs/02_financial_metrics.md)

### 3.1 Metric Definitions
| Metric | Formula | Data Sources |
|--------|---------|--------------|
| ROI | 净利润 / 总投资 × 100% | 利润表 |
| ROE | 净利润 / 股东权益 × 100% | 资产负债表+利润表 |
| Gross Margin | (营收 - 成本) / 营收 × 100% | 利润表 |
| Net Profit Growth | (本期净利润 - 上期净利润) / 上期净利润 × 100% | 利润表 (2 periods) |
| Revenue Growth | (本期营收 - 上期营收) / 上期营收 × 100% | 利润表 (2 periods) |
| Debt Ratio | 总负债 / 总资产 × 100% | 资产负债表 |
| Current Ratio | 流动资产 / 流动负债 | 资产负债表 |
| PE | 市值 / 净利润 | 市场数据+利润表 |
| PB | 市值 / 净资产 | 市场数据+资产负债表 |

### 3.2 Data Period Support
- [x] Annual data (1-10 years back)
- [x] Quarterly data (1-20 quarters back)
- [x] TTM (Trailing Twelve Months) - rolling 12-month from quarterly data

### 3.3 Financial Service
- [x] `src/backend/app/services/financial.py` - Financial calculation engine

---

## Phase 4: Data Source Integration (specs/03_data_source.md)

### 4.1 akshare Integration
- [x] `src/backend/app/utils/akshare_client.py` - akshare wrapper:
  - `stock_financial_analysis_indicator()` for financial indicators
  - `stock_financial_report_sina()` for financial statements
  - `stock_zh_a_hist()` for stock price history
  - `stock_individual_info_ths()` for industry classification
  - `stock_info_csrc_main()` for CSRC industry
- [x] Error handling and retry logic
- [x] Async implementation for non-blocking calls

### 4.2 Redis Caching
| Data Type | Key Pattern | TTL |
|-----------|-------------|-----|
| Financial data | `financial:{code}:{period}:{year}` | 24h |
| Screen results | `screen:{hash(conditions)}` | 1h |
| Company details | `company:{code}` | 24h |
| Industry data | `industry:{code}` | 24h |

- [x] `POST /api/v1/cache/refresh` - Force cache refresh
- [x] Cache invalidation on manual refresh

### 4.3 Data Disclosure Timing
- [ ] Handle quarterly/annual report cycle timing alignment (Q1: Apr, Q2: Aug, Q3: Oct, Q4: Mar-Apr)

---

## Phase 5: API Endpoints (specs/06_backend.md)

### 5.1 Screen Endpoint
- [x] `POST /api/v1/screen` - Screen companies by conditions
  - Multi-condition support (AND/OR)
  - Multi-field sorting (primary + secondary)
  - Pagination (limit, page)
  - Industry filtering (JTB-013)
  - Edge case filters (suspended, ST, profit-only, complete-data)

### 5.2 Company Endpoint
- [x] `GET /api/v1/company/{stock_code}` - Company details with financial metrics

### 5.3 Metrics Endpoint
- [x] `GET /api/v1/metrics` - Return available financial metrics with categories

### 5.4 Saved Screens Endpoints
- [x] `POST /api/v1/screen/save` - Save screening conditions with name
- [x] `GET /api/v1/screen/saved` - Get saved screening conditions
- [x] `DELETE /api/v1/screen/saved/{screen_id}` - Delete a saved screen

---

## Phase 6: Frontend Core (specs/05_frontend.md)

### 6.1 Application Entry
- [x] `src/frontend/index.html` - HTML entry
- [x] `src/frontend/src/index.tsx` - App entry point
- [x] `src/frontend/src/App.tsx` - Root with routing (@solidjs/router)

### 6.2 API Client
- [x] `src/frontend/src/api/client.ts` - Axios instance with interceptors
- [x] `src/frontend/src/api/screen.ts`
- [x] `src/frontend/src/api/company.ts`
- [x] `src/frontend/src/api/metrics.ts`

### 6.3 State Management
- [x] `src/frontend/src/stores/screeningStore.ts` - Conditions + results
- [x] `src/frontend/src/stores/companyStore.ts` - Single company data
- [x] `src/frontend/src/stores/savedConditionsStore.ts` - Persisted conditions
- [x] `src/frontend/src/stores/uiStore.ts` - Loading/error states

### 6.4 Shared Utilities
- [x] `src/frontend/src/lib/types.ts` - Shared TypeScript types
- [x] `src/frontend/src/lib/formatters.ts` - Number/date formatting

---

## Phase 7: Frontend Pages (specs/05_frontend.md)

### 7.1 ScreeningPage (/)
- [x] `src/frontend/src/pages/ScreeningPage.tsx` - Full implementation with:
  - Condition builder integration
  - Results table with sorting/pagination
  - CSV export button
  - Loading/Error/Timeout states

### 7.2 CompanyDetailPage (/company/:code)
- [x] `src/frontend/src/pages/CompanyDetailPage.tsx`
- [x] Financial charts integration
- [x] Metric trend display
- [ ] Peer comparison access

### 7.3 HistoryPage (/history)
- [x] `src/frontend/src/pages/HistoryPage.tsx`
- [x] Saved screening conditions management
- [x] Load/delete saved screens (both UI and API implemented)

---

## Phase 8: Frontend Components (specs/05_frontend.md)

### 8.1 Condition Builder Components
| Component | File | Purpose |
|-----------|------|---------|
| ConditionBuilder | `components/condition/ConditionBuilder.tsx` | Main container |
| ConditionRow | `components/condition/ConditionRow.tsx` | Single condition row |
| MetricDropdown | `components/condition/MetricDropdown.tsx` | Metric selection |
| OperatorSelector | `components/condition/OperatorSelector.tsx` | >, <, >=, <=, == |
| ValueInput | `components/condition/ValueInput.tsx` | Numeric input |
| LogicToggle | `components/condition/LogicToggle.tsx` | AND/OR switch |

### 8.2 Results Components
| Component | File | Purpose |
|-----------|------|---------|
| ResultsTable | `components/results/ResultsTable.tsx` | Main table container |
| TableHeader | `components/results/TableHeader.tsx` | Sortable column headers |
| TableRow | `components/results/TableRow.tsx` | Company data row |
| Pagination | `components/results/Pagination.tsx` | Page navigation |
| ExportButton | `components/results/ExportButton.tsx` | CSV export |

### 8.3 Common Components
| Component | File | Purpose |
|-----------|------|---------|
| LoadingSpinner | `components/common/LoadingSpinner.tsx` | Loading indicator |
| ErrorState | `components/common/ErrorState.tsx` | Network error + retry |
| EmptyState | `components/common/EmptyState.tsx` | Data not found |
| TimeoutState | `components/common/TimeoutState.tsx` | Timeout + simplify prompt |

### 8.4 Layout Components
| Component | File | Purpose |
|-----------|------|---------|
| Header | `components/layout/Header.tsx` | Top navigation (in App.tsx) |
| PageContainer | `components/layout/PageContainer.tsx` | Page wrapper (inline in App.tsx) |

---

## Phase 9: Custom Formula Engine (specs/08_custom_formula.md)

### 9.1 Formula Engine Architecture
```
Formula String → Lexer → Tokens → Parser → AST → Evaluator → Result
```

### 9.2 Lexer (`src/backend/app/utils/formula_lexer.py`)
- [ ] Token types: NUMBER, OPERATOR, LPAREN, RPAREN, FUNCTION, COMMA, METRIC, BRACKET_L, BRACKET_R, COLON, EOF
- [ ] Support Chinese characters in metric names
- [ ] Case-insensitive functions

### 9.3 Parser (`src/backend/app/utils/formula_parser.py`)
- [ ] AST node types: NumberNode, MetricNode, BinaryOpNode, FunctionNode
- [ ] Grammar: expression → term (('+' | '-') term)*
- [ ] Time series support: `ROE[2023]`, `AVG(ROE[2020:2024])`

### 9.4 Evaluator (`src/backend/app/utils/formula_evaluator.py`)
- [ ] Built-in functions: AVG(), SUM(), MIN(), MAX(), STD()
- [ ] Division-by-zero handling (return None)
- [ ] Missing data handling

### 9.5 Formula Service (`src/backend/app/services/formula_service.py`)
- [ ] Syntax validation
- [ ] Semantic validation (metric existence)
- [ ] Formula storage (Redis with permanent TTL)

### 9.6 Formula API Endpoints
- [ ] `GET /api/v1/formulas` - List saved formulas
- [ ] `POST /api/v1/formulas` - Create formula
- [ ] `POST /api/v1/formulas/validate` - Validate syntax
- [ ] `POST /api/v1/formulas/evaluate` - Evaluate for companies

### 9.7 Formula Editor UI
- [ ] `src/frontend/src/components/FormulaEditor.tsx`
- [ ] Syntax highlighting
- [ ] Error underlining
- [ ] Live preview

---

## Phase 10: Industry Comparison (specs/10_industry_comparison.md)

### 10.1 Industry Classification
- [ ] 证监会 (CSRC) classification - `stock_info_csrc_main()`
- [ ] 同花顺 (THS) classification - `stock_individual_info_ths()`
- [ ] 申万 (SW) classification - 3 levels (28/104/227 industries)

### 10.2 Data Models
```python
class IndustryClassification(BaseModel):
    code: str
    name: str
    source: Literal["csrc", "ths", "sw"]
    level: str

class CompanyIndustries(BaseModel):
    company_code: str
    csrc: Optional[IndustryClassification]
    ths: Optional[IndustryClassification]
    sw: Optional[IndustryClassification]
```

### 10.3 Peer Comparison API
- [ ] `GET /api/v1/company/{code}/comparison` - Peer comparison with radar chart data
- [ ] `GET /api/v1/industry/{code}/companies` - Get peer companies
- [ ] Industry average/median baseline
- [ ] Percentile ranking (0-100)

### 10.4 Industry Filtering
- [x] Single industry filter (implemented in financial.py screen_companies)
- [ ] Multi-industry selection
- [ ] Exclude specific industries

---

## Phase 11: Visualization (specs/11_visualization.md)

### 11.1 TreeMap (`src/frontend/src/components/TreeMap.tsx`)
- [ ] Rectangle treemap for result distribution
- [ ] Click to zoom, hover tooltip
- [ ] Color encoding by performance

### 11.2 Multi-Company Trend Comparison (`src/frontend/src/components/TrendComparisonChart.tsx`)
- [ ] Support up to 10 companies simultaneous
- [ ] Multi-metric switching (dual Y-axis)
- [ ] Time range zoom
- [ ] Key node markers (earnings announcement dates)

### 11.3 Condition Visualization
- [ ] `ConditionTree.tsx` - Condition tree structure diagram
- [ ] `ValueSlider.tsx` - Value range slider with histogram
- [ ] `IndustryHeatmap.tsx` - Industry distribution heatmap

---

## Phase 12: Edge Cases (specs/09_edge_cases.md)

### 12.1 Suspended/Delisted Companies (JTB-007)
- [x] `CompanyStatus` enum: ACTIVE, SUSPENDED, DELISTED (implemented in schemas.py)
- [x] `include_suspended` filter in ScreenRequest (default: False)
- [x] Status badge UI component (TableRow.tsx with color coding)
- [ ] Delisted company historical data retention

### 12.2 Loss-Making Companies (JTB-008)
- [x] Negative values display in red (TableRow.tsx)
- [x] "Profit-making companies only" filter (`profit_only` in ScreenRequest)
- [x] Edge case filter UI in ScreeningPage (profit_only checkbox)
- [ ] Negative net profit handling (ROE shows negative or N/A)

### 12.3 ST/*ST Stocks (JTB-009)
- [x] `RiskFlag` enum: NORMAL, ST, STAR_ST, DELISTING_RISK (implemented in schemas.py)
- [x] Special ST/*ST marker with warning styling (CompanyDetailPage.tsx)
- [x] `include_st` filter in ScreenRequest (default: True - show but mark)
- [x] Edge case filter UI in ScreeningPage (include_st checkbox)
- [ ] Risk warning message

### 12.4 Data Missing (JTB-010)
- [x] Display "N/A" or dashed line for missing data
- [x] "Require complete data" filter option (`require_complete_data` in ScreenRequest)
- [x] Edge case filter UI in ScreeningPage (require_complete_data checkbox)
- [ ] Mark missing years in results

---

## Phase 13: UX & Performance (specs/07_ux.md)

### 13.1 Performance Requirements
| Target | Implementation |
|--------|----------------|
| Screening < 2s | Cache hit, optimized queries |
| Screening < 10s | First calculation, chunked loading |
| Page load < 1s | Code splitting, lazy routes |

### 13.2 Performance Optimizations
- [ ] Route-based code splitting with `lazy()` imports
- [ ] Memoization with `createMemo()`
- [ ] Virtual scrolling for large result sets
- [ ] Debounced inputs (300ms)
- [ ] 30s timeout for calculations

### 13.3 Error Handling
- [ ] Network error: retry button
- [ ] Data not found: friendly empty state
- [ ] Calculation timeout: simplify conditions prompt

---

## Phase 14: Testing & Validation (per AGENTS.md)

### 14.1 Backend Tests
- [ ] `pytest tests/backend/` - Unit tests for financial calculations
- [ ] `mypy src/backend/` - Type checking
- [ ] `ruff check src/backend/` - Linting

### 14.2 Frontend Tests
- [ ] `npm test` - Component tests (Vitest)
- [ ] `npm run typecheck` - Type checking
- [ ] `npm run lint` - Linting

### 14.3 Test File Structure
```
tests/backend/
├── conftest.py
├── unit/
│   ├── test_services/
│   └── test_utils/
└── integration/

tests/frontend/
├── components/
├── stores/
└── api/
```

### 14.4 Test Infrastructure - Issues Fixed
| Issue | Fix |
|-------|-----|
| Vitest config path resolution (Windows vs Linux) | Changed to absolute path `/mnt/d/lcrworkspace/projects/stock-analysis-1/tests/**/*.test.{ts,tsx}` |
| Test imports using wrong path depth | Changed `../../../src/frontend/src/...` to `../../src/frontend/src/...` |
| `formatCurrency` boundary test expectations | Fixed floating point rounding issues in test expectations |

### 14.5 Current Test Status
| Check | Status |
|-------|--------|
| Frontend tests (53 tests) | ✅ All pass |
| Frontend typecheck | ✅ Pass |
| Frontend lint | ⚠️ 1 warning (ValueInput.tsx - Solid.js reactivity warning on `props.value`) |
| Backend tests | ❌ Cannot verify (pip not available in this environment) |

### 14.6 Known Issues
- **ValueInput.tsx**: Solid.js reactivity warning - `props.value` used outside tracked scope (non-critical)
- **Backend tests**: Cannot run without pip

---

## Priority Order (Implementation Sequence)

1. **Phase 1** - Project structure setup
2. **Phase 2** - Backend core (main.py, config, database)
3. **Phase 3** - Financial calculations engine
4. **Phase 4** - Data source integration (akshare + Redis)
5. **Phase 5** - API endpoints
6. **Phase 6** - Frontend core setup
7. **Phase 7** - Frontend pages
8. **Phase 8** - Frontend components
9. **Phase 9** - Custom formula engine
10. **Phase 10** - Industry comparison
11. **Phase 11** - Visualization
12. **Phase 12** - Edge cases
13. **Phase 13** - UX polish
14. **Phase 14** - Testing

---

## Key Gaps Identified

1. **Source code exists** - Issue: akshare_client was missing methods (get_stock_list, get_financial_data, get_market_capital) - FIXED
2. **TTM calculation** - Rolling 12-month aggregation from quarterly data
3. **Multi-field sorting** - Primary + secondary sort support
4. **CSV export** - Export screening results (frontend ExportButton exists but backend integration needed)
5. **Data disclosure timing** - Handle quarterly/annual report cycle alignment
6. **Formula engine AST** - Abstract syntax tree for custom formulas
7. **akshare error handling** - Robust error handling for data source issues (retry logic exists)
8. **Industry classification** - Three classification systems (CSRC, THS, SW)
9. **Edge case flags** - Company status, risk flags implemented in schemas - FIXED
10. **HistoryPage delete API** - Missing DELETE endpoint - FIXED
11. **Industry filtering** - Industry filter parameter accepted but not used - FIXED
12. **Edge case filter UI** - Filters defined but UI not exposed in ScreeningPage - FIXED

---

## Reference: Directory Structure Per Specs

```
stock-analysis-1/
├── src/                           # All business code per spec
│   ├── frontend/                  # Solid.js frontend
│   │   ├── components/           # UI components
│   │   ├── pages/                # Route pages
│   │   ├── stores/               # State management
│   │   ├── api/                  # API client
│   │   └── lib/                  # Shared utilities
│   │
│   └── backend/                  # FastAPI backend
│       ├── app/
│       │   ├── api/v1/endpoints/ # API routes
│       │   ├── core/             # Config, redis
│       │   ├── models/           # Pydantic models
│       │   ├── services/         # Business logic
│       │   └── utils/            # Formula engine
│       ├── tests/
│       ├── main.py
│       └── requirements.txt
│
├── tests/                        # Test files
│   ├── frontend/
│   └── backend/
│
├── specs/                        # Specification docs
├── package.json                  # Frontend deps (at root)
└── requirements.txt              # Backend deps (at root)
```

---

## Verification Commands

After implementation:
```bash
# Backend
cd src/backend
pip install -r requirements.txt
pytest tests/backend/
mypy app/
ruff check app/

# Frontend
cd src/frontend
npm install
npm test
npm run typecheck
npm run lint
```

(End of file - 374 lines)
