# Implementation Plan - A股财务指标分析应用

## Status: v0.5.12 - NEW-5 FIXED: Export button now fetches all pages (up to 100) before exporting CSV

## CRITICAL CONSTRAINT: 只使用akshare提供的数据api, 不要使用其他数据api

---

## Priority Order (Implementation Sequence)

### Critical Bugs (Must Fix)

- [x] **BUG-F1** `formula_evaluator.py:118-123` - Year range uses list index instead of year value. `ROE[2020:2024]` accesses indices 2020-2024 instead of years 2020-2024
- [x] **BUG-F2** `formula_parser.py:162-166` - Checks `TokenType.IDENTIFIER` instead of `TokenType.COLON` for range syntax
- [x] **BUG-F3** `formula_evaluator.py:238-242` - Division by zero in `evaluate_list()` silently returns 0.0 instead of raising error
- [x] **BUG-F4** `screen.py:106-108` - **TTL DESIGN FLAW**: All saved screens stored in SINGLE Redis key with one TTL. When TTL expires, ALL saved screens are lost at once. No per-screen TTL or TTL refresh on access.
- [x] **BUG-F5** `formula_service.py:135,155,180` - Saved formulas stored without TTL (no TTL passed when saving/updating/deleting)
- [x] **BUG-F6** `cache.py:13` - Uses `KEYS *` command which is O(N) and blocks Redis server (should use SCAN iterator)

### High Priority Bugs

- [x] **BUG-H1** `financial.py:389-392` - profit_only filter uses `metrics.get("net_profit") or metrics.get("roe", 0)` which falls back to ROE when net_profit is exactly 0 (breakeven)
- [x] **BUG-H2** `financial.py:428-433` - require_complete_data uses `min(num_conditions, 3)` threshold instead of requiring ALL condition metrics
- [x] **BUG-H3** `financial.py:431` - ~~metric name mismatch: `gross_margin`~~ **VERIFIED NOT A BUG**: `gross_margin` is consistent throughout
- [x] **BUG-H4** `screen.py:122-130` - ~~Delete returns `{"deleted": True}` even when screen_id wasn't found~~ **VERIFIED NOT A BUG**: Logic `len(existing) > len(updated)` correctly returns False when not found
- [x] **BUG-H5** `company.py:198-205,292-293` - Silent exception swallowing in peer comparison AND trend endpoint with `continue`, no logging
- [x] **BUG-H6** `akshare_client.py` - Uses different data sources: `get_company_info()` uses `stock_individual_info_ths`, `get_market_capital()` and `get_industry_peers()` use `stock_individual_info_em` [FIXED: Changed get_company_info() to use stock_individual_info_em for consistency with other functions]
- [x] **BUG-H7** `formula_service.py` has `update_formula()` method but NO corresponding PUT API endpoint
- [x] **BUG-H8** `screen.py:73-88` - Secondary sorting (`sort_by_2`, `order_2`) NOT passed to `get_companies_from_financial_service()`. Secondary sorting is defined in schema and service supports it, but endpoint never passes these parameters.
- [x] **BUG-H9** `financial.py:406,412` - Sort key uses `or 0` causing missing data to sort to TOP in descending order (0 is largest)

### High Priority Gaps

