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
    const min = minValue();
    const max = maxValue();

    const items = companies.map((company, index) => ({
      company,
      value: values[index],
      normalizedValue: values[index] / totalValue,
    }));

    return squarify(items, 0, 0, width, height, min, max);
  });

  const squarify = (
    items: { company: CompanyInfo; value: number; normalizedValue: number }[],
    x: number,
    y: number,
    width: number,
    height: number,
    min: number,
    max: number
  ): TreemapRect[] => {
    if (items.length === 0) return [];
    if (width <= 0 || height <= 0) return [];

    const isHorizontal = width >= height;
    const shortSide = isHorizontal ? height : width;
    const longSide = isHorizontal ? width : height;

    const totalNormalized = items.reduce((sum, item) => sum + item.normalizedValue, 0);
    if (totalNormalized === 0) return [];

    const row: typeof items = [];
    let best: TreemapRect[] = [];
    let bestWorstRatio = Infinity;

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]);
      const rowRects = layoutRow(row, x, y, shortSide, longSide, isHorizontal, min, max);

      if (rowRects.length > 0) {
        const worstRatio = getWorstAspectRatio(rowRects, shortSide, longSide, isHorizontal);
        if (worstRatio <= bestWorstRatio) {
          best = rowRects;
          bestWorstRatio = worstRatio;
        } else {
          row.pop();
          break;
        }
      }
    }

    if (row.length === 0) return [];

    const rowNormalized = row.reduce((sum, item) => sum + item.normalizedValue, 0);
    const rowSize = (rowNormalized / totalNormalized) * (isHorizontal ? height : width);

    let remainingX = x;
    let remainingY = y;
    let remainingWidth = width;
    let remainingHeight = height;

    if (isHorizontal) {
      remainingY += rowSize;
      remainingHeight -= rowSize;
    } else {
      remainingX += rowSize;
      remainingWidth -= rowSize;
    }

    const remainingItems = items.slice(row.length);
    const remainingRects = squarify(remainingItems, remainingX, remainingY, remainingWidth, remainingHeight, min, max);

    return [...best, ...remainingRects];
  };

  const layoutRow = (
    row: { company: CompanyInfo; value: number; normalizedValue: number }[],
    x: number,
    y: number,
    shortSide: number,
    longSide: number,
    isHorizontal: boolean,
    min: number,
    max: number
  ): TreemapRect[] => {
    if (row.length === 0) return [];

    const totalNormalized = row.reduce((sum, item) => sum + item.normalizedValue, 0);
    if (totalNormalized === 0) return [];

    const rowSize = shortSide * totalNormalized;
    const rowLongSide = rowSize / shortSide;

    const rects: TreemapRect[] = [];
    let offset = 0;

    for (const item of row) {
      const itemSize = (item.normalizedValue / totalNormalized) * shortSide;
      const rectWidth = isHorizontal ? rowLongSide - 2 : itemSize - 2;
      const rectHeight = isHorizontal ? itemSize - 2 : rowLongSide - 2;
      const rectX = isHorizontal ? x : y + offset;
      const rectY = isHorizontal ? y + offset : x;

      rects.push({
        company: item.company,
        value: item.value,
        x: isHorizontal ? rectX : rectY,
        y: isHorizontal ? rectY : rectX,
        width: rectWidth,
        height: rectHeight,
        color: getColor(item.value, min, max),
        incomplete: (item.company.available_years ?? 0) < 5,
      });

      offset += itemSize;
    }

    return rects;
  };

  const getWorstAspectRatio = (
    rects: TreemapRect[],
    shortSide: number,
    longSide: number,
    isHorizontal: boolean
  ): number => {
    let worst = 0;
    for (const rect of rects) {
      const short = isHorizontal ? rect.height : rect.width;
      const long = isHorizontal ? rect.width : rect.height;
      if (short <= 0 || long <= 0) continue;
      const ratio = Math.max(short / long, long / short);
      worst = Math.max(worst, ratio);
    }
    return worst;
  };

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
