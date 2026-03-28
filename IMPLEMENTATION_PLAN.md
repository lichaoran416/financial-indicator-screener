# Implementation Plan

## Summary

This application aims to be a stock analysis tool for A-share market that helps investors screen and rank listed companies using custom financial metrics formulas with multi-timeframe conditions, featuring industry comparison and data visualization capabilities.

**Current State**: The application has a working frontend and backend infrastructure. Sync scripts and DB models are implemented, BUT the backend API endpoints call akshare directly at runtime instead of querying the local PostgreSQL database - this is a critical architectural violation per specs/02_data_source.md.

**Verification Status**: All critical issues below have been verified via code inspection as of 2026-03-29.

---

## Priority 1: Critical Architectural Violations (Must Fix)

### [CRITICAL] Refactor API Endpoints to Query Local PostgreSQL
**Why**: Specs/02_data_source.md explicitly states "API endpoints 不直接调用 akshare，而是查询本地数据库". Current implementation calls akshare directly in runtime, defeating the entire caching architecture and causing 1.5+ hour query times.

**Files to modify**:

1. **`src/backend/app/services/financial.py`** (VERIFIED - calls akshare directly)
   - `get_company_list()` calls `akshare_client.get_stock_list()` (line 83)
   - `get_company_metrics()` calls `akshare_client.get_financial_data()` and `get_financial_indicator()` (lines 107-109, 150)
   - `screen_companies()` iterates over company list and calls akshare per company (lines 344-397)
   - NO database queries to stock_basic, accounting_data, or stock_industry tables exist

2. **`src/backend/app/api/v1/endpoints/company.py`** (VERIFIED - calls akshare directly)
   - `get_company_info()` function (lines 38-66) uses `ak.stock_individual_info_em()` and `ak.stock_financial_analysis_indicator()` directly
   - `get_company()` calls `get_company_info()` (line 79)
   - `compare_with_peers()` calls `akshare_client.get_company_info()` and `get_industry_peers()` (lines 192, 195)
   - `get_trend_comparison()` calls `akshare_client.get_company_info()` (line 280)
   - `get_disclosure_dates()` calls `akshare_client.get_disclosure_date()` (line 322)
   - Industry endpoints call `akshare_client` methods (lines 114, 133, 152, 171)

3. **`src/backend/app/api/v1/endpoints/screen.py`**
   - Current: `get_companies_from_financial_service()` delegates to `financial_service.screen_companies()` which calls akshare
   - Fix: After refactoring financial.py, this will automatically use local DB (verified: screen.py does NOT call akshare directly, only delegates to financial.py)

### [CRITICAL] Fix /metrics Response Schema
**Location**: `src/backend/app/api/v1/endpoints/metrics.py` + `src/backend/app/models/schemas.py`

**Current**: Returns `{"metrics": [{"id": "...", "name": "...", "category": "..."}]}`

**Spec requires** (specs/05_backend.md lines 116-127):
```json
{
  "derived_metrics": [
    {"id": "roe", "name": "净资产收益率", "category": "profitability", "formula": "净利润 / 净资产"}
  ],
  "raw_items": [
    {"name": "营业收入", "report_type": "profit", "category": "revenue"}
  ]
}
```

**Changes needed**:
- Add `RawAccountingItem` schema with `name`, `report_type`, `category`
- Add `MetricsListResponse` with `derived_metrics` and `raw_items` fields
- Modify `get_metrics()` to query `accounting_items` table for raw_items
- Add `formula` field to derived metrics (exists in METRIC_DEFINITIONS but not returned)

### [CRITICAL] Fix /company/disclosure-dates Response Schema
**Location**: `src/backend/app/api/v1/endpoints/company.py:312-329` + `schemas.py:209-225`

**Current**: Returns flat `disclosure_dates` list with single `disclosure_date` field per company

**Spec requires** (specs/05_backend.md lines 93-110): Nested structure with `companies[].disclosure_dates.annual{year{report_date, disclosure_date}}` and `quarterly`

**Changes needed**:
- Add proper nested schemas for `AnnualDisclosure` and `QuarterlyDisclosure`
- Modify `CompanyDisclosureDate` and `DisclosureDateResponse`
- Add quarterly disclosure support (currently only annual)

### [FIXED] Formula Engine Cumulative Calculation Bug
**Location**: `src/backend/app/utils/formula_evaluator.py` - evaluate() BINARY_OP case

**Bug**: Binary operations in `evaluate()` didn't handle list operands properly. When one or both operands were lists, operations like `list / list` would fail.

**Fix applied**: Modified BINARY_OP case to handle:
1. `list + list`, `list - list`, `list * list`, `list / list` - element-wise operations
2. `scalar + list`, `scalar - list`, `scalar * list`, `scalar / list` - scalar broadcast
3. `list + scalar`, `list - scalar`, `list * scalar`, `list / scalar` - scalar broadcast (reversed)
4. `scalar OP scalar` - normal operations

**Impact**: Cumulative ratio calculations like `SUM(资本开支[2014:2023]) / SUM(净利润[2014:2023])` now work correctly.

---

