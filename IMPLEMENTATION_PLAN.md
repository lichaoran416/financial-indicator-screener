# Implementation Plan - A股财务指标分析应用

## Status: PHASE 10-12 MOSTLY COMPLETE - PHASE 13-15 REMAIN

## CRITICAL CONSTRAINT: 只使用akshare提供的数据api, 不要使用其他数据api

---

## Completed Implementation (Verified via Code Analysis)
| Component | Status | Notes |
|-----------|--------|-------|
| Backend Core (main.py, config.py, redis.py) | ✅ Complete | Only akshare used as data source |
| Backend Pydantic Models | ✅ Complete | Duplicate field definitions removed |
| Backend API Endpoints (screen, company, metrics, cache) | ✅ Complete | |
| Backend Financial Service | ✅ Complete | |
| Backend Akshare Client | ✅ Complete | Only akshare - confirmed no other data APIs |
| Frontend App.tsx with Routing | ✅ Complete | Lazy loading implemented |
| Frontend API Client | ✅ Complete | |
| Frontend Condition Components | ✅ Complete | |
| Frontend Results Components | ✅ Complete | Table view, TreeMap view, pagination |
| Frontend Common Components | ✅ Complete | |
| Frontend ScreeningPage | ✅ Complete | Edge case filters exposed in UI |
| Frontend HistoryPage | ✅ Complete | |
| Frontend Lib (types, formatters) | ⚠️ Partial | Type mismatches with backend |
| Custom Formula Engine (lexer, parser, evaluator) | ✅ Complete | Bug 3 fixed - time series range returns all values |
| Formula API Endpoints | ✅ Complete | validate, evaluate, save, delete |
| CSRC Classification API | ✅ Complete | GET /industry/csrc |
| SW (申万) Classification API | ✅ Complete | GET /industry/sw-one, GET /industry/sw-three |
| Peer Comparison API | ✅ Complete | Calculates actual metrics, industry_avg, median, percentile |
| RadarChart Component | ✅ Complete | For peer comparison visualization |
| TreeMap Component | ✅ Complete | Default view for screening results |

---

## CRITICAL BUGS (Phase 10 - Must Fix First)

### Bug 1: `years` parameter ignored in screen endpoint ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:333-334`
- **Issue**: `years` is extracted from conditions but never passed to `get_company_metrics()`
- **Fix**: Pass `years` to `get_company_metrics()` call

### Bug 2: TTM rolling 12-month uses FIRST values instead of LAST ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:175-176`
- **Issue**: `valid_values = [float(v) for v in values[:periods]...]` takes first 4, not last 4
- **Fix**: Use `values[-periods:]` instead of `values[:periods]`

### Bug 3: Formula evaluator `ROE[2020:2024]` returns only last value ✅ VERIFIED FIXED
- **Location**: `src/backend/app/utils/formula_evaluator.py:115-116`
- **Issue**: When `metrics_data` is a list and `year` is tuple (range), returned `float(value[-1])` instead of collecting all values
- **Fix**: Changed to `value[start_year : end_year + 1]` to return list of values for the range

### Bug 4: Peer comparison API returns all None values ✅ VERIFIED FIXED
- **Location**: `src/backend/app/api/v1/endpoints/company.py:152-158`
- **Issue**: compare_with_peers endpoint never fetches peer metrics - all values hardcoded None
- **Fix**: Implemented actual peer metrics calculation with industry_avg, industry_median, percentile

### Bug 5: CompanyDetailPage data structure mismatch ✅ VERIFIED FIXED
- **Location**: `src/frontend/src/pages/CompanyDetailPage.tsx` vs `src/backend/app/models/schemas.py`
- **Issue**: Backend `company.py:40` returned `metrics.to_dict(orient="records")` (list) but schema expects dict
- **Fix**: Changed to build `metrics_dict` as `dict[str, float]` with most recent year values for each indicator

