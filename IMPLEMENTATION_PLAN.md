# Implementation Plan - A股财务指标分析应用

## Status: PHASE 9-10 COMPLETE, PHASE 11-15 IN PROGRESS

## CRITICAL CONSTRAINT: 只使用akshare提供的数据api, 不要使用其他数据api

---

## Completed Implementation (Verified via Code Analysis)
| Component | Status | Notes |
|-----------|--------|-------|
| Backend Core (main.py, config.py, redis.py) | ✅ Complete | Only akshare used as data source |
| Backend Pydantic Models | ✅ Complete | |
| Backend API Endpoints (screen, company, metrics, cache) | ✅ Complete | |
| Backend Financial Service | ✅ Complete | |
| Backend Akshare Client | ✅ Complete | Only akshare - confirmed no other data APIs |
| Frontend App.tsx with Routing | ✅ Complete | Lazy loading implemented |
| Frontend API Client | ✅ Complete | |
| Frontend Stores | ✅ Complete | formulaStore NOT exported from index.ts |
| Frontend Condition Components | ✅ Complete | |
| Frontend Results Components | ✅ Complete | |
| Frontend Common Components | ✅ Complete | |
| Frontend ScreeningPage | ✅ Complete | Edge case filters exposed in UI |
| Frontend HistoryPage | ✅ Complete | |
| Frontend Lib (types, formatters) | ✅ Complete | |
| Custom Formula Engine (lexer, parser, evaluator) | ✅ Complete | Phase 9 - JTB-005, JTB-006 |
| Formula API Endpoints | ✅ Complete | validate, evaluate, save, delete |
| FormulaEditor UI Component | ✅ Complete | With syntax highlighting and saved formulas |
| CSRC Classification API | ✅ Complete | GET /industry/csrc |
| SW (申万) Classification API | ✅ Complete | GET /industry/sw-one, GET /industry/sw-three |

---

## CRITICAL BUGS (Phase 10 - Must Fix First)

### Bug 1: `years` parameter ignored in screen endpoint ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:333-334`
- **Issue**: `years` is extracted from conditions but never passed to `get_company_metrics()`
- **Fix**: Pass `years` to `get_company_metrics()` call

### Bug 2: TTM rolling 12-month uses FIRST values instead of LAST ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:175-176`
- **Issue**: `valid_values = [float(v) for v in values[:periods]...]` takes first 4, not last 4
- **Fix**: Use `values[-periods:]` instead of `values[:periods]`

### Bug 3: Formula evaluator `ROE[2020:2024]` returns only last value ✅ FIXED
- **Location**: `src/backend/app/utils/formula_evaluator.py:111`
- **Issue**: Should collect all 5 years and pass to AVG(), but returns only the last value
- **Fix**: Collect all values in range and return list for aggregate functions

### Bug 4: Peer comparison API returns all None values ✅ FIXED
- **Location**: `src/backend/app/api/v1/endpoints/company.py:152-158`
- **Issue**: compare_with_peers endpoint never fetches peer metrics - all values hardcoded None
- **Fix**: Implemented actual peer metrics calculation with industry_avg, industry_median, percentile

### Bug 5: CompanyDetailPage data structure mismatch ✅ FIXED
- **Location**: `src/frontend/src/pages/CompanyDetailPage.tsx` vs `src/backend/app/api/v1/endpoints/company.py`
- **Issue**: Frontend expects `Record<string, number>` for metrics, but backend returns `{"financial_data": [...]}`
- **Fix**: Changed backend to return metrics directly without wrapper

### Bug 6: Frontend-backend type mismatches ✅ FIXED
- **Location**: `src/frontend/src/lib/types.ts` vs `src/backend/app/models/schemas.py`
- **Issue**: Multiple enum value mismatches:
  - CompanyStatus: frontend=`normal`/`warning`/`danger` vs backend=`ACTIVE`/`SUSPENDED`/`DELISTED`
  - RiskFlag: frontend=`none`/`low`/`medium`/`high` vs backend=`NORMAL`/`ST`/`STAR_ST`/`DELISTING_RISK`
  - MetricInfo missing fields (unit, description)
  - SavedScreen missing fields (description, logic, updatedAt)
  - ScreenResponse field name mismatch (results vs companies)
- **Fix**: Unify enum values and add missing fields in lib/types.ts
- **Note**: API layer (api/screen.ts, api/company.ts) has correct types; lib/types.ts was legacy

### Bug 7: ROE shows negative when profit negative - should be N/A ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:248-249`
- **Issue**: ROE calculated even when net_profit is negative
- **Fix**: Changed condition to require `net_profit > 0` for ROE calculation

### Bug 8: Industry filter bug with None company industry ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:330-331`
- **Issue**: Companies without industry data pass through when industry filter is set
- **Fix**: Skip companies with None industry when filter is specified