## Priority 2: Frontend Gaps

### [TODO] Missing API Client Functions (VERIFIED MISSING)
**Location**: `src/frontend/src/api/`

| Function | File | Status |
|----------|------|--------|
| `refreshCache()` | `screen.ts` | MISSING - need POST /cache/refresh |
| `getCompanyTrend(codes, metrics, period, years)` | `company.ts` | MISSING - need POST /company/trend |
| `getTHSIndustries()` | `company.ts` | MISSING - need GET /industry/ths |
| `getAccountingItems(report_type?)` | `accounting.ts` | MISSING FILE |
| `updateFormula(id, data)` | `formula.ts` | MISSING - backend has PUT /formula/{id} |

### [TODO] PeerComparison THS Industry Support (VERIFIED MISSING)
**Location**: `src/frontend/src/components/comparison/PeerComparison.tsx`

- Add `'ths'` to `IndustryType` union in `types.ts` (currently only `csrc | sw1 | sw3`)
- Add `ths: 'THS行业'` to `industryTypeLabels` object
- Import and call `getTHSIndustries()` API function

### [TODO] stores/syncStore.ts (VERIFIED MISSING)
**Location**: `src/frontend/src/stores/syncStore.ts`

- Create Zustand store for sync state management
- Currently SyncManagementPage uses local state only

### [TODO] src/lib/ Shared Utilities (VERIFIED EMPTY)
**Location**: `src/lib/` (project root - currently empty)

Frontend has `src/frontend/src/lib/` with some utilities, but project root `src/lib/` per specs/03_technical_architecture.md should contain:
- `src/lib/types.ts` - Cross-app TypeScript types
- `src/lib/formatters.ts` - Shared formatting utilities
- `src/lib/api.ts` - Shared API client configuration

---

## Priority 3: Sync Endpoint Issues

### [ISSUE] /sync/trigger ignores industry_sw_three parameter
**Location**: `src/backend/app/api/v1/endpoints/sync.py:21-41`

**Problem**: `industry_sw_three` parameter is accepted but never passed to `sync_all()`. The `run_sync_task()` function receives it but `sync_accounting_data.sync_all()` doesn't accept industry filter.

### [ISSUE] /sync/status response schema mismatch
**Location**: `src/backend/app/api/v1/endpoints/sync.py` + `schemas.py`

**Current**: Returns `{tasks: [...], industries: [...], total_tasks: N}` (flat list)
**Spec requires**: Returns `{last_sync: {financial: {...}, basic: {...}, industry: {...}}}` (nested by sync_type)

**Changes needed**:
- Restructure response to group by sync_type
- Add `current_code` and `last_updated_by_industry` fields

---

## Priority 4: Database Model Minor Issues

### Minor discrepancies in `src/backend/app/db/models.py`:

| Table | Issue |
|-------|-------|
| `accounting_items` | Uses `String(50)` instead of `String(20)` for code; unique constraint only on `code` instead of `(code, report_type)` |
| `accounting_data` | Uses `Float` instead of `DECIMAL(20,4)` for `item_value`; missing composite unique constraint |
| `sync_status_history` | Uses `Text` instead of `TEXT[]` array for `failed_codes` |

These are low priority but should be fixed for schema compliance.

---

## Priority 5: Testing & Validation

### [TODO] Backend Tests
- Add tests for `POST /sync/trigger` and `GET /sync/status` endpoints
- Add tests for `GET /accounting/items` endpoint
- Update `POST /screen` tests to use mock DB instead of direct akshare calls
- Increase API endpoint test coverage

### [IN PROGRESS] Fix Lint Issues (PARTIALLY FIXED)
```bash
cd src/backend && source .venv/bin/activate && ruff check src/backend/
```
**Issues found**:
- [x] `tests/conftest.py:2` - `MagicMock` unused - FIXED 2026-03-29
- [ ] `tests/integration/test_formula_api.py:3,4` - `MagicMock`, `datetime` unused
- [ ] `tests/unit/test_services/test_financial.py:2` - `AsyncMock` unused (likely needed for fixtures)
- [ ] `tests/unit/test_services/test_formula_service.py:2` - `AsyncMock` unused (likely needed for fixtures)

**Note**: The AsyncMock imports may be needed for fixtures that use AsyncMock. Need to verify if they are truly unused.

### [TODO] Fix Type Issues (VERIFIED)
```bash
cd src/backend && source .venv/bin/activate && mypy src/backend/
```
**Issues found**:
- Missing pandas stubs (`sync_stock_basic.py:150`)
- Missing sqlalchemy stubs
- 3x `Returning Any from function` errors in `checkpoint.py:38,47` and `main.py:45`

---

## Priority 6: Documentation Updates

### [TODO] Update SPEC.md or Create docs/
- Document new `/sync/*` endpoints
- Document the PostgreSQL schema
- Update architecture diagram to show PostgreSQL as primary data source

---

## Already Implemented (Working Correctly)