### Bug 6: Frontend-backend type mismatches ✅ VERIFIED FIXED
- **Location**: `src/frontend/src/lib/types.ts` vs `src/backend/app/models/schemas.py`
- **Issue**: `types.ts` had dead `CompanyDetailResponse`, `FinancialData`, `RiskAssessment` interfaces
- **Fix**: Removed dead code from `types.ts` (lines 40-68)

### Bug 7: ROE shows negative when profit negative - should be N/A ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:248-249`
- **Issue**: ROE calculated even when net_profit is negative
- **Fix**: Changed condition to require `net_profit > 0` for ROE calculation

### Bug 8: Industry filter bug with None company industry ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:330-331`
- **Issue**: Companies without industry data pass through when industry filter is set
- **Fix**: Skip companies with None industry when filter is specified

### Bug 9: Cache key missing period/years params ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:300`
- **Issue**: Screen cache key doesn't include `period` or `years` - causes wrong cache hits
- **Fix**: Include period and years in cache key generation

### Bug 10: Metrics field silently dropped in screening response ✅ VERIFIED FIXED
- **Location**: `src/backend/app/api/v1/endpoints/screen.py` and `src/backend/app/models/schemas.py`
- **Issue**: `metrics` field added to company dict but dropped during Pydantic validation because CompanyInfo didn't have metrics field
- **Fix**: Added `metrics: dict` field to CompanyInfo model in schemas.py

---

## ROI FORMULA BUG ✅ VERIFIED FIXED
- **Location**: `src/backend/app/services/financial.py:451-465`
- **Issue**: ROI defined as `净利润/总投资×100%` but uses `总资产` instead of invested capital
- **Fix**: Use correct invested capital calculation (总资产 - 流动负债)

---

## NEW ISSUES DISCOVERED

### Issue 1: Duplicate Field Definitions in ScreenRequest Schema ✅ FIXED
- **Location**: `src/backend/app/models/schemas.py`
- **Issue**: Duplicate field definitions at lines 63-80 (dead code)
- **Fix**: Removed duplicate field definitions

### Issue 2: Frontend Stores Are Dead Code ✅ COMPLETED
- **Location**: `src/frontend/src/stores/`
- **Removed**: FormulaEditor.tsx (never imported anywhere)
- **Removed**: formulaStore.ts (only used by FormulaEditor)
- **Updated**: stores/index.ts to remove formulaStore export
- **Updated**: ConditionRow, ConditionBuilder, ExportButton to import types from api/screen instead of stores
- **Updated**: ResultsTable, TableRow, TableHeader to import types from api/screen instead of stores

### Issue 3: FormulaEditor Missing UI Elements ❌ CANCELLED
- **Reason**: FormulaEditor was removed as dead code (Issue 2 completed)

### Issue 4: Missing `between` Operator ✅ IMPLEMENTED
- **Location**: `src/frontend/src/components/condition/OperatorSelector.tsx` and backend
- **Added**: `between` operator to OperatorSelector
- **Added**: `value2` optional field to Condition interface (frontend api/screen.ts and backend models/schemas.py)
- **Updated**: ValueInput to show two input fields when operator is `between`
- **Updated**: ConditionRow to handle value2 properly
- **Updated**: backend `_evaluate_conditions` and `_compare` methods to handle `between` operator

### Issue 5: TreeMap Component MISSING ✅ CREATED
- **Location**: `src/frontend/src/components/visualization/TreeMap.tsx`
- **Spec requires**: TreeMap as DEFAULT VIEW for screening results
- **Created TreeMap component with**:
  - Rectangle visualization where size represents metric value
  - Metric selector dropdown
  - Color coding based on value (lower=middle blue, higher=lighter blue)
  - Click to view company details
  - Toggle between TreeMap and Table view

### Issue 6: Screen limit default mismatch ✅ FIXED
- **Location**: `src/backend/app/models/schemas.py`
- **Spec says**: Default limit should be 100
- **Fix**: Changed default limit from 50 to 100

---

## TEST GAPS