### Bug 9: Cache key missing period/years params ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:300`
- **Issue**: Screen cache key doesn't include `period` or `years` - causes wrong cache hits
- **Fix**: Include period and years in cache key generation

### Bug 10: Metrics field silently dropped in screening response ✅ FIXED
- **Location**: `src/backend/app/api/v1/endpoints/screen.py` and `src/backend/app/models/schemas.py`
- **Issue**: `metrics` field added to company dict but dropped during Pydantic validation because CompanyInfo didn't have metrics field
- **Fix**: Added `metrics: dict` field to CompanyInfo model in schemas.py

---

## ROI FORMULA BUG ✅ FIXED
- **Location**: `src/backend/app/services/financial.py:451-465`
- **Issue**: ROI defined as `净利润/总投资×100%` but uses `总资产` instead of invested capital
- **Fix**: Use correct invested capital calculation (总资产 - 流动负债)

---

## TEST GAPS
- No tests for `years` parameter behavior
- No tests for TTM calculation
- No tests for actual condition filtering (only empty conditions tested)
- Frontend api.test.ts only checks signatures, not actual behavior

---

## MISSING FEATURES

### Phase 11: Industry Comparison (JTB-011, JTB-012, JTB-013)
| Component | Status | Notes |
|-----------|--------|-------|
| CSRC Classification API | ✅ Complete | GET /industry/csrc |
| SW (申万) Classification API | ✅ Complete | GET /industry/sw-one, GET /industry/sw-three |
| Peer Comparison API | ✅ Complete | Calculates actual metrics, industry_avg, median, percentile |
| Industry Benchmark Calculation | ✅ Complete | Included in peer comparison API |
| RadarChart Component | ❌ Missing | No radar/spider chart for multi-metric comparison |
| Multi-industry Selection UI | ❌ Missing | No multi-select for industry filter |
| Exclude Industry Option | ❌ Missing | No exclude industry feature |
| Industry Filter in Frontend | ❌ Missing | Backend supports but UI doesn't expose |

### Phase 12: Visualization (JTB-014, JTB-015, JTB-016)
| Component | Status | Notes |
|-----------|--------|-------|
| TreeMap Component | ❌ Missing | For screening result distribution |
| TrendComparisonChart | ❌ Missing | Up to 10 companies, dual Y-axis, time zoom |
| ValueSlider | ❌ Missing | Range slider with histogram |
| IndustryHeatmap | ❌ Missing | Industry distribution heatmap |
| ConditionTree visualization | ❌ Missing | Graphical condition structure diagram |
| Time-Series Line Chart | ❌ Missing | Historical metric trends |
| Multi-Company Comparison | ❌ Missing | Cannot compare >1 company |

### Phase 13: Multi-field Sorting
| Component | Status | Notes |
|-----------|--------|-------|
| Secondary Sort Support | ❌ Missing | Only single sort supported; spec requires primary + secondary sort |

### Phase 14: Edge Case Enhancements
| Component | Status | Notes |
|-----------|--------|-------|
| ROE N/A when profit negative | ❌ Not implemented | Shows negative instead of N/A |
| Risk warning text messages | ❌ Not implemented | Only badges, no warning text |
| Mark missing years in results | ❌ Not implemented | Years not marked |

### Phase 15: UX & Performance
| Component | Status | Notes |
|-----------|--------|-------|
| Virtual Scrolling | ❌ Missing | For large result sets |
| Debounce (300ms) | ❌ Missing | Condition input debounce |
| Memoization (createMemo) | ❌ Missing | Performance optimization |
| Cache Invalidation | ❌ Missing | No mechanism for invalidating stale cache |

---

## PARTIALLY IMPLEMENTED
| Component | Status | Gap | Spec Reference |
|-----------|--------|-----|----------------|
| TTM Rolling 12-month | ⚠️ Partial | Uses first 4 values instead of last 4 | specs/02_financial_metrics.md |
| Data Disclosure Timing | ❌ Missing | No quarterly/annual cycle alignment (Q1: Apr, Q2: Aug, Q3: Oct, Q4: Mar-Apr) | specs/03_data_source.md |
| Quarterly Period | ⚠️ Partial | Backend supports param but doesn't properly fetch quarterly data | specs/02_financial_metrics.md |
| Multi-field Sorting | ⚠️ Partial | Only single sort; spec requires primary + secondary | specs/01_core_jobs.md (JTB-002) |
| Negative Profit ROE | ⚠️ Partial | Shows negative instead of N/A | specs/09_edge_cases.md (JTB-008) |

---

## Priority Order (Implementation Sequence)