| Component | Status | Notes |
|-----------|--------|-------|
| Formula lexer/parser/evaluator | ✅ Complete | Basic operators/functions work, cumulative calculation bug FIXED 2026-03-29 |
| Edge case handling (ST, suspended, loss, missing) | ✅ Complete | filters for status, risk flags, profit_only, require_complete_data |
| Formula API endpoints | ✅ Complete | validate, evaluate, save, get, delete |
| Formula PUT endpoint | ✅ Complete | Backend has PUT /formula/{id}, frontend needs API call |
| Frontend condition builder | ✅ Complete | MetricDropdown, OperatorSelector, ValueInput, LogicToggle |
| Frontend visualization | ✅ Complete | TreeMap, TrendComparisonChart, IndustryHeatmap, RadarChart |
| Frontend stores | ✅ Complete | screeningStore, companyStore, savedConditionsStore |
| Redis caching infrastructure | ✅ Complete | RedisManager class with JSON support, atomic operations |
| Request logging middleware | ✅ Complete | JSON logs, request ID, slow request alerts |
| Logging (JTB-101 to JTB-109) | ✅ Complete | Console plain text, file JSON, all features present |
| DB Models (SQLAlchemy) | ✅ Complete | All 6 tables present, minor schema discrepancies |
| DB Connection | ✅ Complete | DatabaseManager with async engine |
| Sync Scripts | ✅ Complete | sync_stock_basic.py, sync_accounting_data.py, sync_industry_class.py |
| Sync API Endpoints | ⚠️ Partial | /sync/trigger and /sync/status exist but response schemas wrong |
| Accounting API Endpoint | ✅ Complete | /accounting/items queries accounting_items table |
| Frontend SyncManagementPage | ✅ Complete | Full UI per specs/04_frontend.md |
| Frontend api/sync.ts | ✅ Complete | triggerSync, getSyncStatus |
| cache/refresh endpoint | ✅ Complete | POST /cache/refresh clears Redis |

---

## Implementation Verification Checklist

### Backend Infrastructure
- [x] PostgreSQL connection and models (db/database.py, db/models.py)
- [x] Sync scripts directory exists (scripts/)
- [x] sync_stock_basic.py implemented
- [x] sync_accounting_data.py implemented
- [x] sync_industry_class.py implemented
- [x] Checkpoint utilities implemented
- [x] Sync API endpoints implemented (/sync/trigger, /sync/status)
- [x] Accounting items endpoint implemented (/accounting/items)

### Backend Refactoring (CRITICAL - NOT DONE)
- [ ] **REFACTOR: /screen endpoint must query local DB instead of calling akshare** (delegates to financial.py which calls akshare)
- [ ] **REFACTOR: /company/{code} must query local DB instead of calling akshare**
- [ ] **REFACTOR: /company/compare must query local DB instead of calling akshare**
- [ ] **REFACTOR: /company/trend must query local DB instead of calling akshare**
- [ ] **REFACTOR: /company/disclosure-dates must query local DB instead of calling akshare**
- [ ] **REFACTOR: Industry endpoints must query local DB instead of calling akshare**
- [ ] **FIX: /metrics response must return derived_metrics + raw_items structure**
- [ ] **FIX: /company/disclosure-dates response must return nested annual/quarterly structure**
- [x] **BUGFIX: Formula cumulative calculations (SUM of time series) - FIXED 2026-03-29**

### Sync Endpoints
- [ ] **FIX: /sync/status response schema must return nested last_sync object**
- [ ] **FIX: /sync/trigger must pass industry_sw_three to sync_all()**

### Frontend
- [x] SyncManagementPage implemented
- [x] api/sync.ts implemented
- [ ] syncStore.ts implemented (MISSING)
- [ ] getCompanyTrend() in company.ts (MISSING)
- [ ] getTHSIndustries() in company.ts (MISSING)
- [ ] refreshCache() in screen.ts (MISSING)
- [ ] updateFormula() in formula.ts (MISSING)
- [ ] getAccountingItems() in accounting.ts (MISSING - NEW FILE)
- [ ] src/lib/ contents created at project root (EMPTY)
- [ ] PeerComparison.tsx THS support (MISSING)

### Schema Updates
- [ ] /metrics response matches spec (derived_metrics + raw_items)
- [ ] /company/disclosure-dates response matches spec (nested structure)
- [ ] Formula Pydantic schemas verified complete

### Database Schema Compliance
- [ ] accounting_items: Fix String(50) → String(20), add composite unique constraint
- [ ] accounting_data: Fix Float → DECIMAL(20,4), add composite unique constraint
- [ ] sync_status_history: Fix Text → TEXT[] for failed_codes

### Testing
- [ ] Sync endpoint tests
- [ ] Accounting items endpoint tests
- [ ] DB-based screen tests
- [ ] Formula cumulative calculation tests
- [ ] Ruff lint issues fixed (5 unused imports)
- [ ] Mypy type errors fixed (pandas stubs, Returning Any)

---

## New Specification Items Needed

### specs/11_formula_engine_bugs.md (NEW)
Document the cumulative calculation bug in the formula engine:
- `SUM(metric[2014:2023])` doesn't reduce to scalar properly
- Division of aggregate results fails
- Nested cumulative expressions fail

(End of file - total 373 lines)