### Missing Tests
- No tests for `years` parameter behavior
- No tests for TTM calculation
- No tests for actual condition filtering (only empty conditions tested in test_financial.py)
- No tests for formula evaluator time series range evaluation (Bug 3)
- No tests for formula_service.py, formula_parser.py, formula_lexer.py, akshare_client.py
- Integration tests directory is empty

### Existing Test Coverage (thin)
- `test_financial.py`: Only 5 tests, only tests empty conditions
- `test_redis.py`: Only 2 tests
- `src/frontend/tests/api.test.ts`: Only checks signatures, not actual behavior

---

## MISSING FEATURES

### Phase 11: Industry Comparison (JTB-011, JTB-012, JTB-013)
| Component | Status | Notes |
|-----------|--------|-------|
| CSRC Classification API | ✅ Complete | GET /industry/csrc |
| SW (申万) Classification API | ✅ Complete | GET /industry/sw-one, GET /industry/sw-three |
| Peer Comparison API | ✅ Complete | Calculates actual metrics, industry_avg, median, percentile |
| Industry Benchmark Calculation | ✅ Complete | Included in peer comparison API |
| RadarChart Component | ✅ Complete | Radar/spider chart for multi-metric comparison |
| PeerComparison Component | ✅ Complete | Displays peer metrics table with percentile |
| Industry Type Selector | ✅ Complete | CSRC/SW1/SW3 selector in PeerComparison UI |
| Industry Filter in Frontend | ✅ Complete | Include industry dropdown with CSRC/SW1/SW3 selector |
| Exclude Industry Option | ✅ Complete | Backend supports exclude_industry; UI dropdown added |
| Multi-industry Selection UI | ❌ Missing | No multi-select for industry filter |

### Phase 12: Visualization (JTB-014, JTB-015, JTB-016) ✅ MOSTLY COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| TreeMap Component | ✅ Complete | **SPEC REQUIRED AS DEFAULT VIEW** |
| TrendComparisonChart | ✅ Complete | Backend: POST /company/trend; Frontend: TrendComparisonChart with dual Y-axis, company selection in ScreeningPage |
| ValueSlider | ❌ Missing | Range slider with histogram |
| IndustryHeatmap | ❌ Missing | Industry distribution heatmap |
| ConditionTree visualization | ❌ Missing | Graphical condition structure diagram |
| Time-Series Line Chart | ❌ Missing | Historical metric trends |
| Multi-Company Comparison | ❌ Missing | Cannot compare >1 company trends |

### Phase 13: Multi-field Sorting
| Component | Status | Notes |
|-----------|--------|-------|
| Secondary Sort Support | ⚠️ Partial | Backend has `sort_by_2` and `order_2` fields but frontend doesn't expose UI for secondary sort |

### Phase 14: Edge Case Enhancements
| Component | Status | Notes |
|-----------|--------|-------|
| ROE N/A when profit negative | ✅ Complete | Verified in financial.py |
| Risk warning text messages | ❌ Missing | Only badges, no warning text |
| Mark missing years in results | ❌ Missing | Years not marked |

### Phase 15: UX & Performance
| Component | Status | Notes |
|-----------|--------|-------|
| Virtual Scrolling | ❌ Missing | For large result sets |
| Debounce (300ms) | ❌ Missing | Condition input debounce |
| Memoization (createMemo) | ❌ Missing | Performance optimization |
| Cache Invalidation | ❌ Missing | No mechanism for invalidating stale cache |

---

## Priority Order (Implementation Sequence)

