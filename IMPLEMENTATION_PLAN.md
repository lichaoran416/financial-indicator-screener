# Implementation Plan

## Summary

A stock analysis tool for A-share market that screens/ranks companies using custom financial metrics with multi-timeframe conditions, industry comparison, and visualization.

**Current State (2026-03-29)**:
- All 147 backend tests pass, all 53 frontend tests pass
- Backend lint and frontend lint/typecheck all pass
- Working tree is clean
- API endpoints (`/screen`, `/company/compare`, industry endpoints) now query local PostgreSQL
- `/company/{code}` fetches PE/PB via akshare by design (real-time market cap not stored in DB)
- **2026-03-29**: Fixed mypy type errors in `formula_evaluator.py` (unary/binary operator type narrowing); installed `pandas-stubs`

---

## Priority Items Still TODO

### [TODO] Database Schema Compliance
Low priority - minor discrepancies in `src/backend/app/db/models.py`:

| Table | Issue |
|-------|-------|
| `accounting_items` | `String(50)` should be `String(20)`; missing composite unique on `(code, report_type)` |
| `accounting_data` | `Float` should be `DECIMAL(20,4)`; missing composite unique constraint |
| `sync_status_history` | `Text` should be `TEXT[]` for `failed_codes` |

### [TODO] Backend Test Coverage
- Add tests for `POST /sync/trigger` and `GET /sync/status` endpoints
- Add tests for `GET /accounting/items` endpoint
- Update `POST /screen` tests to use mock DB instead of direct akshare calls

### [TODO] Backend Lint Issues
```bash
cd src/backend && source .venv/bin/activate && ruff check tests/ app/
```
- All checks pass (unused imports issue was resolved before)

### [TODO] Backend Type Issues
```bash
cd src/backend && source .venv/bin/activate && mypy app/
```
- `pandas-stubs` installed (2026-03-29)
- Remaining mypy errors are in `akshare_client.py` due to missing `akshare` library stubs (library issue, not code)
  - Lines 49, 122, 619: `Returning Any from function` - all `akshare` API calls return untyped results
- `scripts/sync_stock_basic.py:7` - missing akshare stubs (same library issue)

### [TODO] Documentation
- Document new `/sync/*` endpoints
- Document PostgreSQL schema
- Update architecture diagram to show PostgreSQL as primary data source

---

## Already Implemented

| Component | Status |
|-----------|--------|
| Formula engine (lexer/parser/evaluator) | ✅ |
| Formula API endpoints | ✅ |
| Screen/compare endpoints (local DB) | ✅ |
| Industry endpoints (local DB) | ✅ |
| Redis caching infrastructure | ✅ |
| DB models and connection | ✅ |
| Sync scripts (basic, accounting, industry) | ✅ |
| Sync API endpoints | ✅ |
| Accounting API endpoint | ✅ |
| Frontend components and stores | ✅ |
| Request logging middleware | ✅ |

---

## Implementation Verification Checklist

### Backend Infrastructure - ALL COMPLETE
- [x] PostgreSQL connection and models
- [x] Sync scripts (stock_basic, accounting_data, industry_class)
- [x] Sync API endpoints (/sync/trigger, /sync/status)
- [x] Accounting items endpoint (/accounting/items)
- [x] /screen queries local DB
- [x] /company/compare queries local DB
- [x] /company/{code} fetches PE/PB via akshare (by design)
- [x] Industry endpoints query local DB
- [x] /metrics response matches spec
- [x] /company/disclosure-dates response matches spec

### Frontend - ALL COMPLETE
- [x] All UI components implemented
- [x] All API client functions implemented
- [x] All stores implemented
- [x] PeerComparison THS support

### Testing - PARTIAL
- [x] All 147 backend tests pass
- [x] All 53 frontend tests pass
- [x] Ruff lint passes on app/
- [ ] Sync endpoint tests
- [ ] Accounting items endpoint tests

### Schema Compliance - NOT DONE (low priority)
- [ ] accounting_items schema fixes
- [ ] accounting_data schema fixes
- [ ] sync_status_history schema fixes
