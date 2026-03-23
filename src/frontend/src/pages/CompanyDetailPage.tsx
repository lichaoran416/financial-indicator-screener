import { createSignal, createEffect, Show, onCleanup, For } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { Chart, registerables } from 'chart.js';
import { getCompany, CompanyDetailResponse } from '../api/company';
import { LoadingSpinner, ErrorState } from '../components/common';
import { PeerComparison } from '../components/comparison/PeerComparison';

Chart.register(...registerables);

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DELISTED: 'Delisted',
};

const riskLabels: Record<string, string> = {
  NORMAL: 'Normal',
  ST: 'ST',
  STAR_ST: 'Star ST',
  DELISTING_RISK: 'Delisting Risk',
};

const statusColors: Record<string, string> = {
  ACTIVE: '#4caf50',
  SUSPENDED: '#ff9800',
  DELISTED: '#f44336',
};

const riskColors: Record<string, string> = {
  NORMAL: '#4caf50',
  ST: '#f44336',
  STAR_ST: '#e91e63',
  DELISTING_RISK: '#ff5722',
};

export default function CompanyDetailPage() {
  const params = useParams<{ code: string }>();
  const [company, setCompany] = createSignal<CompanyDetailResponse | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [chartInstance, setChartInstance] = createSignal<Chart | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chartCanvas: any;

  const fetchCompany = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompany(code);
      setCompany(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company details');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    const code = params.code;
    if (code) {
      fetchCompany(code);
    }
  });

  const createChart = (metrics: Record<string, number>) => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
    if (!chartCanvas) return;

    const labels = Object.keys(metrics);
    const values = Object.values(metrics);

    const chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Metric Value',
            data: values,
            backgroundColor: 'rgba(25, 118, 210, 0.6)',
            borderColor: 'rgba(25, 118, 210, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    setChartInstance(chart);
  };

  createEffect(() => {
    const c = company();
    if (c && c.metrics) {
      createChart(c.metrics);
    }
  });

  onCleanup(() => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
  });

  const handleRetry = () => {
    const code = params.code;
    if (code) {
      fetchCompany(code);
    }
  };

  const metricEntries = () => {
    const c = company();
    if (!c || !c.metrics) return [];
    return Object.entries(c.metrics);
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
        <A
          href="/"
          style={{
            'text-decoration': 'none',
            color: '#1976d2',
            'font-size': '0.875rem',
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem',
          }}
        >
          ← Back to Screening
        </A>
      </div>

      <Show when={loading()}>
        <div style={{ display: 'flex', 'justify-content': 'center', padding: '3rem' }}>
          <LoadingSpinner size="large" />
        </div>
      </Show>

      <Show when={error() && !loading()}>
        <ErrorState message={error()!} onRetry={handleRetry} />
      </Show>

      <Show when={!loading() && !error() && company()}>
        <section
          style={{
            background: 'white',
            padding: '1.5rem',
            'border-radius': '8px',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <h1 style={{ margin: 0, 'font-size': '1.5rem', 'font-weight': '600' }}>
                {company()!.name}
              </h1>
              <span
                style={{
                  'background-color': '#e0e0e0',
                  padding: '0.25rem 0.75rem',
                  'border-radius': '4px',
                  'font-size': '0.875rem',
                  'font-weight': '500',
                }}
              >
                {company()!.code}
              </span>
            </div>

            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', 'flex-wrap': 'wrap' }}>
              <Show when={company()!.industry}>
                <span style={{ color: '#666', 'font-size': '0.875rem' }}>
                  Industry: {company()!.industry}
                </span>
              </Show>

              <span
                style={{
                  'background-color': statusColors[company()!.status],
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  'border-radius': '4px',
                  'font-size': '0.75rem',
                  'font-weight': '500',
                }}
              >
                {statusLabels[company()!.status]}
              </span>

              <span
                style={{
                  'background-color': riskColors[company()!.risk_flag],
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  'border-radius': '4px',
                  'font-size': '0.75rem',
                  'font-weight': '500',
                }}
              >
                {riskLabels[company()!.risk_flag]}
              </span>
            </div>
          </div>
        </section>

        <section
          style={{
            background: 'white',
            padding: '1.5rem',
            'border-radius': '8px',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              margin: '0 0 1rem 0',
              'font-size': '1.125rem',
              'font-weight': '600',
            }}
          >
            Financial Metrics
          </h2>

          <Show when={metricEntries().length > 0}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table
                style={{
                  width: '100%',
                  'border-collapse': 'collapse',
                  'font-size': '0.875rem',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        'text-align': 'left',
                        padding: '0.75rem',
                        'border-bottom': '2px solid #e0e0e0',
                        'font-weight': '600',
                      }}
                    >
                      Metric
                    </th>
                    <th
                      style={{
                        'text-align': 'right',
                        padding: '0.75rem',
                        'border-bottom': '2px solid #e0e0e0',
                        'font-weight': '600',
                      }}
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={metricEntries()}>
                    {([key, value]) => (
                      <tr>
                        <td
                          style={{
                            padding: '0.75rem',
                            'border-bottom': '1px solid #e0e0e0',
                          }}
                        >
                          {key}
                        </td>
                        <td
                          style={{
                            'text-align': 'right',
                            padding: '0.75rem',
                            'border-bottom': '1px solid #e0e0e0',
                            'font-family': 'monospace',
                          }}
                        >
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>

          <Show when={metricEntries().length === 0}>
            <div style={{ color: '#666', 'text-align': 'center', padding: '2rem' }}>
              No metrics available
            </div>
          </Show>
        </section>

        <section
          style={{
            background: 'white',
            padding: '1.5rem',
            'border-radius': '8px',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              margin: '0 0 1rem 0',
              'font-size': '1.125rem',
              'font-weight': '600',
            }}
          >
            Metrics Chart
          </h2>

          <Show when={metricEntries().length > 0}>
            <div style={{ height: '300px', position: 'relative' }}>
              <canvas ref={chartCanvas} />
            </div>
          </Show>

          <Show when={metricEntries().length === 0}>
            <div style={{ color: '#666', 'text-align': 'center', padding: '2rem' }}>
              No data to display
            </div>
          </Show>
        </section>

        <PeerComparison
          stockCode={company()!.code}
          stockName={company()!.name}
          currentIndustry={company()!.industry}
        />
      </Show>
    </div>
  );
}
