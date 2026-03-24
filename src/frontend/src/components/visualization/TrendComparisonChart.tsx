import { Component, createEffect, onCleanup, createSignal, For, Show } from 'solid-js';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataset,
} from 'chart.js';
import apiClient from '../../api/client';
import type { CompanyInfo } from '../../api/screen';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricTrendPoint {
  date: string;
  value: number | null;
}

interface MetricTrendData {
  metric: string;
  data: MetricTrendPoint[];
}

interface CompanyTrendData {
  code: string;
  name: string;
  trends: MetricTrendData[];
}

interface TrendComparisonResponse {
  companies: CompanyTrendData[];
  period: string;
  years: number;
}

interface TrendComparisonChartProps {
  selectedCompanies: CompanyInfo[];
  onRemoveCompany: (code: string) => void;
}

const TREND_COLORS = [
  { bg: 'rgba(25, 118, 210, 0.1)', border: 'rgba(25, 118, 210, 1)' },
  { bg: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 1)' },
  { bg: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 1)' },
  { bg: 'rgba(156, 39, 176, 0.1)', border: 'rgba(156, 39, 176, 1)' },
  { bg: 'rgba(244, 67, 54, 0.1)', border: 'rgba(244, 67, 54, 1)' },
  { bg: 'rgba(0, 150, 136, 0.1)', border: 'rgba(0, 150, 136, 1)' },
  { bg: 'rgba(255, 193, 7, 0.1)', border: 'rgba(255, 193, 7, 1)' },
  { bg: 'rgba(233, 30, 99, 0.1)', border: 'rgba(233, 30, 99, 1)' },
  { bg: 'rgba(103, 58, 183, 0.1)', border: 'rgba(103, 58, 183, 1)' },
  { bg: 'rgba(33, 150, 243, 0.1)', border: 'rgba(33, 150, 243, 1)' },
];