### Phase 9: Custom Formula Engine (JTB-005, JTB-006) - ✅ COMPLETE
- [x] Create `formula_lexer.py` - Tokenize formula strings
- [x] Create `formula_parser.py` - Parse tokens into AST
- [x] Create `formula_evaluator.py` - Evaluate AST against financial data
- [x] Create `formula_service.py` - Business logic for formula management
- [x] Add formula API endpoints (validate, evaluate)
- [x] Add `CustomFormula` type to frontend lib/types.ts
- [x] Create `formulaStore.ts` for custom formula state management
- [x] Create `FormulaEditor` UI component with syntax highlighting
- [x] Add formula validation API call to frontend

### Phase 10: Critical Bug Fixes - MUST FIX FIRST
- [x] Fix Bug 1: Pass `years` parameter to `get_company_metrics()` in `financial.py:333-334`
- [x] Fix Bug 2: TTM rolling uses FIRST values - change to LAST in `financial.py:175-176`
- [x] Fix Bug 3: Formula evaluator `ROE[2020:2024]` returns only last value in `formula_evaluator.py:111`
- [x] Fix Bug 4: Implement peer comparison API with actual metrics in `company.py:152-158`
- [x] Fix Bug 5: Align CompanyDetailPage data structure with backend response
- [x] Fix Bug 6: Unify frontend/backend types (CompanyStatus, RiskFlag, MetricInfo, SavedScreen, ScreenResponse)
- [x] Fix Bug 7: ROE shows N/A when profit negative in `financial.py`
- [x] Fix Bug 8: Skip companies with None industry when filter set in `financial.py:330-331`
- [x] Fix Bug 9: Include period/years in cache key in `financial.py:300`
- [x] Fix Bug 10: Preserve metrics field in screening response in `screen.py`
- [x] Fix ROI formula bug: Use invested capital instead of total assets in `financial.py:451-465`
- [x] Export formulaStore from stores/index.ts

### Phase 11: Industry Comparison (JTB-011, JTB-012, JTB-013)
- [x] Implement peer comparison API endpoint with actual metrics calculation
- [x] Create industry benchmark calculation (avg, median, percentile)
- [ ] Create RadarChart component
- [ ] Add multi-industry selection to screening UI
- [ ] Add exclude industry option to screening UI
- [ ] Expose industry filter in frontend (currently backend-only)

### Phase 12: Visualization (JTB-014, JTB-015, JTB-016)
- [ ] Create TreeMap component for result distribution
- [ ] Create TrendComparisonChart (up to 10 companies, dual Y-axis)
- [ ] Create ConditionTree visualization
- [ ] Create ValueSlider with histogram
- [ ] Create IndustryHeatmap
- [ ] Create Time-Series Line Chart for historical metric trends
- [ ] Create Multi-Company Comparison feature

### Phase 13: Multi-field Sorting
- [ ] Add secondary sort field support (primary + secondary sort)

### Phase 14: Edge Case Enhancements
- [ ] Add risk warning text messages (not just badges)
- [ ] Mark missing years explicitly in results table

### Phase 15: UX & Performance
- [ ] Implement virtual scrolling for large result sets
- [ ] Add 300ms debounce to condition inputs
- [ ] Add createMemo for expensive computations
- [ ] Add cache invalidation mechanism

---

## Spec Coverage Summary
| Spec | Topic | Status | Verification |
|------|-------|--------|--------------|
| specs/00_overview.md | Product overview | ✅ Complete | Document exists |
| specs/01_core_jobs.md | Core user jobs (JTB-001 to JTB-004) | ✅ Complete | Multi-condition filtering, sorting, details, save all work |
| specs/02_financial_metrics.md | Financial metrics formulas | ⚠️ Partial | 9 metrics implemented; ROI formula bug; TTM bug; ROE N/A bug |
| specs/03_data_source.md | akshare + Redis caching | ⚠️ Partial | akshare + Redis done; data disclosure timing NOT implemented |
| specs/04_technical_architecture.md | Tech stack definition | ✅ Complete | Matches implementation |
| specs/05_frontend.md | Frontend pages and components | ⚠️ Partial | All pages done; charts/components missing; type mismatches |
| specs/06_backend.md | API endpoints | ⚠️ Partial | Endpoints exist; peer comparison returns None |
| specs/07_ux.md | UX requirements | ⚠️ Partial | Lazy loading done; virtual scrolling/debounce missing |
| specs/08_custom_formula.md | Custom formula engine | ✅ Complete | Formula lexer, parser, evaluator, service, API, and UI |
| specs/09_edge_cases.md | Edge case handling | ⚠️ Partial | Status/risk flags done; N/A marking incomplete |
| specs/10_industry_comparison.md | Industry comparison | ⚠️ Partial | CSRC/SW APIs done; peer comparison, benchmark, radar chart pending |
| specs/11_visualization.md | Data visualization | ❌ NOT STARTED | No visualization components exist |

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
