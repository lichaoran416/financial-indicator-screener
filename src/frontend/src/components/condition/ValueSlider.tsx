import { Component, createSignal, createMemo, For } from 'solid-js';

interface ValueSliderProps {
  metricName: string;
  values: number[];
  minValue: number;
  maxValue: number;
  selectedMin: number;
  selectedMax: number;
  onChange: (min: number, max: number) => void;
  onClose: () => void;
}

interface HistogramBucket {
  height: number;
  count: number;
  label: string;
  bucketStart: number;
  bucketEnd: number;
}

const ValueSlider: Component<ValueSliderProps> = (props) => {
  const [localMin, setLocalMin] = createSignal(props.selectedMin);
  const [localMax, setLocalMax] = createSignal(props.selectedMax);

  const histogram = createMemo((): HistogramBucket[] => {
    const vals = props.values.filter(v => !isNaN(v) && isFinite(v));
    if (vals.length === 0) return [];

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount || 1;

    const buckets = Array(bucketCount).fill(0);
    const bucketLabels: string[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = min + i * bucketSize;
      bucketLabels[i] = `${bucketStart.toFixed(2)}`;
    }

    vals.forEach(v => {
      let bucketIndex = Math.floor((v - min) / bucketSize);
      if (bucketIndex >= bucketCount) bucketIndex = bucketCount - 1;
      if (bucketIndex < 0) bucketIndex = 0;
      buckets[bucketIndex]++;
    });

    const maxCount = Math.max(...buckets, 1);

    return buckets.map((count, idx) => ({
      height: (count / maxCount) * 100,
      count,
      label: bucketLabels[idx],
      bucketStart: min + idx * bucketSize,
      bucketEnd: min + (idx + 1) * bucketSize,
    }));
  });

  const percentileMarks = createMemo(() => {
    const vals = props.values.filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
    if (vals.length === 0) return { p25: 0, p50: 0, p75: 0 };

    const getPercentile = (arr: number[], p: number) => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      p25: getPercentile(vals, 25),
      p50: getPercentile(vals, 50),
      p75: getPercentile(vals, 75),
    };
  });

  const handleMinChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    setLocalMin(val);
  };

  const handleMaxChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    setLocalMax(val);
  };

  const handleApply = () => {
    props.onChange(localMin(), localMax());
    props.onClose();
  };

  const handleClose = () => {
    props.onClose();
  };

  const formatNumber = (n: number) => {
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '万';
    if (Math.abs(n) >= 100) return n.toFixed(2);
    return n.toFixed(4);
  };

  const isBucketHighlighted = (bucket: HistogramBucket) => {
    return localMin() <= bucket.bucketEnd && localMax() >= bucket.bucketStart;
  };

  return (
    <div style={{
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
      onClick={handleClose}
    >
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': '8px',
        'max-width': '700px',
        width: '90%',
        'max-height': '80vh',
        overflow: 'auto',
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h3 style={{ margin: 0, 'font-size': '1.125rem', 'font-weight': '600' }}>
            Set Range for {props.metricName.toUpperCase()}
          </h3>
          <button
            type="button"
            onClick={handleClose}
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

        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.875rem', color: '#666', 'margin-bottom': '0.5rem' }}>
            <span>Min: {formatNumber(props.minValue)}</span>
            <span>Max: {formatNumber(props.maxValue)}</span>
          </div>

          <div style={{
            display: 'flex',
            'align-items': 'flex-end',
            gap: '1rem',
            height: '120px',
            padding: '0.5rem 0',
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'flex-end',
              gap: '2px',
              flex: 1,
              height: '100px',
              background: '#f5f5f5',
              'border-radius': '4px',
              padding: '4px',
            }}>
              <For each={histogram()}>
                {(bucket) => (
                  <div style={{
                    flex: 1,
                    height: `${bucket.height}%`,
                    background: isBucketHighlighted(bucket)
                      ? '#1976d2'
                      : '#ccc',
                    'border-radius': '2px',
                    'min-width': '4px',
                    transition: 'background 0.2s',
                  }} title={`${bucket.label}: ${bucket.count} companies`} />
                )}
              </For>
            </div>

            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: '#f5f5f5',
              'border-radius': '4px',
              'min-width': '80px',
            }}>
              <div style={{ 'font-size': '0.75rem', color: '#666' }}>Percentiles</div>
              <div style={{ 'font-size': '0.75rem' }}>
                <span style={{ color: '#1976d2' }}>P25:</span> {formatNumber(percentileMarks().p25)}
              </div>
              <div style={{ 'font-size': '0.75rem' }}>
                <span style={{ color: '#1976d2' }}>P50:</span> {formatNumber(percentileMarks().p50)}
              </div>
              <div style={{ 'font-size': '0.75rem' }}>
                <span style={{ color: '#1976d2' }}>P75:</span> {formatNumber(percentileMarks().p75)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 'font-size': '0.75rem', color: '#666' }}>Min Value</label>
              <input
                type="number"
                step="any"
                value={localMin()}
                onInput={handleMinChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  'border-radius': '4px',
                  border: '1px solid #ddd',
                  'font-size': '0.875rem',
                  'box-sizing': 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ 'font-size': '0.75rem', color: '#666' }}>Max Value</label>
              <input
                type="number"
                step="any"
                value={localMax()}
                onInput={handleMaxChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  'border-radius': '4px',
                  border: '1px solid #ddd',
                  'font-size': '0.875rem',
                  'box-sizing': 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setLocalMin(props.minValue);
                setLocalMax(percentileMarks().p25);
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
              Set &lt; P25
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMin(percentileMarks().p25);
                setLocalMax(percentileMarks().p75);
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
              P25-P75
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMin(percentileMarks().p50);
                setLocalMax(props.maxValue);
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
              &gt; P50
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMin(percentileMarks().p75);
                setLocalMax(props.maxValue);
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
              &gt; P75
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '0.5rem 1rem',
              'border-radius': '4px',
              border: '1px solid #ccc',
              background: '#f5f5f5',
              'font-size': '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              padding: '0.5rem 1rem',
              'border-radius': '4px',
              border: '1px solid #1976d2',
              background: '#1976d2',
              color: 'white',
              'font-size': '0.875rem',
              cursor: 'pointer',
            }}
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValueSlider;