### Phase 10: Critical Bug Fixes - MUST FIX FIRST
- [x] Fix Bug 1: Pass `years` parameter to `get_company_metrics()` in `financial.py:333-334`
- [x] Fix Bug 2: TTM rolling uses FIRST values - change to LAST in `financial.py:175-176`
- [x] Fix Bug 3: Formula evaluator `ROE[2020:2024]` returns only last value in `formula_evaluator.py:115-116`
- [x] Fix Bug 4: Implement peer comparison API with actual metrics in `company.py:152-158`
- [x] Fix Bug 5/6: Align CompanyDetailResponse - fix backend metrics type (list vs dict), remove dead code in types.ts
- [x] Fix Issue 1: Remove duplicate field definitions in ScreenRequest schema
- [x] Fix Issue 2: Remove dead code (FormulaEditor.tsx, formulaStore.ts)
- [x] Fix Issue 3: CANCELLED - FormulaEditor removed as dead code
- [x] Fix Issue 4: Add `between` operator to OperatorSelector
- [x] Fix Issue 6: Change Screen limit default from 50 to 100
- [x] Fix Bug 7: ROE shows N/A when profit negative in `financial.py`
- [x] Fix Bug 8: Skip companies with None industry when filter set in `financial.py:330-331`
- [x] Fix Bug 9: Include period/years in cache key in `financial.py:300`
- [x] Fix Bug 10: Preserve metrics field in screening response in `screen.py`
- [x] Fix ROI formula bug: Use invested capital instead of total assets in `financial.py:451-465`

### Phase 11: Industry Comparison (JTB-011, JTB-012, JTB-013)
- [x] Implement peer comparison API endpoint with actual metrics calculation
- [x] Create industry benchmark calculation (avg, median, percentile)
- [x] Create RadarChart component
- [x] Create PeerComparison component with industry type selector
- [x] Expose industry filter in frontend (include + exclude dropdowns)
- [x] Add exclude industry option to screening UI
- [ ] Add multi-industry selection to screening UI

### Phase 12: Visualization (JTB-014, JTB-015, JTB-016) - HIGH PRIORITY
- [x] **Create TreeMap component** - SPEC SAYS DEFAULT VIEW, MUST IMPLEMENT
- [x] Create TrendComparisonChart (up to 10 companies, dual Y-axis) - Backend: `get_company_metrics_time_series` in financial.py, POST /company/trend; Frontend: TrendComparisonChart component
- [ ] Create ConditionTree visualization
- [ ] Create ValueSlider with histogram
- [ ] Create IndustryHeatmap
- [ ] Create Time-Series Line Chart for historical metric trends
- [ ] Create Multi-Company Comparison feature

### Phase 13: Multi-field Sorting
- [ ] Add secondary sort field UI (backend already supports `sort_by_2`, `order_2`)

### Phase 14: Edge Case Enhancements
- [ ] Add risk warning text messages (not just badges)
- [ ] Mark missing years explicitly in results table

### Phase 15: UX & Performance
- [ ] Implement virtual scrolling for large result sets
- [ ] Add 300ms debounce to condition inputs
- [ ] Add createMemo for expensive computations
- [ ] Add cache invalidation mechanism

### Cleanup (Can do anytime)
- [x] Remove dead code: unused `CompanyDetailResponse` in `types.ts` lines 40-49 ✅ REMOVED
- [x] Remove dead code: `FinancialData` and `RiskAssessment` interfaces in `types.ts` ✅ REMOVED
- [ ] Remove dead code: FormulaEditor.tsx is never imported anywhere
- [ ] Remove dead code: All 5 stores are never used by pages (except formulaStore used by dead FormulaEditor)
- [ ] Add tests for formula_evaluator time series range (Bug 3)
- [ ] Add tests for TTM calculation
- [ ] Add tests for actual condition filtering
- [ ] Create integration tests (integration/ directory is empty)

---

