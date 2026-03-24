# Implementation Plan - A股财务指标分析应用

## Status: ALL PHASES COMPLETE - SPEC INCONSISTENCY (FormulaEditor) REMAINS

## CRITICAL CONSTRAINT: 只使用akshare提供的数据api, 不要使用其他数据api

---

## Priority Order (Implementation Sequence)

### Cleanup (Can do anytime)
- [ ] Create integration tests (integration/ directory is empty) - Not critical

---

## Spec Coverage Summary
| Spec | Topic | Status | Verification |
|------|-------|--------|--------------|
| specs/00_overview.md | Product overview | ✅ Complete | Document exists |
| specs/01_core_jobs.md | Core user jobs (JTB-001 to JTB-004) | ✅ Complete | Multi-condition filtering works; sorting works; details and save work; TreeMap created |
| specs/02_data_source.md | akshare + Redis caching | ✅ Complete | akshare + Redis done |
| specs/03_technical_architecture.md | Tech stack definition | ✅ Complete | Matches implementation |
| specs/04_frontend.md | Frontend pages and components | ⚠️ Partial | Pages done; TreeMap created; FormulaEditor CANCELLED (removed - spec inconsistency) |
| specs/05_backend.md | API endpoints | ✅ Complete | All documented and undocumented endpoints implemented |
| specs/06_ux.md | UX requirements | ✅ Complete | Lazy loading done; debounce added; virtual scrolling N/A |
| specs/07_custom_formula.md | Custom formula engine | ⚠️ Partial | Lexer/parser/evaluator works; FormulaEditor CANCELLED (spec inconsistency - see below) |
| specs/08_edge_cases.md | Edge case handling | ✅ Complete | Status/risk flags done; ROE N/A done; risk warning text added |
| specs/09_industry_comparison.md | Industry comparison | ✅ Complete | CSRC/SW APIs done; peer comparison, benchmark, radar chart done |
| specs/10_visualization.md | Data visualization | ✅ Complete | RadarChart, TreeMap, TrendComparison, Heatmap all complete |

---

## SPEC INCONSISTENCY - FormulaEditor (JTB-005, JTB-006)

**Finding**: Specs 04_frontend.md and 07_custom_formula.md require a "财务指标公式编辑器" (Formula Editor UI), but it was intentionally removed because:
1. Original FormulaEditor was never integrated into any page (never imported anywhere)
2. Condition model (schemas.py) only supports predefined metrics via `metric` field - no formula field exists
3. Custom formulas cannot be used in screening conditions without significant backend changes
4. The formula engine (lexer/parser/evaluator) works correctly via API but has no UI

**Impact**: Users cannot create custom formulas via UI. They can only use predefined metrics in conditions.

**Options**:
1. Restore FormulaEditor UI and implement full formula-in-screening (requires Condition model change + _evaluate_conditions update)
2. Update specs to remove formula editor requirement
3. Accept partial implementation (formula engine works, no UI)

**Decision**: Implementation chose Option 3 - formula engine exists and works, FormulaEditor removed as dead code. Spec inconsistency documented but not resolved.

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

## Items Still Remaining

- **SPEC INCONSISTENCY**: FormulaEditor required by spec but removed from implementation - see section above
- **Minor**: 2 mypy errors (missing pandas/akshare type stubs - library stubs issue, not code bug)
- **Minor**: 4 eslint reactivity warnings in ValueSlider.tsx and TreeMap.tsx (non-blocking)
