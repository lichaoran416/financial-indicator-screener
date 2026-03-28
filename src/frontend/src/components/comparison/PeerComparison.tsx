import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { getPeerComparison, getCSRCIndustries, getSWIndustries, getTHSIndustries, type PeerComparisonRequest } from '../../api/company';
import type { PeerComparisonResponse, IndustryType, PeerMetric } from '../../lib/types';
import { LoadingSpinner } from '../common';
import { RadarChart } from '../visualization/RadarChart';

interface PeerComparisonProps {
  stockCode: string;
  stockName: string;
  currentIndustry?: string;
}

const industryTypeLabels: Record<IndustryType, string> = {
  csrc: '证监会行业',
  sw1: '申万一级行业',
  sw3: '申万三级行业',
  ths: 'THS行业',
};

const defaultMetrics = ['roe', 'roa', 'gross_margin', 'net_profit_margin', 'debt_ratio'];

export const PeerComparison: Component<PeerComparisonProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [comparisonData, setComparisonData] = createSignal<PeerComparisonResponse | null>(null);
  const [selectedIndustryType, setSelectedIndustryType] = createSignal<IndustryType>('csrc');
  const [selectedMetrics, setSelectedMetrics] = createSignal<string[]>(defaultMetrics);

  const fetchIndustries = async (type: IndustryType) => {
    try {
      if (type === 'csrc') {
        await getCSRCIndustries();
      } else if (type === 'ths') {
        await getTHSIndustries();
      } else {
        await getSWIndustries(type === 'sw1' ? 1 : 3);
      }
    } catch {
      // Silently fail - industries are loaded for future dropdown use
    }
  };

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const request: PeerComparisonRequest = {
        code: props.stockCode,
        industry_type: selectedIndustryType(),
        metrics: selectedMetrics(),
      };
      const data = await getPeerComparison(request);
      setComparisonData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load peer comparison');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchIndustries(selectedIndustryType());
  });

  const handleIndustryTypeChange = (type: IndustryType) => {
    setSelectedIndustryType(type);
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2);
  };

  const getPercentileColor = (percentile: number | null | undefined): string => {
    if (percentile === null || percentile === undefined) return '#666';
    if (percentile >= 75) return '#4caf50';
    if (percentile >= 50) return '#8bc34a';
    if (percentile >= 25) return '#ffc107';
    return '#f44336';
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.5rem' }}>
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
          Peer Comparison
        </h2>

        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <div>
            <label style={{ 'font-size': '0.875rem', color: '#666', 'margin-bottom': '0.5rem', display: 'block' }}>
              Industry Classification
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <For each={Object.entries(industryTypeLabels)}>
                {([type, label]) => (
                  <button
                    onClick={() => handleIndustryTypeChange(type as IndustryType)}
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': '4px',
                      border: selectedIndustryType() === type ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      background: selectedIndustryType() === type ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      'font-size': '0.875rem',
                    }}
                  >
                    {label}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div>
            <label style={{ 'font-size': '0.875rem', color: '#666', 'margin-bottom': '0.5rem', display: 'block' }}>
              Metrics to Compare
            </label>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
              <For each={['roe', 'roa', 'gross_margin', 'net_profit_margin', 'debt_ratio', 'current_ratio', 'quick_ratio']}>
                {(metric) => (
                  <button
                    onClick={() => handleMetricToggle(metric)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      'border-radius': '4px',
                      border: selectedMetrics().includes(metric) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      background: selectedMetrics().includes(metric) ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      'font-size': '0.75rem',
                    }}
                  >
                    {metric}
                  </button>
                )}
              </For>
            </div>
          </div>

          <button
            onClick={fetchComparison}
            disabled={loading()}
            style={{
              padding: '0.75rem 1.5rem',
              'border-radius': '4px',
              border: 'none',
              background: '#1976d2',
              color: 'white',
              'font-size': '0.875rem',
              'font-weight': '500',
              cursor: loading() ? 'not-allowed' : 'pointer',
              opacity: loading() ? 0.7 : 1,
            }}
          >
            {loading() ? 'Loading...' : 'Compare with Peers'}
          </button>
        </div>
      </section>

      <Show when={error()}>
        <div
          style={{
            background: '#ffebee',
            padding: '1rem',
            'border-radius': '4px',
            color: '#c62828',
          }}
        >
          {error()}
        </div>
      </Show>

      <Show when={loading()}>
        <div style={{ display: 'flex', 'justify-content': 'center', padding: '2rem' }}>
          <LoadingSpinner size="large" />
        </div>
      </Show>

      <Show when={!loading() && comparisonData()}>
        <section
          style={{
            background: 'white',
            padding: '1.5rem',
            'border-radius': '8px',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ 'margin-bottom': '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1rem', 'font-weight': '600' }}>
              {comparisonData()!.name} vs {comparisonData()!.industry}
            </h3>
            <p style={{ margin: 0, 'font-size': '0.875rem', color: '#666' }}>
              Based on {comparisonData()!.peers_count} peer companies
            </p>
          </div>

          <Show when={comparisonData()!.metrics.length > 0}>
            <RadarChart
              metrics={comparisonData()!.metrics}
              companyName={comparisonData()!.name}
            />
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
          <h3
            style={{
              margin: '0 0 1rem 0',
              'font-size': '1rem',
              'font-weight': '600',
            }}
          >
            Detailed Metrics Comparison
          </h3>

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
                    Company
                  </th>
                  <th
                    style={{
                      'text-align': 'right',
                      padding: '0.75rem',
                      'border-bottom': '2px solid #e0e0e0',
                      'font-weight': '600',
                    }}
                  >
                    Industry Avg
                  </th>
                  <th
                    style={{
                      'text-align': 'right',
                      padding: '0.75rem',
                      'border-bottom': '2px solid #e0e0e0',
                      'font-weight': '600',
                    }}
                  >
                    Industry Median
                  </th>
                  <th
                    style={{
                      'text-align': 'right',
                      padding: '0.75rem',
                      'border-bottom': '2px solid #e0e0e0',
                      'font-weight': '600',
                    }}
                  >
                    Percentile
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={comparisonData()!.metrics}>
                  {(metric: PeerMetric) => (
                    <tr>
                      <td
                        style={{
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e0e0e0',
                          'font-weight': '500',
                        }}
                      >
                        {metric.metric}
                      </td>
                      <td
                        style={{
                          'text-align': 'right',
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e0e0e0',
                          'font-family': 'monospace',
                        }}
                      >
                        {formatValue(metric.value)}
                      </td>
                      <td
                        style={{
                          'text-align': 'right',
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e0e0e0',
                          'font-family': 'monospace',
                          color: '#666',
                        }}
                      >
                        {formatValue(metric.industry_avg)}
                      </td>
                      <td
                        style={{
                          'text-align': 'right',
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e0e0e0',
                          'font-family': 'monospace',
                          color: '#666',
                        }}
                      >
                        {formatValue(metric.industry_median)}
                      </td>
                      <td
                        style={{
                          'text-align': 'right',
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e0e0e0',
                          'font-family': 'monospace',
                          color: getPercentileColor(metric.percentile),
                          'font-weight': '600',
                        }}
                      >
                        {metric.percentile !== null ? `${metric.percentile.toFixed(1)}%` : 'N/A'}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </section>
      </Show>
    </div>
  );
};

export default PeerComparison;