- [x] **GAP-F1** Type inconsistency - Three different Condition definitions in `api/screen.ts`, `stores/screeningStore.ts`, `lib/types.ts` with mismatched fields [FIXED: Unified Condition type across all files, now includes metric?, formula?, value2?, period types]
- [x] **GAP-F2** `OperatorSelector.tsx:43` - ~~Duplicate import `from 'solid-js'`~~ **VERIFIED NOT A BUG**: Only one import exists
- [x] **GAP-F3** `ConditionTree.tsx:193` - Shows "Unknown metric" when formula is used instead of metric (should check `condition.formula` as fallback) [FIXED]
- [x] **GAP-F4** `ExportButton.tsx:13-19` - CSV export only includes company info (Code, Name, Industry, Status, Risk Flag), does NOT include calculated metrics or available_years [FIXED]
- [x] **GAP-F5** `TreeMap.tsx:90-142` - Uses simple slice-and-dice algorithm instead of proper squarified treemap [FIXED: Implemented squarified treemap algorithm with proper aspect ratios]
- [x] **GAP-F6** `TrendComparisonChart.tsx:155-161` - Time range selector is cosmetic only; always fetches 5 years regardless of selection [FIXED: Now uses yearsMap[timeRange()] to fetch correct years]
- [x] **GAP-F7** `FormulaEditor.tsx:204-212` - Shows raw formula preview, not actual calculated result. `evaluateFormula` API exists but is never called [FIXED: FormulaEditor now calls evaluateFormula with sample company metrics and displays the calculated result]
- [x] **GAP-F8** `Pagination.tsx` - No direct page number input (only Previous/Next/ellipsis buttons) [FIXED: Added page number input field with validation and Go button]
- [x] **GAP-F9** `metrics.py:7-17` - Hardcoded English metric names instead of Chinese names from `FinancialService.METRIC_DEFINITIONS` (FIXED: Now uses Chinese names from METRIC_DEFINITIONS)

### Documentation Gaps

- [x] specs/05_backend.md - Missing industry endpoints (csrc, sw-one, sw-three, ths) [FIXED: Added all industry endpoints, company compare/trend, formula CRUD, cache refresh]
- [x] specs/03_technical_architecture.md - References `src/lib` but it doesn't exist (should be `src/frontend/src/lib`) [FIXED: Corrected paths]
- [x] specs/03_technical_architecture.md - Missing formula engine section [FIXED: Added formula engine architecture]
- [x] specs/09_industry_comparison.md - THS industry classification is implemented but not documented [FIXED: Documented THS classification]
- [x] Data source spec says `stock_financial_report_sina` but code uses `stock_profit_sheet_by_report_em` for income data [FIXED: Updated specs/02_data_source.md to reflect actual implementation]

### New Issues Found (Requiring Investigation)

- [ ] **NEW-1** `log_data_acquisition()` defined in `logging.py:234-262` but NOT used anywhere in akshare_client.py
- [ ] **NEW-2** `track_duration` decorator defined in `logging.py:265-290` but no functions use `@track_duration`
- [ ] **NEW-3** `formula_service.py` has race condition potential - non-atomic read-modify-write pattern for save/update/delete
- [x] **NEW-4** CACHE_TTL duplicated in `company.py:24` and `financial.py:10` (both hardcode 86400 instead of using `settings.CACHE_TTL`) [FIXED: Replaced with settings.CACHE_TTL in both files]
- [x] **NEW-5** Export limited to current page only - cannot export all pages [FIXED: ExportButton now fetches all pages (up to 100 pages) before exporting]
- [ ] **NEW-6** `TrendComparisonChart.tsx:73-78` - Financial report date annotations are hardcoded placeholders (Q1 on 04-30, Q2 on 08-31) not actual company-specific release dates
- [x] **NEW-7** THS industry classification implemented but not documented in specs/09_industry_comparison.md [FIXED: Documented in specs]
- [x] **NEW-8** `akshare_client.py` - Data source discrepancy: spec says `stock_financial_report_sina` but code uses `stock_profit_sheet_by_report_em` for income data [FIXED: Updated specs/02_data_source.md]
- [x] **NEW-9** Frontend npm dependencies may not be fully installed (eslint not found, TypeScript definition files missing) [FIXED: Dependencies installed, eslint and typecheck pass]
- [x] **NEW-10** Backend mypy shows errors - missing type stubs for pandas and akshare [CANNOT FIX: pip not available in environment]

---

## Verified Complete Items

### Core Functionality
- [x] JTB-001 Multi-condition filtering with formulas - works (BUG-F1, BUG-F2 fixed)
- [x] JTB-002 Sorting by metrics - works (BUG-H9 fixed)
- [x] JTB-003 Company detail view - modal exists with metrics display
- [x] JTB-004 Save screen button - works (button added to UI)
- [x] JTB-005 Formula engine basic operators (+, -, *, /) - works (BUG-F1, BUG-F2, BUG-F3 fixed)
- [x] JTB-005 Built-in functions (AVG, SUM, MIN, MAX, STD) - works
- [x] JTB-005 Time series syntax (e.g., `ROE[2020:2024]`) - works (BUG-F1 and BUG-F2 fixed)
- [x] JTB-006 Formula evaluation in screening - works (when formula is valid)
- [x] JTB-008 profit_only filter - works (BUG-H1 fixed)