## Spec Coverage Summary
| Spec | Topic | Status | Verification |
|------|-------|--------|--------------|
| specs/00_overview.md | Product overview | ✅ Complete | Document exists |
| specs/01_core_jobs.md | Core user jobs (JTB-001 to JTB-004) | ⚠️ Partial | Multi-condition filtering works; sorting works; details and save work; TreeMap MISSING |
| specs/02_data_source.md | akshare + Redis caching | ✅ Complete | akshare + Redis done |
| specs/03_technical_architecture.md | Tech stack definition | ✅ Complete | Matches implementation |
| specs/04_frontend.md | Frontend pages and components | ⚠️ Partial | Pages done; TreeMap created; FormulaEditor cancelled (removed); type mismatches remain |
| specs/05_backend.md | API endpoints | ⚠️ Partial | Endpoints exist; undocumented endpoints (/industry/*, /formula/*, /cache/refresh) |
| specs/06_ux.md | UX requirements | ⚠️ Partial | Lazy loading done; virtual scrolling/debounce missing |
| specs/07_custom_formula.md | Custom formula engine | ⚠️ Partial | Lexer/parser/evaluator done; Bug 3 fixed; FormulaEditor cancelled (removed) |
| specs/08_edge_cases.md | Edge case handling | ✅ Mostly | Status/risk flags done; ROE N/A done; warning text missing |
| specs/09_industry_comparison.md | Industry comparison | ✅ Mostly | CSRC/SW APIs done; peer comparison, benchmark, radar chart done |
| specs/10_visualization.md | Data visualization | ⚠️ Partial | RadarChart done; **TreeMap COMPLETED (required as default view)** |

---

## Verification Commands

After implementation:
```bash
# Backend
cd src/backend
pip install -r requirements.txt
pytest tests/ -v
mypy app/
ruff check app/

# Frontend
cd src/frontend
npm install
npm test
npm run typecheck
npm run lint
```

---

## Summary of Critical Fixes Needed (In Priority Order)

1. ~~[CRITICAL] Bug 3 (formula_evaluator.py:115-116)~~ - ✅ FIXED
2. ~~[CRITICAL] TreeMap component~~ - ✅ CREATED
3. **[HIGH] Bug 5/6 (CompanyDetailResponse)** - Backend metrics is list, schema expects dict; frontend types.ts dead code
4. ~~[HIGH] Issue 1 (schemas.py)~~ - ✅ FIXED (duplicate field definitions removed)
5. ~~[MEDIUM] Issue 2 (stores)~~ - ✅ COMPLETED (dead code removed)
6. ~~[MEDIUM] Issue 3 (FormulaEditor)~~ - ❌ CANCELLED (FormulaEditor removed)
7. ~~[MEDIUM] Issue 4 (OperatorSelector)~~ - ✅ IMPLEMENTED (`between` operator added)
8. ~~[MEDIUM] Issue 6 (limit default)~~ - ✅ FIXED (changed to 100)
9. **[LOW] Secondary sort UI** - Backend supports but frontend doesn't expose
10. **[LOW] Edge case warning text** - Risk warnings show badges but no explanatory text

---

## Dead Code Inventory (Confirmed)

| Item | Location | Status |
|------|----------|--------|
| `CompanyDetailResponse` (wrong) | `src/frontend/src/lib/types.ts:40-49` | ✅ REMOVED |
| `FinancialData` interface | `src/frontend/src/lib/types.ts:51-61` | ✅ REMOVED |
| `RiskAssessment` interface | `src/frontend/src/lib/types.ts:64-68` | ✅ REMOVED |
| `FormulaEditor.tsx` | `src/frontend/src/components/formula/FormulaEditor.tsx` | ✅ REMOVED (Issue 2) |
| `formulaStore.ts` | `src/frontend/src/stores/formulaStore.ts` | ✅ REMOVED (Issue 2) |
| `screeningStore.ts` | `src/frontend/src/stores/screeningStore.ts` | Dead - pages use local createSignal() |
| `companyStore.ts` | `src/frontend/src/stores/companyStore.ts` | Dead - pages use local createSignal() |
| `savedConditionsStore.ts` | `src/frontend/src/stores/savedConditionsStore.ts` | Dead - pages use local createSignal() |
| `uiStore.ts` | `src/frontend/src/stores/uiStore.ts` | Dead - never imported anywhere |
| `components/formula/` directory | entire directory | ✅ REMOVED (contained FormulaEditor) |
| `integration/__init__.py` | `src/backend/tests/integration/__init__.py` | Empty - no integration tests |

---

## Items Still Remaining

- Secondary sort UI (backend supports but frontend doesn't expose)
- Risk warning text messages
- Virtual scrolling for large result sets
- Debounce (300ms) for condition inputs
- Memoization (createMemo) for performance
- Cache invalidation mechanism
