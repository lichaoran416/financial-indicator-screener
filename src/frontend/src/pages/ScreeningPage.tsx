import { createSignal, createEffect, onMount, Show } from 'solid-js';
import { ConditionBuilder, defaultCondition } from '../components/condition';
import { ResultsTable, Pagination, ExportButton } from '../components/results';
import { LoadingSpinner, ErrorState, EmptyState, TimeoutState } from '../components/common';
import { screenCompanies, Condition, CompanyInfo, SortOrder } from '../api/screen';
import { getMetrics, MetricInfo } from '../api/metrics';

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

  const loadMetrics = async () => {
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load metrics:', e);
    }
  };

  onMount(() => {
    loadMetrics();
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
    if (conditions().length > 0) {
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