### Edge Cases
- [x] JTB-007 include_suspended flag works
- [x] JTB-009 include_st flag works
- [x] JTB-010 require_complete_data flag works (BUG-H2 fixed)

### JTB-010 Metrics Display
- [x] JTB-010 Missing data displayed as "N/A" - TableRow now shows metrics with N/A for missing values
- [x] JTB-010 available_years shown to users - displayed in results table
- [x] JTB-010 Loss-making companies (negative metrics) shown in red in frontend

### Industry Comparison
- [x] JTB-011 Industry filtering works (industry/exclude_industry/industries)
- [x] JTB-012 PeerComparison component with radar chart
- [x] JTB-013 Industry selection UI

### Visualization
- [x] JTB-014 TreeMap component (now uses proper squarified treemap algorithm - GAP-F5 FIXED)
- [x] JTB-015 TrendComparisonChart with dual Y-axis
- [x] JTB-016 ConditionTree component
- [x] JTB-016 IndustryHeatmap component
- [x] JTB-016 ValueSlider component (integrated into ValueInput)

### Data Layer
- [x] akshare integration (3 key functions: stock_financial_analysis_indicator, stock_financial_report_sina, stock_zh_a_hist)
- [x] Redis caching exists
- [x] Cache refresh endpoint

### Formula Engine Components
- [x] Lexer implementation
- [x] Parser implementation
- [x] Evaluator implementation
- [x] Formula validation service

### Logging Infrastructure (JTB-101 through JTB-108)
- [x] JTB-101 API request logging - with method, path, params, duration
- [x] JTB-102 Error logging - with error type, stack trace, request context
- [x] JTB-103 Data acquisition logging - function defined (but NOT actively used - NEW-1)
- [x] JTB-104 Log levels - DEBUG/INFO/WARNING/ERROR/CRITICAL
- [x] JTB-105 Structured JSON log output
- [x] JTB-106 Request ID tracking - UUIDv4贯穿请求生命周期
- [x] JTB-107 Sensitive data filtering - masks password/token/secret/etc.
- [x] JTB-108 Slow request alerts - threshold 1000ms

### API Endpoints (Backend has but not all documented in specs)
- [x] GET /api/v1/industry/csrc - Industry classification
- [x] GET /api/v1/industry/sw-one - Shenwan L1
- [x] GET /api/v1/industry/sw-three - Shenwan L3
- [x] GET /api/v1/industry/ths - THS industry
- [x] POST /api/v1/company/compare - Peer comparison
- [x] POST /api/v1/company/trend - Trend comparison
- [x] POST /api/v1/formula/validate - Formula validation
- [x] POST /api/v1/formula/evaluate - Formula evaluation
- [x] POST /api/v1/formula/save - Save formula
- [x] GET /api/v1/formula/saved - Get saved formulas
- [x] DELETE /api/v1/formula/{formula_id} - Delete formula
- [x] PUT /api/v1/formula/{formula_id} - **MISSING** (BUG-H7)
- [x] DELETE /api/v1/screen/saved/{screen_id} - Delete saved screen

### Industry Classification
- [x] CSRC 3-level hierarchy (门类/大类/中类) via stock_industry_category_cninfo
- [x] THS industry classification via get_industry_ths()
- [x] Shenwan industry classification (SW) via stock_industry_sw()

### Export Functionality
- [x] JTB-017 CSV export of screening results - ExportButton exports all pages (up to 100 pages/10000 companies) with calculated metrics and available_years

---

## Critical Bugs Detail

