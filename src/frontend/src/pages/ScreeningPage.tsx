import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { ConditionBuilder, defaultCondition } from '../components/condition';
import { ResultsTable, Pagination, ExportButton } from '../components/results';
import { LoadingSpinner, ErrorState, EmptyState, TimeoutState } from '../components/common';
import { screenCompanies, Condition, CompanyInfo, SortOrder } from '../api/screen';
import { getMetrics, MetricInfo } from '../api/metrics';
import { getCSRCIndustries, getSWIndustries } from '../api/company';
import type { IndustryClassification } from '../lib/types';

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
  const [industry, setIndustry] = createSignal<string>('');
  const [excludeIndustry, setExcludeIndustry] = createSignal<string>('');
  const [industries, setIndustries] = createSignal<IndustryClassification[]>([]);
  const [industryType, setIndustryType] = createSignal<'csrc' | 'sw1' | 'sw3'>('csrc');

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
        industry: industry() || undefined,
        exclude_industry: excludeIndustry() || undefined,
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
    if (conds.length > 0 || ind || exclInd) {
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

  const totalPages = () => Math.ceil(total() / limit());

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.5rem' }}>
      <section style={{ background: 'white', padding: '1.5rem', 'border-radius': '8px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
        <ConditionBuilder
          conditions={conditions()}
          logic={logic()}
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
              value={industry()}
              onChange={(e) => setIndustry(e.currentTarget.value)}
              style={{ padding: '0.25rem 0.5rem', 'border-radius': '4px', border: '1px solid #ccc', 'min-width': '150px' }}
            >
              <option value="">-- Include Industry --</option>
              <For each={industries()}>
                {(ind) => <option value={ind.name}>{ind.name}</option>}
              </For>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <span style={{ 'font-size': '0.875rem' }}>Exclude:</span>
            <select
              value={excludeIndustry()}
              onChange={(e) => setExcludeIndustry(e.currentTarget.value)}
              style={{ padding: '0.25rem 0.5rem', 'border-radius': '4px', border: '1px solid #ccc', 'min-width': '150px' }}
            >
              <option value="">-- Exclude Industry --</option>
              <For each={industries()}>
                {(ind) => <option value={ind.name}>{ind.name}</option>}
              </For>
            </select>
          </div>

          <Show when={industry() || excludeIndustry()}>
            <button
              type="button"
              onClick={() => {
                setIndustry('');
                setExcludeIndustry('');
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
          <ResultsTable
            companies={companies()}
            onSort={handleSort}
            sortColumn={sortColumn() as keyof CompanyInfo | null}
            sortOrder={sortOrder()}
          />
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
      </section>
    </div>
  );
}