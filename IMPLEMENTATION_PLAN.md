# Implementation Plan - A股财务指标分析应用

## Status: IN PROGRESS - v0.4.0 Feature Completion Nearly Complete

## CRITICAL CONSTRAINT: 只使用akshare提供的数据api, 不要使用其他数据api

---

## Priority Order (Implementation Sequence)

### Critical Bugs (Must Fix - Verified)

- [x] **JTB-008** profit_only filter broken - Fixed by storing `net_profit` in metrics dict (financial.py)
- [x] **JTB-001** AND/OR logic not working - Fixed by adding `logic` field to ScreenRequest schema and including in API request
- [x] **JTB-001** Years selector missing from UI - Fixed by adding Years input in ConditionRow.tsx
- [x] **JTB-005** Time series syntax broken (TWO bugs):
  1. Fixed `formula_lexer.py` - added COLON token type
  2. Fixed `formula_parser.py` - removed premature `self.advance()` before LBRACKET check
- [x] **JTB-004** No save button on ScreeningPage - Fixed by adding Save Screen button and handleSaveScreen handler

### High Priority Gaps (Verified)

- [ ] Cache TTL not enforced for saved screens - `redis_manager.set_json(SAVED_SCREENS_KEY, ...)` called without TTL (screen.py:104, 125), meaning saved screens never expire

### Lower Priority

- [ ] Create integration tests (integration/ directory is empty)
- [ ] Formula engine test coverage gaps - comparison operators (>, <, >=, <=, ==, !=) not tested, multi-arg functions not tested
- [ ] Spec documentation gaps - many implemented API endpoints not documented in specs/05_backend.md

---

## Verified Complete Items

### Core Functionality
- [x] JTB-001 Multi-condition filtering with formulas - works (AND/OR logic now working)
- [x] JTB-002 Sorting by metrics - works
- [x] JTB-003 Company detail view - modal exists with metrics display
- [x] JTB-004 Save screen button - works (button added to UI)
- [x] JTB-005 Formula engine basic operators (+, -, *, /) - works
- [x] JTB-005 Built-in functions (AVG, SUM, MIN, MAX, STD) - works
- [x] JTB-005 Time series syntax (e.g., ROE[2020:2024]) - works
- [x] JTB-006 Formula evaluation in screening - works (when formula is valid)
- [x] JTB-008 profit_only filter - works (now correctly filters by net_profit)

### Edge Cases
- [x] JTB-007 include_suspended flag works
- [x] JTB-009 include_st flag works
- [x] JTB-010 require_complete_data flag works

### JTB-010 Metrics Display (NEW)
- [x] JTB-010 Missing data displayed as "N/A" - TableRow now shows metrics with N/A for missing values
- [x] JTB-010 available_years shown to users - displayed in results table
- [x] Loss-making companies (negative metrics) shown in red in frontend

### Industry Comparison
- [x] JTB-011 Industry filtering works (industry/exclude_industry/industries)
- [x] JTB-012 PeerComparison component with radar chart
- [x] JTB-013 Industry selection UI

### Visualization
- [x] JTB-014 TreeMap component
- [x] JTB-015 TrendComparisonChart with dual Y-axis
- [x] JTB-016 ConditionTree component
- [x] JTB-016 IndustryHeatmap component
- [x] JTB-016 ValueSlider component (integrated into ValueInput)

### Data Layer
- [x] akshare integration (3 key functions)
- [x] Redis caching exists (except saved screens TTL)
- [x] Cache refresh endpoint

### Formula Engine Components
- [x] Lexer implementation
- [x] Parser implementation
- [x] Evaluator implementation
- [x] Formula validation service

### Logging Infrastructure (JTB-101 through JTB-108)
- [x] JTB-101 API request logging - with method, path, params, duration
- [x] JTB-102 Error logging - with error type, stack trace, request context
- [x] JTB-103 Data acquisition logging - akshare requests/responses
- [x] JTB-104 Log levels - DEBUG/INFO/WARNING/ERROR/CRITICAL
- [x] JTB-105 Structured JSON log output
- [x] JTB-106 Request ID tracking - UUIDv4贯穿请求生命周期
- [x] JTB-107 Sensitive data filtering - masks password/token/secret/etc.
- [x] JTB-108 Slow request alerts - threshold 1000ms

### API Endpoints (Backend has but not all documented in specs)
- [x] GET /api/v1/industry/csrc - Industry classification
- [x] GET /api/v1/industry/sw-one - Shenwan L1
- [x] GET /api/v1/industry/sw-three - Shenwan L3
- [x] POST /api/v1/company/compare - Peer comparison
- [x] POST /api/v1/company/trend - Trend comparison
- [x] POST /api/v1/formula/validate - Formula validation
- [x] POST /api/v1/formula/evaluate - Formula evaluation
- [x] POST /api/v1/formula/save - Save formula
- [x] GET /api/v1/formula/saved - Get saved formulas
- [x] DELETE /api/v1/formula/{formula_id} - Delete formula
- [x] DELETE /api/v1/screen/saved/{screen_id} - Delete saved screen

---

## Critical Bugs Detail