### BUG-F1: Year Range Index Bug
**Location**: `src/backend/app/utils/formula_evaluator.py:118-123`
```python
if isinstance(value, list):
    if len(value) == 0:
        raise FormulaEvaluatorError(f"Empty list for metric: {metric_name}")
    if isinstance(year, tuple):
        start_year, end_year = year
        return value[start_year : end_year+1]  # BUG: uses list indices, not year values
```
**Issue**: When evaluating `ROE[2020:2024]`, if ROE has data for years [2019,2020,2021,2022,2023], this would access indices 2020-2024 which may not exist or be wrong years. The dict handler correctly iterates through years as keys, but the list handler incorrectly uses year values as indices.

### BUG-F2: Wrong Token Type Check
**Location**: `src/backend/app/utils/formula_parser.py:162-166`
```python
if (
    self.current_token is not None
    and self.current_token.type == TokenType.IDENTIFIER  # BUG: should be COLON
    and self.current_token.value == ":"
):
```
**Issue**: Should check `TokenType.COLON` instead. Currently works only because lexer allows `:` in identifiers.

### BUG-F3: Silent Division by Zero
**Location**: `src/backend/app/utils/formula_evaluator.py:238-242`
```python
elif node.operator == "/":
    if right_val == 0:
        results.append(0.0)  # BUG: silently returns 0.0
    else:
        results.append(left_val / right_val)
```
**Issue**: Should raise an error or return NaN, not silently return 0.0 which can corrupt calculations. Inconsistent with single-value division which properly raises an error.

### BUG-F4: TTL Design Flaw for Saved Screens
**Location**: `src/backend/app/api/v1/endpoints/screen.py:106-108`
**Issue**: All saved screens are stored in a SINGLE Redis key with one TTL. When TTL expires, ALL saved screens are lost at once. No per-screen TTL or TTL refresh on access.

### BUG-F5: Saved Formulas Stored Without TTL
**Location**: `src/backend/app/services/formula_service.py:135,155,180`
**Issue**: `save_formula`, `delete_formula`, `update_formula` all do NOT pass TTL to Redis set_json. Contrast with screen.py which correctly uses `settings.CACHE_TTL`.

### BUG-F6: Uses KEYS * Command
**Location**: `src/backend/app/api/v1/endpoints/cache.py:13`
**Issue**: Uses `keys("*")` which is O(N) and blocks Redis server. Should use SCAN iterator instead.

---

## High Priority Bugs Detail

### BUG-H1: profit_only False Positive
**Location**: `src/backend/app/services/financial.py:389-392`
```python
net_profit = metrics.get("net_profit") or metrics.get("roe", 0)
if net_profit is None or net_profit <= 0:
    continue
```
**Issue**: When net_profit is exactly 0 (breakeven), the Python `or` treats 0 as falsy and falls back to ROE. A company with positive ROE but zero net profit would incorrectly pass the filter.

### BUG-H2: require_complete_data Weak Threshold
**Location**: `src/backend/app/services/financial.py:428-433`
```python
def _has_complete_metrics(self, metrics: dict[str, Any], num_conditions: int) -> bool:
    required_metrics = ["roe", "roi", "gross_margin", "net_profit_growth", "revenue_growth"]
    present_count = sum(1 for m in required_metrics if metrics.get(m) is not None)
    return present_count >= min(num_conditions, 3)  # BUG: caps at 3
```
**Issue**: Should require all condition metrics to be present, not just min(3, num_conditions).

### BUG-H5: Silent Exception Swallowing
**Location**: `src/backend/app/api/v1/endpoints/company.py:198-205,292-293`
```python
for peer_code in peer_codes[:20]:
    try:
        peer_metric = await financial_service.get_company_metrics(peer_code, period="annual", years=5)
        peer_metrics_list.append(peer_metric)
    except Exception:
        continue  # BUG: silently swallows all exceptions
```
**Issue**: Peer comparison AND trend endpoint silently skip companies on any error with no logging, making debugging difficult.

### BUG-H6: Inconsistent Data Sources
**Location**: `src/backend/app/utils/akshare_client.py`
- `get_company_info()` (line 92) uses `stock_individual_info_ths`
- `get_market_capital()` (line 185) uses `stock_individual_info_em`
- `get_industry_peers()` (line 298) uses `stock_individual_info_em`

