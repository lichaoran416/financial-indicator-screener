import { createSignal, createEffect, Show } from 'solid-js';
import ValueSlider from './ValueSlider';
import type { CompanyInfo } from '../../api/screen';

interface ValueInputProps {
  value: number;
  value2?: number;
  operator?: string;
  onChange: (value: number, value2?: number) => void;
  placeholder?: string;
  companies?: CompanyInfo[];
  metricName?: string;
}

export default function ValueInput(props: ValueInputProps) {
  const [localValue, setLocalValue] = createSignal('');
  const [localValue2, setLocalValue2] = createSignal('');
  const [showSlider, setShowSlider] = createSignal(false);

  createEffect(() => {
    setLocalValue(String(props.value ?? ''));
  });

  createEffect(() => {
    setLocalValue2(String(props.value2 ?? ''));
  });

  const metricValues = () => {
    if (!props.companies || !props.metricName) return [];
    return props.companies
      .map(c => c.metrics?.[props.metricName!])
      .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));
  };

  const minMax = () => {
    const vals = metricValues();
    if (vals.length === 0) return { min: 0, max: 100 };
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocalValue(target.value);
  };

  const handleInput2 = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocalValue2(target.value);
  };

  const handleBlur = () => {
    const num = parseFloat(localValue());
    if (!isNaN(num)) {
      if (props.operator === 'between') {
        const num2 = parseFloat(localValue2());
        props.onChange(num, isNaN(num2) ? undefined : num2);
      } else {
        props.onChange(num);
      }
    } else {
      setLocalValue(String(props.value));
    }
  };

  const handleBlur2 = () => {
    if (props.operator === 'between') {
      const num2 = parseFloat(localValue2());
      const num = parseFloat(localValue());
      if (!isNaN(num) && !isNaN(num2)) {
        props.onChange(num, num2);
      } else {
        setLocalValue2(String(props.value2 ?? ''));
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
        <Show when={props.operator !== 'between'}>
          <label style={{ 'font-size': '0.75rem', color: '#666' }}>Value</label>
        </Show>
        <Show when={props.operator === 'between'}>
          <label style={{ 'font-size': '0.75rem', color: '#666' }}>Min - Max</label>
        </Show>
        <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
          <input
            type="number"
            step="any"
            value={localValue()}
            onInput={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Min"
            style={{
              padding: '0.5rem',
              'border-radius': '4px',
              'border': '1px solid #ddd',
              'font-size': '0.875rem',
              'min-width': '80px',
            }}
          />
          <Show when={props.operator === 'between'}>
            <span style={{ color: '#666' }}>-</span>
            <input
              type="number"
              step="any"
              value={localValue2()}
              onInput={handleInput2}
              onBlur={handleBlur2}
              onKeyDown={handleKeyDown}
              placeholder="Max"
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                'border': '1px solid #ddd',
                'font-size': '0.875rem',
                'min-width': '80px',
              }}
            />
          </Show>
          <Show when={props.companies && props.metricName && props.operator === 'between'}>
            <button
              type="button"
              onClick={() => setShowSlider(true)}
              title="Show value distribution"
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                border: '1px solid #1976d2',
                background: '#e3f2fd',
                color: '#1976d2',
                'font-size': '0.75rem',
                cursor: 'pointer',
              }}
            >
              📊
            </button>
          </Show>
        </div>
      </div>
      <Show when={showSlider() && props.companies && props.metricName}>
        <ValueSlider
          metricName={props.metricName!}
          values={metricValues()}
          minValue={minMax().min}
          maxValue={minMax().max}
          selectedMin={parseFloat(localValue()) || minMax().min}
          selectedMax={parseFloat(localValue2()) || minMax().max}
          onChange={(min, max) => {
            setLocalValue(String(min));
            setLocalValue2(String(max));
            props.onChange(min, max);
          }}
          onClose={() => setShowSlider(false)}
        />
      </Show>
    </>
  );
}
