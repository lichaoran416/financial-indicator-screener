# Implementation Plan - A股财务指标分析应用

## Status: PHASE 1-9 COMPLETE, PHASE 10-14 PENDING

## Completed Implementation (Verified via Code Analysis)
| Component | Status | Notes |
|-----------|--------|-------|
| Backend Core (main.py, config.py, redis.py) | ✅ Complete | |
| Backend Pydantic Models | ✅ Complete | |
| Backend API Endpoints (screen, company, metrics, cache) | ✅ Complete | |
| Backend Financial Service | ✅ Complete | Uses listing_status for ACTIVE/SUSPENDED/DELISTED; ST/*ST detection from stock name |
| Backend Akshare Client | ✅ Complete | get_stock_list() extracts listing_status from stock_zh_a_spot_em |
| Frontend App.tsx with Routing | ✅ Complete | Lazy loading implemented |
| Frontend API Client | ✅ Complete | |
| Frontend Stores | ✅ Complete | |
| Frontend Condition Components | ✅ Complete | |
| Frontend Results Components | ✅ Complete | |
| Frontend Common Components | ✅ Complete | |
| Frontend ScreeningPage | ✅ Complete | Edge case filters exposed in UI |
| Frontend CompanyDetailPage | ✅ Complete | Basic bar chart only |
| Frontend HistoryPage | ✅ Complete | |
| Frontend Lib (types, formatters) | ✅ Complete | |
| Custom Formula Engine (lexer, parser, evaluator) | ✅ Complete | Phase 9 - JTB-005, JTB-006 |
| Formula API Endpoints | ✅ Complete | validate, evaluate, save, delete |
| FormulaEditor UI Component | ✅ Complete | With syntax highlighting and saved formulas |

---

## NOT YET IMPLEMENTED (Confirmed Missing via Code Search)

### Critical - Custom Formula Engine (JTB-005, JTB-006) - SPEC: specs/08_custom_formula.md
| Component | Status | Notes |
|-----------|--------|-------|
| Formula Lexer | ✅ Complete | Tokenizes formula strings |
| Formula Parser | ✅ Complete | Parses tokens into AST |
| Formula Evaluator | ✅ Complete | Evaluates AST against financial data |
| Formula Service | ✅ Complete | Business logic for formula operations |
| Formula API Endpoints | ✅ Complete | validate, evaluate, save, delete |
| FormulaEditor UI Component | ✅ Complete | With syntax validation and saved formulas |
| Custom Formula Storage | ✅ Complete | Redis-backed storage |

**Requirements per spec:**
- Operators: +, -, *, /, ()
- Functions: AVG(), SUM(), MIN(), MAX(), STD()
- Metric references: `净利润 / 总资产`
- Time series: `ROE[2023]`, `AVG(ROE[2020:2024])`
- Syntax validation & error messages
- Formula naming & saving

### High Priority - Data Accuracy Issues
| Component | Status | Spec Reference | Issue |
|-----------|--------|---------------|-------|
| TTM Rolling 12-month | ❌ Missing | specs/02_financial_metrics.md | Uses latest value, not rolling 12-month aggregation |
| Data Disclosure Timing | ❌ Missing | specs/03_data_source.md | No quarterly/annual cycle alignment (Q1: Apr, Q2: Aug, Q3: Oct, Q4: Mar-Apr) |

### Medium Priority - Industry Comparison (JTB-011, JTB-012, JTB-013) - SPEC: specs/10_industry_comparison.md
| Component | Status | Notes |
|-----------|--------|-------|
| CSRC Classification API | ❌ Missing | No证监会 industry classification |
| SW (申万) Classification API | ❌ Missing | No 申万 3-level classification (28/104/227) |
| Peer Comparison API | ❌ Missing | No `/company/{code}/comparison` endpoint |
| Radar Chart Component | ❌ Missing | No radar/spider chart |
| Industry Benchmark Calculation | ❌ Missing | No industry avg/median |
| Percentile Ranking | ❌ Missing | No company percentile in industry |
| Multi-industry Selection UI | ❌ Missing | No multi-select for industry filter |
| Exclude Industry Option | ❌ Missing | No exclude industry feature |
| Industry Filter in Frontend | ⚠️ Partial | Backend supports `industry` param but UI doesn't expose it |

### Medium Priority - Visualization (JTB-014, JTB-015, JTB-016) - SPEC: specs/11_visualization.md
| Component | Status | Notes |
|-----------|--------|-------|
| TreeMap Component | ❌ Missing | For screening result distribution |
| TrendComparisonChart | ❌ Missing | Up to 10 companies, dual Y-axis, time zoom |
| ConditionTree (visualization) | ❌ Missing | Graphical condition structure diagram |
| ValueSlider | ❌ Missing | Range slider with histogram |
| IndustryHeatmap | ❌ Missing | Industry distribution heatmap |
| Time-Series Line Chart | ❌ Missing | Historical metric trends |
| Multi-Company Comparison | ❌ Missing | Cannot compare >1 company |

### Lower Priority - UX Enhancements - SPEC: specs/07_ux.md
| Component | Status | Notes |
|-----------|--------|-------|
| Virtual Scrolling | ❌ Missing | For large result sets |
| Debounced Inputs (300ms) | ❌ Missing | Condition input debounce |
| Memoization (createMemo) | ❌ Missing | Performance optimization |

---

## PARTIALLY IMPLEMENTED (Needs Enhancement)
| Component | Status | Gap | Spec Reference |
|-----------|--------|-----|----------------|
| Multi-field Sorting | ⚠️ Partial | Only single sort; spec requires primary + secondary | specs/01_core_jobs.md (JTB-002) |
| TTM Calculation | ⚠️ Partial | Uses latest value, not rolling 12-month | specs/02_financial_metrics.md |
| Risk Warning Messages | ⚠️ Partial | Flags displayed but no warning text | specs/09_edge_cases.md (JTB-009) |
| Negative Profit ROE | ⚠️ Partial | Shows negative values, should show N/A | specs/09_edge_cases.md (JTB-008) |
| Missing Year Marking | ⚠️ Partial | N/A displayed but years not marked | specs/09_edge_cases.md (JTB-010) |
| Quarterly Period | ⚠️ Partial | Backend supports param but doesn't fetch quarterly data | specs/02_financial_metrics.md |
| Industry Filter UI | ⚠️ Partial | Backend has logic but frontend doesn't expose | specs/10_industry_comparison.md |

---

## Spec Coverage Summary
| Spec | Topic | Status | Verification |
|------|-------|--------|--------------|
| specs/00_overview.md | Product overview | ✅ Complete | Document exists |
| specs/01_core_jobs.md | Core user jobs (JTB-001 to JTB-004) | ✅ Complete | Multi-condition filtering, sorting, details, save all work |
| specs/02_financial_metrics.md | Financial metrics formulas | ✅ Complete | 9 metrics implemented |
| specs/03_data_source.md | akshare + Redis caching | ⚠️ Partial | akshare + Redis done; data disclosure timing NOT implemented |
| specs/04_technical_architecture.md | Tech stack definition | ✅ Complete | Matches implementation |
| specs/05_frontend.md | Frontend pages and components | ⚠️ Partial | All pages done; charts/components missing |
| specs/06_backend.md | API endpoints | ✅ Complete | All endpoints implemented |
| specs/07_ux.md | UX requirements | ⚠️ Partial | Lazy loading done; virtual scrolling/debounce missing |
| specs/08_custom_formula.md | Custom formula engine | ✅ Complete | Formula lexer, parser, evaluator, service, API, and UI |
| specs/09_edge_cases.md | Edge case handling | ⚠️ Partial | Status/risk flags done; N/A marking incomplete |
| specs/10_industry_comparison.md | Industry comparison | ❌ NOT STARTED | No industry comparison code exists |
| specs/11_visualization.md | Data visualization | ❌ NOT STARTED | No visualization components exist |

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

### Phase 10: Data Accuracy Fixes
- [ ] Implement TTM rolling 12-month aggregation from quarterly data
- [ ] Implement data disclosure timing alignment (Q1: Apr, Q2: Aug, Q3: Oct, Q4: Mar-Apr)
- [x] Fetch actual company status (ACTIVE/SUSPENDED/DELISTED) from akshare
- [x] Fetch actual ST/*ST risk flags from akshare

### Phase 11: Industry Comparison (JTB-011, JTB-012, JTB-013)
- [ ] Add CSRC industry classification API (stock_info_csrc_main)
- [ ] Add SW (申万) classification API (3 levels)
- [ ] Add peer comparison API endpoint (`/company/{code}/comparison`)
- [ ] Create industry benchmark calculation (avg, median, percentile)
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

### Phase 13: Multi-field Sorting
- [ ] Add secondary sort field support (primary + secondary sort)

### Phase 14: Edge Case Enhancements
- [ ] Show N/A for ROE when profit is negative (instead of negative value)
- [ ] Add risk warning text messages (not just badges)
- [ ] Mark missing years explicitly in results table

### Phase 15: UX & Performance
- [ ] Implement virtual scrolling for large result sets
- [ ] Add 300ms debounce to condition inputs
- [ ] Add createMemo for expensive computations

---

## New Specification Documents Needed

The following missing features need specification documents authored:

1. **`specs/08_custom_formula.md`** - Already exists but needs enhancement with:
   - Detailed lexer/parser specification
   - AST node types
   - Error message formats

2. **`specs/10_industry_comparison.md`** - Already exists but needs enhancement with:
   - API response schemas
   - akshare functions to use for classifications
   - Peer comparison algorithm

3. **`specs/11_visualization.md`** - Already exists but needs component specs:
   - TreeMap data format
   - TrendChart API
   - ConditionTree node structure

---

## Reference: Directory Structure Per Specs

```
stock-analysis-1/
├── src/
│   ├── frontend/
│   │   ├── components/
│   ├── pages/
│   ├── stores/
│   ├── api/
│   └── lib/
│   └── backend/
│       ├── app/
│       │   ├── api/v1/endpoints/
│       │   ├── core/
│       │   ├── models/
│       │   ├── services/
│       │   └── utils/
│       ├── tests/
│       ├── main.py
│       └── requirements.txt
├── tests/
├── specs/
├── package.json
└── requirements.txt
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