**Issue**: Different data sources may return different field names and values for the same company.

### BUG-H7: Missing Update API Endpoint
**Location**: `src/backend/app/services/formula_service.py:158-184` has `update_formula()` but `src/backend/app/api/v1/endpoints/formula.py` has no PUT endpoint.

### BUG-H8: Secondary Sorting Never Works
**Location**: `src/backend/app/api/v1/endpoints/screen.py:73-88`
**Issue**: `sort_by_2` and `order_2` are NOT passed to `get_companies_from_financial_service()`. Secondary sorting is defined in schema and service supports it, but endpoint never passes these parameters.

### BUG-H9: Sort Key Causes Missing Data to Sort to Top
**Location**: `src/backend/app/services/financial.py:406,412`
```python
key=lambda x: x.get("metrics", {}).get(sort_by) or 0
```
**Issue**: For descending order, companies with missing metrics sort to TOP because 0 is the largest value in descending order.

---

## High Priority Gaps Detail

### GAP-F1: Type Inconsistencies
**Locations**:
- `src/frontend/src/api/screen.ts:6-14` - Condition has `metric?`, `formula?`, `value2?`
- `src/frontend/src/stores/screeningStore.ts:6-12` - Condition has `metric` (required), NO `formula`, NO `value2`
- `src/frontend/src/lib/types.ts:14-20` - Condition has `metric` (required), NO `formula`, NO `value2`, `period?: string`

### GAP-F3: ConditionTree Shows "Unknown metric" for Formulas
**Location**: `src/frontend/src/components/condition/ConditionTree.tsx:193`
**Issue**: Should check `condition.formula` as fallback like ResultsTable.tsx does with `cond.metric || cond.formula`.
**Status**: [x] FIXED - Changed `condition.metric || 'Unknown metric'` to `condition.metric || condition.formula || 'Unknown metric'`

### GAP-F4: CSV Export Does NOT Include Calculated Metrics
**Location**: `src/frontend/src/components/results/ExportButton.tsx:13-19`
**Issue**: Only exports Code, Name, Industry, Status, Risk Flag. Does NOT export `metrics` or `available_years` from CompanyInfo.
**Status**: [x] FIXED - Updated ExportButton to accept conditions prop and export available_years and metrics data matching what ResultsTable displays. Added CSV escaping for values with commas/quotes.

### GAP-F5: Non-Squarified TreeMap
**Location**: `src/frontend/src/components/visualization/TreeMap.tsx:90-142`
**Issue**: Uses simple horizontal/vertical strip alternation (slice-and-dice) instead of proper squarified algorithm for better aspect ratios.
**Status**: [x] FIXED - Implemented proper squarified treemap algorithm with `squarify()`, `layoutRow()`, and `getWorstAspectRatio()` functions. The new algorithm creates rectangles with better aspect ratios by iteratively building rows and choosing the best layout.

### GAP-F6: Cosmetic Time Range Selector
**Location**: `src/frontend/src/components/visualization/TrendComparisonChart.tsx:155-161`
```typescript
const response = await apiClient.post('/company/trend', {
  codes,
  metrics: [leftMetric(), rightMetric()],
  period: 'annual',
  years: 5,  // HARDCODED - ignores timeRange()
});
```
**Issue**: Time range selector (`1Y`, `3Y`, `5Y`, `ALL`) only filters display, not what is fetched.

### GAP-F7: FormulaEditor Shows Preview Not Calculated Result
**Location**: `src/frontend/src/components/condition/FormulaEditor.tsx:204-212`
**Issue**: Shows raw formula text, not actual computed result. `evaluateFormula` API exists but is never called in frontend.
**Status**: [x] FIXED - FormulaEditor now imports `evaluateFormula`, accepts `companies` prop, calls evaluateFormula after successful validation using the first company's metrics, and displays the calculated result in the preview section. Also updated ConditionRow to pass companies to FormulaEditor.

---

## Test Coverage Gaps

