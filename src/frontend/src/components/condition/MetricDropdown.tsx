import { createResource, For, Show } from 'solid-js';
import { getMetrics, MetricInfo } from '../../api/metrics';

interface MetricDropdownProps {
  value: string;
  onChange: (metric: string) => void;
}

export default function MetricDropdown(props: MetricDropdownProps) {
  const [metrics] = createResource(getMetrics);

  const groupedMetrics = () => {
    const m = metrics();
    if (!m) return {};
    return m.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<string, MetricInfo[]>);
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
      <label style={{ 'font-size': '0.75rem', color: '#666' }}>Metric</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        style={{
          padding: '0.5rem',
          'border-radius': '4px',
          'border': '1px solid #ddd',
          'font-size': '0.875rem',
          'min-width': '160px',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        <option value="">Select metric...</option>
        <Show when={!metrics.loading && !metrics.error}>
          <For each={Object.entries(groupedMetrics())}>
            {([category, items]) => (
              <optgroup label={category}>
                <For each={items}>
                  {(metric) => (
                    <option value={metric.id}>{metric.name}</option>
                  )}
                </For>
              </optgroup>
            )}
          </For>
        </Show>
      </select>
      <Show when={metrics.error}>
        <span style={{ color: '#dc3545', 'font-size': '0.75rem' }}>Failed to load metrics</span>
      </Show>
    </div>
  );
}
