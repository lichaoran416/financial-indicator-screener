import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { ConditionBuilder, defaultCondition } from '../components/condition';
import { ResultsTable, Pagination, ExportButton } from '../components/results';
import { LoadingSpinner, ErrorState, EmptyState, TimeoutState } from '../components/common';
import { screenCompanies, Condition, SortOrder } from '../api/screen';
import type { CompanyInfo } from '../api/screen';
import { getMetrics, MetricInfo } from '../api/metrics';
import { getCSRCIndustries, getSWIndustries } from '../api/company';
import TreeMap from '../components/visualization/TreeMap';
import IndustryHeatmap from '../components/visualization/IndustryHeatmap';
import TrendComparisonChart from '../components/visualization/TrendComparisonChart';
import type { IndustryClassification } from '../lib/types';

const riskWarnings: Record<CompanyInfo['risk_flag'], string> = {
  NORMAL: '',
  ST: 'Special Treatment - Company has reported financial irregularities or losses. Exercise caution.',
  STAR_ST: 'Star Special Treatment - Company is in severe financial distress. High risk.',
  DELISTING_RISK: 'At risk of delisting - Company may be removed from the exchange. Extremely high risk.',
};

const SCREEN_CONDITIONS_KEY = 'loaded_screen_conditions';

export default function ScreeningPage() {
  const [conditions, setConditions] = createSignal<Condition[]>([]);
  const [logic, setLogic] = createSignal<'and' | 'or'>('and');
  const [companies, setCompanies] = createSignal<CompanyInfo[]>([]);
  const [total, setTotal] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(50);
  const [sortColumn, setSortColumn] = createSignal<string | null>(null);
  const [sortOrder, setSortOrder] = createSignal<SortOrder>('desc');
  const [metrics, setMetrics] = createSignal<MetricInfo[]>([]);
  const [timeout, setTimeout] = createSignal(false);
  const [includeSuspended, setIncludeSuspended] = createSignal(false);
  const [profitOnly, setProfitOnly] = createSignal(false);
  const [includeSt, setIncludeSt] = createSignal(true);
  const [requireCompleteData, setRequireCompleteData] = createSignal(false);
  const [industry, setIndustry] = createSignal<string[]>([]);
  const [excludeIndustry, setExcludeIndustry] = createSignal<string[]>([]);
  const [industries, setIndustries] = createSignal<IndustryClassification[]>([]);
  const [industryType, setIndustryType] = createSignal<'csrc' | 'sw1' | 'sw3'>('csrc');
  const [viewMode, setViewMode] = createSignal<'treemap' | 'table' | 'heatmap'>('treemap');
  const [selectedCompany, setSelectedCompany] = createSignal<CompanyInfo | null>(null);
  const [selectedForComparison, setSelectedForComparison] = createSignal<CompanyInfo[]>([]);
  const [showTrendChart, setShowTrendChart] = createSignal(false);

  const loadMetrics = async () => {
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load metrics:', e);
    }
  };

  const loadIndustries = async () => {
    try {
      let data: IndustryClassification[] = [];
      if (industryType() === 'csrc') {
        data = await getCSRCIndustries();
      } else if (industryType() === 'sw1') {
        data = await getSWIndustries(1);
      } else {
        data = await getSWIndustries(3);
      }
      setIndustries(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load industries:', e);
    }
  };

  const loadSavedConditions = () => {
    try {
      const saved = window.localStorage.getItem(SCREEN_CONDITIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Condition[];
        setConditions(parsed);
        window.localStorage.removeItem(SCREEN_CONDITIONS_KEY);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load saved conditions:', e);
    }
  };

  onMount(() => {
    loadMetrics();
    loadIndustries();
    loadSavedConditions();
  });

  const handleScreen = async () => {
    setLoading(true);
    setError(null);
    setTimeout(false);

    try {
      const request = {
        conditions: conditions(),
        sort_by: sortColumn() || undefined,
        order: sortOrder(),
        limit: limit(),
        page: page(),
        industries: industry().length > 0 ? industry() : undefined,
        exclude_industries: excludeIndustry().length > 0 ? excludeIndustry() : undefined,
        include_suspended: includeSuspended(),
        profit_only: profitOnly(),
        include_st: includeSt(),
        require_complete_data: requireCompleteData(),
      };

      const response = await screenCompanies(request);
      setCompanies(response.companies);
      setTotal(response.total);
    } catch (e) {
      if (e instanceof Error && e.message.includes('timeout')) {
        setTimeout(true);
      } else {
        setError(e instanceof Error ? e.message : 'An error occurred');
      }
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    const conds = conditions();
    const ind = industry();
    const exclInd = excludeIndustry();
    if (conds.length > 0 || ind.length > 0 || exclInd.length > 0) {
      handleScreen();
    }
  });

  const handleAddCondition = () => {
    const newCondition = defaultCondition();
    newCondition.metric = metrics()[0]?.id || 'roe';
    setConditions((prev) => [...prev, newCondition]);
  };

  const handleUpdateCondition = (index: number, condition: Condition) => {
    setConditions((prev) => {
      const updated = [...prev];
      updated[index] = condition;
      return updated;
    });
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLogicChange = (newLogic: 'and' | 'or') => {
    setLogic(newLogic);
  };

  const handleSort = (column: string) => {
    if (sortColumn() === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
    handleScreen();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    handleScreen();
  };

  const handleSimplify = () => {
    setConditions([]);
    setPage(1);
  };

  const handleCompanySelect = (company: CompanyInfo) => {
    setSelectedCompany(company);
  };

  const handleCloseDetail = () => {
    setSelectedCompany(null);
  };

  const handleAddToComparison = (company: CompanyInfo) => {
    const current = selectedForComparison();
    if (current.length >= 10) {
      window.alert('Maximum 10 companies can be compared');
      return;
    }
    if (!current.find(c => c.code === company.code)) {
      setSelectedForComparison([...current, company]);
    }
  };

  const handleRemoveFromComparison = (code: string) => {
    setSelectedForComparison(current => current.filter(c => c.code !== code));
  };

  const handleClearComparison = () => {
    setSelectedForComparison([]);
    setShowTrendChart(false);
  };

  const totalPages = () => Math.ceil(total() / limit());

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.5rem' }}>
      <section style={{ background: 'white', padding: '1.5rem', 'border-radius': '8px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
        <ConditionBuilder
          conditions={conditions()}
          logic={logic()}
          companies={companies()}
          onAdd={handleAddCondition}
          onUpdate={handleUpdateCondition}
          onRemove={handleRemoveCondition}
          onLogicChange={handleLogicChange}
        />
      </section>

      <section style={{ background: 'white', padding: '1rem', 'border-radius': '8px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', 'flex-wrap': 'wrap', 'align-items': 'center' }}>
          <label style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeSuspended()}
              onChange={(e) => setIncludeSuspended(e.currentTarget.checked)}
            />
            <span>Include suspended/delisted</span>
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profitOnly()}
              onChange={(e) => setProfitOnly(e.currentTarget.checked)}
            />
            <span>Profit-making only</span>
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeSt()}
              onChange={(e) => setIncludeSt(e.currentTarget.checked)}
            />
            <span>Include ST/*ST stocks</span>
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requireCompleteData()}
              onChange={(e) => setRequireCompleteData(e.currentTarget.checked)}
            />
            <span>Require complete data</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', 'flex-wrap': 'wrap', 'align-items': 'center', 'margin-top': '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <span style={{ 'font-size': '0.875rem' }}>Industry:</span>
            <select
              value={industryType()}
              onChange={(e) => {
                setIndustryType(e.currentTarget.value as 'csrc' | 'sw1' | 'sw3');
                loadIndustries();
              }}
              style={{ padding: '0.25rem 0.5rem', 'border-radius': '4px', border: '1px solid #ccc' }}
            >
              <option value="csrc">证监会</option>
              <option value="sw1">申万一级</option>
              <option value="sw3">申万三级</option>
            </select>
            <select
              multiple
              size={4}
              onChange={(e) => {
                const selected = Array.from(e.currentTarget.selectedOptions).map(opt => opt.value);
                setIndustry(selected);
              }}
              style={{ padding: '0.25rem 0.5rem', 'border-radius': '4px', border: '1px solid #ccc', 'min-width': '200px', 'max-height': '150px' }}
            >
              <For each={industries()}>
                {(ind) => <option value={ind.name}>{ind.name}</option>}
              </For>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <span style={{ 'font-size': '0.875rem' }}>Exclude:</span>
            <select
              multiple
              size={4}
              onChange={(e) => {
                const selected = Array.from(e.currentTarget.selectedOptions).map(opt => opt.value);
                setExcludeIndustry(selected);
              }}
              style={{ padding: '0.25rem 0.5rem', 'border-radius': '4px', border: '1px solid #ccc', 'min-width': '200px', 'max-height': '150px' }}
            >
              <For each={industries()}>
                {(ind) => <option value={ind.name}>{ind.name}</option>}
              </For>
            </select>
          </div>

          <Show when={industry().length > 0 || excludeIndustry().length > 0}>
            <button
              type="button"
              onClick={() => {
                setIndustry([]);
                setExcludeIndustry([]);
                handleScreen();
              }}
              style={{
                padding: '0.25rem 0.5rem',
                'border-radius': '4px',
                border: '1px solid #ccc',
                background: '#f5f5f5',
                'font-size': '0.75rem',
                cursor: 'pointer',
              }}
            >
              Clear Industry Filter
            </button>
          </Show>

          <button
            type="button"
            onClick={() => {
              loadIndustries();
            }}
            style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '4px',
              border: '1px solid #ccc',
              background: '#f5f5f5',
              'font-size': '0.75rem',
              cursor: 'pointer',
            }}
          >
            Refresh Industries
          </button>
        </div>
      </section>

      <section style={{ background: 'white', padding: '1.5rem', 'border-radius': '8px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h2 style={{ margin: 0, 'font-size': '1.125rem', 'font-weight': '600' }}>
            Results {total() > 0 && <span style={{ 'font-weight': 'normal', color: '#666' }}>({total()} companies)</span>}
          </h2>
          <Show when={companies().length > 0}>
            <ExportButton companies={companies()} />
          </Show>
        </div>

        <Show when={loading()}>
          <div style={{ display: 'flex', 'justify-content': 'center', padding: '3rem' }}>
            <LoadingSpinner size="large" />
          </div>
        </Show>

        <Show when={error() && !timeout()}>
          <ErrorState message={error()!} onRetry={handleScreen} />
        </Show>

        <Show when={timeout()}>
          <TimeoutState onSimplify={handleSimplify} />
        </Show>

        <Show when={!loading() && !error() && !timeout() && companies().length === 0 && conditions().length === 0}>
          <EmptyState message="Add conditions above and click Search to find companies" />
        </Show>

        <Show when={!loading() && !error() && !timeout() && companies().length === 0 && conditions().length > 0}>
          <EmptyState message="No companies match your conditions" />
        </Show>

        <Show when={!loading() && !error() && companies().length > 0}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
              <button
                type="button"
                onClick={() => setViewMode('treemap')}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '4px',
                  border: '1px solid',
                  'border-color': viewMode() === 'treemap' ? '#1976d2' : '#ccc',
                  background: viewMode() === 'treemap' ? '#e3f2fd' : 'white',
                  color: viewMode() === 'treemap' ? '#1976d2' : '#666',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                  'font-weight': viewMode() === 'treemap' ? '600' : '400',
                }}
              >
                TreeMap
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '4px',
                  border: '1px solid',
                  'border-color': viewMode() === 'table' ? '#1976d2' : '#ccc',
                  background: viewMode() === 'table' ? '#e3f2fd' : 'white',
                  color: viewMode() === 'table' ? '#1976d2' : '#666',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                  'font-weight': viewMode() === 'table' ? '600' : '400',
                }}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('heatmap')}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '4px',
                  border: '1px solid',
                  'border-color': viewMode() === 'heatmap' ? '#1976d2' : '#ccc',
                  background: viewMode() === 'heatmap' ? '#e3f2fd' : 'white',
                  color: viewMode() === 'heatmap' ? '#1976d2' : '#666',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                  'font-weight': viewMode() === 'heatmap' ? '600' : '400',
                }}
              >
                Heatmap
              </button>
            </div>
          </div>

          <Show when={viewMode() === 'treemap'}>
            <TreeMap
              companies={companies()}
              onSelectCompany={handleCompanySelect}
            />
          </Show>

          <Show when={viewMode() === 'table'}>
            <ResultsTable
              companies={companies()}
              onSort={handleSort}
              sortColumn={sortColumn() as keyof CompanyInfo | null}
              sortOrder={sortOrder()}
            />
          </Show>

          <Show when={viewMode() === 'heatmap'}>
            <IndustryHeatmap companies={companies()} />
          </Show>
        </Show>

        <Show when={!loading() && !error() && companies().length > 0 && totalPages() > 1}>
          <div style={{ 'margin-top': '1rem' }}>
            <Pagination
              currentPage={page()}
              totalPages={totalPages()}
              onPageChange={handlePageChange}
            />
          </div>
        </Show>

        <Show when={selectedCompany()}>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              'z-index': 1000,
            }}
            onClick={handleCloseDetail}
          >
            <div
              style={{
                background: 'white',
                padding: '1.5rem',
                'border-radius': '8px',
                'max-width': '600px',
                width: '90%',
                'max-height': '80vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, 'font-size': '1.25rem' }}>{selectedCompany()!.name}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#666', 'font-size': '0.875rem' }}>
                    {selectedCompany()!.code} | {selectedCompany()!.industry || 'N/A'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  style={{
                    padding: '0.25rem 0.5rem',
                    'border-radius': '4px',
                    border: '1px solid #ccc',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ 'font-size': '0.875rem', color: '#333' }}>
                <p><strong>Status:</strong> {selectedCompany()!.status}</p>
                <p><strong>Risk Flag:</strong> {selectedCompany()!.risk_flag}</p>
                <Show when={riskWarnings[selectedCompany()!.risk_flag]}>
                  <p style={{ color: '#dc2626', 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                    {riskWarnings[selectedCompany()!.risk_flag]}
                  </p>
                </Show>
                <Show when={selectedCompany()!.metrics && Object.keys(selectedCompany()!.metrics!).length > 0}>
                  <div style={{ 'margin-top': '1rem' }}>
                    <strong>Metrics:</strong>
                    <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.5rem', 'margin-top': '0.5rem' }}>
                      <For each={Object.entries(selectedCompany()!.metrics || {})}>
                        {([key, value]) => (
                          <div style={{ padding: '0.25rem', background: '#f5f5f5', 'border-radius': '4px' }}>
                            <span style={{ color: '#666' }}>{key.toUpperCase()}:</span>
                            <span style={{ 'margin-left': '0.5rem', 'font-weight': '500' }}>
                              {typeof value === 'number' ? value.toFixed(4) : value}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
                <div style={{ 'margin-top': '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToComparison(selectedCompany()!);
                      handleCloseDetail();
                    }}
                    disabled={selectedForComparison().length >= 10 || !!selectedForComparison().find(c => c.code === selectedCompany()!.code)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      'border-radius': '4px',
                      border: '1px solid #1976d2',
                      background: selectedForComparison().find(c => c.code === selectedCompany()!.code) ? '#e3f2fd' : '#fff',
                      color: '#1976d2',
                      'font-size': '0.875rem',
                      cursor: selectedForComparison().length >= 10 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {selectedForComparison().find(c => c.code === selectedCompany()!.code) ? 'Added to Compare' : 'Add to Compare'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <Show when={selectedForComparison().length > 0}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-top': '1rem', 'padding': '1rem', background: '#e3f2fd', 'border-radius': '8px' }}>
            <div>
              <span style={{ 'font-weight': '600' }}>Comparison: </span>
              <span style={{ color: '#666' }}>{selectedForComparison().length}/10 companies selected</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowTrendChart(!showTrendChart())}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '4px',
                  border: '1px solid #1976d2',
                  background: showTrendChart() ? '#1976d2' : '#fff',
                  color: showTrendChart() ? '#fff' : '#1976d2',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {showTrendChart() ? 'Hide Trend Chart' : 'Show Trend Chart'}
              </button>
              <button
                type="button"
                onClick={handleClearComparison}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '4px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#666',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </Show>

        <Show when={showTrendChart() && selectedForComparison().length > 0}>
          <section style={{ background: 'white', padding: '1.5rem', 'border-radius': '8px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.125rem', 'font-weight': '600' }}>
              Trend Comparison
            </h3>
            <TrendComparisonChart
              selectedCompanies={selectedForComparison()}
              onRemoveCompany={handleRemoveFromComparison}
            />
          </section>
        </Show>
      </section>
    </div>
  );
}