| Gap Item | Status | Notes |
|----------|--------|-------|
| Time series parsing (`ROE[2023]`, `ROE[2020:2024]`) | NOT TESTED | No tests for `parse_time_series()` |
| Time series evaluation | NOT TESTED | `test_get_time_series_value_with_list` only tests year parameter |
| Multiple function arguments (`AVG(roe, roi)`) | NOT TESTED | Tests only `AVG(roe + roi)`, not comma-separated args |
| Division by zero in `evaluate_list()` | NOT TESTED | Only tests `evaluate()`, not `evaluate_list()` |
| Complete integration flow | NOT TESTED | No integration tests exist (`tests/integration/__init__.py` is empty) |
| Formula update operation | NOT TESTED | PUT endpoint now exists (BUG-H7 fixed) |
| Comparison operators in formula context | NOT TESTED | Only tested in condition filtering context |
| Financial report date annotations | NOT TESTED | Annotations are hardcoded placeholders, not actual company-specific dates |

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

### v0.4.0 - Feature Completion (COMPLETED)
- [x] Add THS industry classification
- [x] Implement CSRC 3-level hierarchy
- [x] Display N/A for missing data
- [x] Show available_years to users
- [x] Fix AND/OR logic (add to request and backend)
- [x] Add Years selector UI
- [x] Add Save button to ScreeningPage
- [x] Fix time series syntax (COLON token in lexer, advance-after-check in parser)
- [x] Implement logging infrastructure (JTB-101 through JTB-108)

### v0.5.0 - Bug Fix Release (COMPLETED)
- [x] Fix formula_evaluator year range index bug (BUG-F1)
- [x] Fix formula_parser token type check (BUG-F2)
- [x] Fix division by zero silent return in evaluate_list (BUG-F3)
- [x] Fix TTL design flaw for saved screens (BUG-F4)
- [x] Add TTL to saved formulas (BUG-F5)
- [x] Replace KEYS * with SCAN in cache.py (BUG-F6)
- [x] Fix profit_only false positive (BUG-H1)
- [x] Fix require_complete_data threshold (BUG-H2)
- [x] Fix silent exception swallowing in peer comparison (BUG-H5)
- [x] Unify data source for company info (BUG-H6) - Changed get_company_info() to use stock_individual_info_em
- [x] Add formula update API endpoint (BUG-H7)
- [x] Fix secondary sorting not being passed (BUG-H8)
- [x] Fix sort key causing missing data to sort to top (BUG-H9)
- [x] Fix frontend type inconsistencies (GAP-F1) - Unified Condition type across api/screen.ts, stores/screeningStore.ts, lib/types.ts
- [x] Show formula name in ConditionTree for formula conditions (GAP-F3) - condition.metric || condition.formula
- [x] Include calculated metrics in CSV export (GAP-F4) - ExportButton now exports available_years and metrics
- [x] Implement squarified TreeMap algorithm (GAP-F5) - Now uses proper squarified treemap with good aspect ratios
- [x] Make time range selector functional (GAP-F6) - Now uses yearsMap[timeRange()] to fetch correct years
- [x] Show formula calculation result in FormulaEditor (GAP-F7) - FormulaEditor now calls evaluateFormula with sample company metrics and displays result
- [x] Add direct page number input to pagination (GAP-F8) - Added page number input field with validation, error display, and Enter key support
- [x] Use Chinese metric names from METRIC_DEFINITIONS (GAP-F9) - metrics.py now uses Chinese names
- [ ] Add missing test coverage
- [x] Document undocumented API endpoints - specs/05_backend.md updated with all endpoints
- [ ] Integrate log_data_acquisition() into akshare calls (NEW-1)
- [ ] Apply track_duration decorator to slow functions (NEW-2)
- [ ] Fix formula_service race condition (NEW-3)
- [x] Remove duplicate CACHE_TTL in company.py and financial.py (NEW-4)

### v0.6.0 - Polish & Documentation (COMPLETED)
- [x] Update specs/03_technical_architecture.md with correct paths
- [x] Add formula engine documentation
- [x] Fix data source documentation mismatch (specs/02_data_source.md)
- [ ] Add integration tests
- [x] Document THS industry classification (specs/09_industry_comparison.md)

(End of file - total 391 lines)
