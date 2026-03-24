import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import type { CompanyInfo } from '../../api/screen';

interface TreeMapProps {
  companies: CompanyInfo[];
  onSelectCompany: (company: CompanyInfo) => void;
  metricKey?: string;
}

interface TreemapRect {
  company: CompanyInfo;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  incomplete: boolean;
}

const getMetricValue = (company: CompanyInfo, metricKey: string): number => {
  return company.metrics?.[metricKey] ?? 0;
};

const getColor = (value: number, min: number, max: number): string => {
  if (max === min) return 'hsl(200, 70%, 60%)';
  const normalized = (value - min) / (max - min);
  const hue = 200 + normalized * 40;
  const saturation = 60 + normalized * 20;
  const lightness = 45 + normalized * 15;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const formatMetric = (value: number): string => {
  if (Math.abs(value) >= 10000) {
    return (value / 10000).toFixed(2) + '万';
  }
  if (Math.abs(value) >= 100) {
    return value.toFixed(2);
  }
  return value.toFixed(4);
};

const TreeMap: Component<TreeMapProps> = (props) => {
  const [selectedMetric, setSelectedMetric] = createSignal<string>(props.metricKey || 'roe');
  const [containerSize, setContainerSize] = createSignal({ width: 800, height: 400 });

  const allMetrics = createMemo(() => {
    const metricSet = new Set<string>();
    props.companies.forEach((company) => {
      if (company.metrics) {
        Object.keys(company.metrics).forEach((key) => metricSet.add(key));
      }
    });
    return Array.from(metricSet).sort();
  });

  const sortedCompanies = createMemo(() => {
    const metric = selectedMetric();
    return [...props.companies]
      .filter((c) => getMetricValue(c, metric) > 0)
      .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));
  });

  const metricValues = createMemo(() => {
    const metric = selectedMetric();
    return sortedCompanies().map((c) => getMetricValue(c, metric));
  });

  const minValue = createMemo(() => Math.min(...metricValues(), 0));
  const maxValue = createMemo(() => Math.max(...metricValues(), 1));

  const treemapRects = createMemo((): TreemapRect[] => {
    const companies = sortedCompanies();
    if (companies.length === 0) return [];

    const values = companies.map((c) => getMetricValue(c, selectedMetric()));
    const totalValue = values.reduce((sum, v) => sum + v, 0);
    if (totalValue === 0) return [];

    const { width, height } = containerSize();
    const rects: TreemapRect[] = [];

    let currentX = 0;
    let currentY = 0;
    let remainingWidth = width;
    let remainingHeight = height;
    let isHorizontal = width >= height;

    companies.forEach((company, index) => {
      const value = values[index];
      const ratio = value / totalValue;
      const incomplete = (company.available_years ?? 0) < 5;

      let rectWidth: number;
      let rectHeight: number;

      if (isHorizontal) {
        rectWidth = remainingWidth * ratio;
        rectHeight = height;
        rects.push({
          company,
          value,
          x: currentX,
          y: currentY,
          width: rectWidth - 2,
          height: rectHeight - 2,
          color: getColor(value, minValue(), maxValue()),
          incomplete,
        });
        currentX += rectWidth;
        remainingWidth -= rectWidth;
      } else {
        rectWidth = width;
        rectHeight = remainingHeight * ratio;
        rects.push({
          company,
          value,
          x: currentX,
          y: currentY,
          width: rectWidth - 2,
          height: rectHeight - 2,
          color: getColor(value, minValue(), maxValue()),
          incomplete,
        });
        currentY += rectHeight;
        remainingHeight -= rectHeight;
      }

      if (index % 3 === 2) {
        isHorizontal = !isHorizontal;
        if (isHorizontal) {
          currentX = 0;
          currentY = 0;
          remainingWidth = width;
        } else {
          currentX = 0;
          currentY = 0;
          remainingHeight = height;
        }
      }
    });

    return rects;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let containerRef: any;

  const updateSize = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: Math.max(rect.height, 300) });
    }
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <span style={{ 'font-size': '0.875rem', color: '#666' }}>Metric:</span>
          <select
            value={selectedMetric()}
            onChange={(e) => setSelectedMetric(e.currentTarget.value)}
            style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '4px',
              border: '1px solid #ccc',
              'font-size': '0.875rem',
            }}
          >
            <For each={allMetrics()}>
              {(metric) => <option value={metric}>{metric.toUpperCase()}</option>}
            </For>
          </select>
        </div>
        <div style={{ 'font-size': '0.75rem', color: '#666' }}>
          {props.companies.length} companies | Range: {formatMetric(minValue())} - {formatMetric(maxValue())}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          background: '#f5f5f5',
          'border-radius': '8px',
          overflow: 'hidden',
        }}
        onResize={updateSize}
      >
        <Show when={treemapRects().length > 0} fallback={
          <div style={{
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100%',
            color: '#666'
          }}>
            No valid data for selected metric
          </div>
        }>
          <For each={treemapRects()}>
            {(rect) => (
              <div
                style={{
                  position: 'absolute',
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  background: rect.color,
                  border: rect.incomplete ? '2px dashed rgba(255,100,100,0.8)' : '1px solid rgba(255,255,255,0.3)',
                  'border-radius': '4px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  'flex-direction': 'column',
                  'justify-content': 'center',
                  'align-items': 'center',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  'box-sizing': 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.zIndex = '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.zIndex = '1';
                }}
                onClick={() => props.onSelectCompany(rect.company)}
                title={`${rect.company.name} (${rect.company.code}): ${formatMetric(rect.value)}${rect.incomplete ? ' [Incomplete Data]' : ''}`}
              >
                <div style={{
                  'font-size': rect.width > 80 ? '0.875rem' : '0.625rem',
                  'font-weight': '600',
                  color: 'rgba(0,0,0,0.8)',
                  'text-align': 'center',
                  'overflow': 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap',
                  'max-width': '100%',
                  padding: '0 4px',
                }}>
                  {rect.width > 60 ? rect.company.code : ''}
                </div>
                <div style={{
                  'font-size': rect.width > 100 ? '0.75rem' : '0.5rem',
                  color: 'rgba(0,0,0,0.7)',
                  'text-align': 'center',
                  'overflow': 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap',
                  'max-width': '100%',
                  padding: '0 4px',
                }}>
                  {rect.height > 40 ? formatMetric(rect.value) : ''}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div style={{
        display: 'flex',
        'justify-content': 'center',
        gap: '2rem',
        'font-size': '0.75rem',
        color: '#666'
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', background: getColor(minValue(), minValue(), maxValue()), 'border-radius': '2px' }} />
          <span>Lower</span>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', background: getColor((minValue() + maxValue()) / 2, minValue(), maxValue()), 'border-radius': '2px' }} />
          <span>Middle</span>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', background: getColor(maxValue(), minValue(), maxValue()), 'border-radius': '2px' }} />
          <span>Higher</span>
        </div>
      </div>
    </div>
  );
};

export default TreeMap;
