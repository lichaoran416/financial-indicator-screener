import { Component, createEffect, onCleanup, createSignal, For, Show, createMemo } from 'solid-js';
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
  ChartOptions,
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

type TimeRange = '1Y' | '3Y' | '5Y' | 'ALL';

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

const FINANCIAL_REPORT_ANNOTATIONS: Record<string, { label: string; color: string }> = {
  '04-30': { label: 'Q1', color: 'rgba(76, 175, 80, 0.5)' },
  '08-31': { label: 'Q2', color: 'rgba(255, 152, 0, 0.5)' },
  '10-31': { label: 'Q3', color: 'rgba(255, 193, 7, 0.5)' },
  '03-31': { label: 'Q4', color: 'rgba(244, 67, 54, 0.5)' },
};

export const TrendComparisonChart: Component<TrendComparisonChartProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvasRef: any;
  const [chartInstance, setChartInstance] = createSignal<Chart | null>(null);
  const [trendData, setTrendData] = createSignal<TrendComparisonResponse | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [leftMetric, setLeftMetric] = createSignal<string>('roe');
  const [rightMetric, setRightMetric] = createSignal<string>('roi');
  const [timeRange, setTimeRange] = createSignal<TimeRange>('ALL');

  const availableMetrics = ['roe', 'roi', 'gross_margin', 'net_profit_growth', 'revenue_growth', 'debt_ratio', 'current_ratio'];

  const yearsMap: Record<TimeRange, number> = {
    '1Y': 1,
    '3Y': 3,
    '5Y': 5,
    'ALL': 999,
  };

  const allDates = createMemo(() => {
    const data = trendData();
    if (!data) return [];
    const labels = new Set<string>();
    data.companies.forEach((company) => {
      company.trends.forEach((trend) => {
        if (trend.metric === leftMetric() || trend.metric === rightMetric()) {
          trend.data.forEach((point) => {
            if (point.value !== null) {
              labels.add(point.date);
            }
          });
        }
      });
    });
    return Array.from(labels).sort();
  });

  const filteredDates = createMemo(() => {
    const dates = allDates();
    if (dates.length === 0) return [];

    const maxYears = yearsMap[timeRange()];
    const cutoffYear = new Date().getFullYear() - maxYears;

    if (maxYears >= 999) return dates;

    return dates.filter((date) => {
      const year = parseInt(date.substring(0, 4), 10);
      return year >= cutoffYear;
    });
  });

  const reportDateIndices = createMemo(() => {
    const indices: number[] = [];
    const dates = filteredDates();
    dates.forEach((date, idx) => {
      const monthDay = date.substring(5);
      if (FINANCIAL_REPORT_ANNOTATIONS[monthDay]) {
        indices.push(idx);
      }
    });
    return indices;
  });

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
        years: yearsMap[timeRange()],
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
    const displayDates = filteredDates();

    if (displayDates.length === 0) return;

    const datasets: ChartDataset<'line'>[] = [];

    data.companies.forEach((company, companyIdx) => {
      const colorIdx = companyIdx % TREND_COLORS.length;

      company.trends.forEach((trend) => {
        if (trend.metric === leftMetricData) {
          const values = displayDates.map((label) => {
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
          const values = displayDates.map((label) => {
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

    const chartOptions: ChartOptions<'line'> = {
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
    };

    const chart = new Chart(canvasRef, {
      type: 'line',
      data: {
        labels: displayDates,
        datasets,
      },
      options: chartOptions,
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

  createEffect(() => {
    timeRange();
    leftMetric();
    rightMetric();
    if (trendData()) {
      createChart();
    }
  });

  onCleanup(() => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
  });

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
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <span style={{ 'font-size': '0.875rem', color: '#666' }}>Time Range:</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <For each={['1Y', '3Y', '5Y', 'ALL'] as TimeRange[]}>
              {(range) => (
                <button
                  type="button"
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    'border-radius': '4px',
                    border: timeRange() === range ? '1px solid #1976d2' : '1px solid #ccc',
                    background: timeRange() === range ? '#e3f2fd' : '#fff',
                    color: timeRange() === range ? '#1976d2' : '#666',
                    'font-size': '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {range}
                </button>
              )}
            </For>
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

      <Show when={reportDateIndices().length > 0}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '1rem',
          padding: '0.5rem 1rem',
          background: '#f5f5f5',
          'border-radius': '4px',
          'font-size': '0.75rem',
        }}>
          <span style={{ color: '#666' }}>Financial Report Dates:</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <For each={Object.entries(FINANCIAL_REPORT_ANNOTATIONS)}>
              {([date, info]) => (
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: info.color,
                    'border-radius': '2px',
                  }} />
                  <span style={{ color: '#666' }}>{info.label} ({date})</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

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