export const TrendComparisonChart: Component<TrendComparisonChartProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvasRef: any;
  const [chartInstance, setChartInstance] = createSignal<Chart | null>(null);
  const [trendData, setTrendData] = createSignal<TrendComparisonResponse | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [leftMetric, setLeftMetric] = createSignal<string>('roe');
  const [rightMetric, setRightMetric] = createSignal<string>('roi');

  const fetchTrendData = async () => {
    if (props.selectedCompanies.length === 0) {
      setTrendData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const codes = props.selectedCompanies.map((c) => c.code);
      const response = await apiClient.post<TrendComparisonResponse>('/company/trend', {
        codes,
        metrics: [leftMetric(), rightMetric()],
        period: 'annual',
        years: 5,
      });

      setTrendData(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch trend data');
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  };

  const createChart = () => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
    if (!canvasRef || !trendData()) return;

    const data = trendData()!;
    if (data.companies.length === 0) return;

    const leftMetricData = leftMetric();
    const rightMetricData = rightMetric();

    const allLabels = new Set<string>();
    data.companies.forEach((company) => {
      company.trends.forEach((trend) => {
        if (trend.metric === leftMetricData || trend.metric === rightMetricData) {
          trend.data.forEach((point) => {
            if (point.value !== null) {
              allLabels.add(point.date);
            }
          });
        }
      });
    });

    const sortedLabels = Array.from(allLabels).sort();

    const datasets: ChartDataset<'line'>[] = [];

    data.companies.forEach((company, companyIdx) => {
      const colorIdx = companyIdx % TREND_COLORS.length;

      company.trends.forEach((trend) => {
        if (trend.metric === leftMetricData) {
          const values = sortedLabels.map((label) => {
            const point = trend.data.find((p) => p.date === label);
            return point?.value ?? null;
          });

          datasets.push({
            label: `${company.name} (${leftMetricData})`,
            data: values as number[],
            borderColor: TREND_COLORS[colorIdx].border,
            backgroundColor: TREND_COLORS[colorIdx].bg,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y',
            tension: 0.3,
          });
        } else if (trend.metric === rightMetricData) {
          const values = sortedLabels.map((label) => {
            const point = trend.data.find((p) => p.date === label);
            return point?.value ?? null;
          });

          datasets.push({
            label: `${company.name} (${rightMetricData})`,
            data: values as number[],
            borderColor: TREND_COLORS[colorIdx].border,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'y1',
            tension: 0.3,
          });
        }
      });
    });

    const chart = new Chart(canvasRef, {
      type: 'line',
      data: {
        labels: sortedLabels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Period',
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: leftMetricData.toUpperCase(),
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: rightMetricData.toUpperCase(),
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y?.toFixed(2) ?? 'N/A';
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });

    setChartInstance(chart);
  };

  createEffect(() => {
    const companies = props.selectedCompanies;
    if (companies.length > 0) {
      fetchTrendData();
    }
  });

  createEffect(() => {
    if (trendData()) {
      createChart();
    }
  });

  onCleanup(() => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
  });

  const availableMetrics = ['roe', 'roi', 'gross_margin', 'net_profit_growth', 'revenue_growth', 'debt_ratio', 'current_ratio'];

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'flex-wrap': 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ 'font-size': '0.875rem', color: '#666' }}>Left Y-Axis:</span>
            <select
              value={leftMetric()}
              onChange={(e) => setLeftMetric(e.currentTarget.value)}
              style={{
                padding: '0.25rem 0.5rem',
                'border-radius': '4px',
                border: '1px solid #ccc',
                'font-size': '0.875rem',
              }}
            >
              <For each={availableMetrics}>
                {(metric) => <option value={metric}>{metric.toUpperCase()}</option>}
              </For>
            </select>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ 'font-size': '0.875rem', color: '#666' }}>Right Y-Axis:</span>
            <select
              value={rightMetric()}
              onChange={(e) => setRightMetric(e.currentTarget.value)}
              style={{
                padding: '0.25rem 0.5rem',
                'border-radius': '4px',
                border: '1px solid #ccc',
                'font-size': '0.875rem',
              }}
            >
              <For each={availableMetrics}>
                {(metric) => <option value={metric}>{metric.toUpperCase()}</option>}
              </For>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchTrendData}
          disabled={loading() || props.selectedCompanies.length === 0}
          style={{
            padding: '0.375rem 0.75rem',
            'border-radius': '4px',
            border: '1px solid #1976d2',
            background: loading() ? '#e3f2fd' : '#fff',
            color: '#1976d2',
            'font-size': '0.875rem',
            cursor: loading() || props.selectedCompanies.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {loading() ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
        <For each={props.selectedCompanies}>
          {(company, idx) => (
            <div
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                background: TREND_COLORS[idx() % TREND_COLORS.length].bg,
                border: `1px solid ${TREND_COLORS[idx() % TREND_COLORS.length].border}`,
                'border-radius': '4px',
                'font-size': '0.75rem',
              }}
            >
              <span style={{ color: TREND_COLORS[idx() % TREND_COLORS.length].border, 'font-weight': '500' }}>
                {company.name} ({company.code})
              </span>
              <button
                type="button"
                onClick={() => props.onRemoveCompany(company.code)}
                style={{
                  'margin-left': '0.25rem',
                  padding: '0 0.25rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#666',
                  'font-size': '0.875rem',
                  'line-height': '1',
                }}
              >
                ×
              </button>
            </div>
          )}
        </For>
      </div>

      <Show when={error()}>
        <div style={{ padding: '1rem', background: '#ffebee', 'border-radius': '4px', color: '#c62828', 'font-size': '0.875rem' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error() && props.selectedCompanies.length === 0}>
        <div style={{
          padding: '3rem',
          background: '#f5f5f5',
          'border-radius': '8px',
          'text-align': 'center',
          color: '#666',
        }}>
          Select companies from the screening results to compare trends
        </div>
      </Show>

      <Show when={loading()}>
        <div style={{
          padding: '3rem',
          background: '#f5f5f5',
          'border-radius': '8px',
          'text-align': 'center',
          color: '#666',
        }}>
          Loading trend data...
        </div>
      </Show>

      <Show when={!loading() && !error() && trendData() && trendData()!.companies.length > 0}>
        <div style={{ height: '400px', position: 'relative' }}>
          <canvas ref={canvasRef} />
        </div>
      </Show>
    </div>
  );
};

export default TrendComparisonChart;