### Bug 1: JTB-008 profit_only filter broken (HIGH)
**Location**: `src/backend/app/services/financial.py:385-388`
```python
if profit_only:
    net_profit = metrics.get("net_profit") or metrics.get("roe", 0)
    if net_profit is None or net_profit <= 0:
        continue
```
**Issue**: `_extract_financial_metrics()` stores `net_profit_growth` not `net_profit`. Chinese keys like `净利润` used internally but not exposed as `net_profit`. Always falls back to ROE.

### Bug 2: JTB-001 AND/OR logic not working (HIGH)
**Location**: `src/frontend/src/pages/ScreeningPage.tsx:26,100-136` and `src/backend/app/api/v1/endpoints/screen.py:64-84`
**Issue**: `logic` state exists and UI toggle works, but `handleScreen()` never includes `logic` in the request object sent to backend. Backend also doesn't accept `logic` parameter.

### Bug 3: JTB-001 Years selector missing (HIGH)
**Location**: `src/frontend/src/components/condition/ConditionRow.tsx`
**Issue**: `Condition` schema has `years?: number` but no UI input for years. Only `period` selector exists.

### Bug 4: JTB-005 Time series syntax broken (TWO bugs - HIGH)

**Bug 4a - Lexer**: `src/backend/app/utils/formula_lexer.py`
**Issue**: No COLON token type. `read_identifier()` at line 65 includes `:` as part of identifiers: `self.current_char in ("_", ":")`. The `:` is absorbed into identifiers rather than tokenized as a separate COLON token.

**Bug 4b - Parser**: `src/backend/app/utils/formula_parser.py:148`
```python
def parse_time_series(self, metric_name: str) -> ASTNode:
    self.advance()  # BUG: advances BEFORE checking LBRACKET

    if self.current_token is None or self.current_token.type != TokenType.LBRACKET:
        raise FormulaParserError("Expected '[' after metric name", self.pos)
```
**Issue**: When parsing `ROE[2020:2024]`, parser enters with `current_token` pointing at `[`. But `self.advance()` moves past `[` to `2020`. Then the LBRACKET check at line 150 fails.

### Bug 5: JTB-004 No save button on ScreeningPage (HIGH)
**Location**: `src/frontend/src/pages/ScreeningPage.tsx`
**Issue**: `saveScreen()` API function exists in `src/frontend/src/api/screen.ts:64` but no button triggers it. No import of saveScreen in ScreeningPage.

---

## Missing Features Detail



### CSRC 3-Level Hierarchy (JTB-011)
**Location**: `src/backend/app/utils/akshare_client.py`
**Implementation**: Now uses `stock_industry_category_cninfo` instead of the deprecated `stock_info_csrc_main`. Returns proper 门类/大类/中类 structure.

### THS Industry Classification (JTB-011)
**Location**: `src/backend/app/utils/akshare_client.py`
**Implementation**: `get_industry_ths()` method now exists and provides THS industry classification.

---

## Medium Priority Detail

### Saved Screens Cache TTL Missing
**Location**: `src/backend/app/api/v1/endpoints/screen.py:104, 125`
```python
await redis_manager.set_json(SAVED_SCREENS_KEY, existing)  # No TTL
await redis_manager.set_json(SAVED_SCREENS_KEY, updated)   # No TTL
```
**Issue**: Saved screens stored permanently without expiration. Other cache data expires in 24 hours.

### Frontend Type Inconsistencies
| Field | types.ts | screen.ts | Used by Component |
|-------|----------|-----------|-------------------|
| metric | required | optional | screen.ts (optional) |
| formula | N/A | optional | screen.ts |
| value2 | N/A | optional | screen.ts |
| period | `string` | `Period` | screen.ts |
| years | optional | optional | both |

---

## Spec Documentation Gaps

### API endpoints that exist but not documented in specs/05_backend.md:
- Industry endpoints (csrc, sw-one, sw-three)
- Company comparison/trend endpoints
- Formula CRUD endpoints
- Cache refresh endpoint

---

## Codebase Observations

### src/lib vs src/frontend/src/lib
- `src/lib/` does not exist
- Shared utilities are in `src/frontend/src/lib/` (types.ts, formatters.ts, debounce.ts)
- specs/03_technical_architecture.md references `src/lib` incorrectly

---

## Verification Commands

After implementation:
```bash
# Backend
cd src/backend
pip install -r requirements.txt
pytest tests/ -v --tb=short
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

## Release Planning

### v0.3.0 - Bug Fix Release (COMPLETED)
- [x] Fix profit_only filter (use correct metric key)
- [x] Fix AND/OR logic (add to request and backend)
- [x] Add Years selector UI
- [x] Add Save button to ScreeningPage
- [x] Fix time series syntax (COLON token in lexer, advance-after-check in parser)
- [x] Implement logging infrastructure (JTB-101 through JTB-108)

### v0.4.0 - Feature Completion
- [x] Add THS industry classification
- [x] Implement CSRC 3-level hierarchy
- [x] Display N/A for missing data
- [x] Show available_years to users

### v0.5.0 - Documentation & Polish
- [ ] Add integration tests
- [ ] Document undocumented API endpoints in specs/05_backend.md
- [ ] Update specs/03_technical_architecture.md with formula section
- [ ] Fix frontend type inconsistencies
- [ ] Add Redis TTL to saved screens storage
- [ ] Add visual distinction for loss-making companies (negative metrics in red)