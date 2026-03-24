import { createSignal, Show } from 'solid-js';
import { Condition, Period, CompanyInfo } from '../../api/screen';
import MetricDropdown from './MetricDropdown';
import OperatorSelector from './OperatorSelector';
import ValueInput from './ValueInput';
import FormulaEditor from './FormulaEditor';

type ConditionMode = 'metric' | 'formula';

interface ConditionRowProps {
  condition: Condition;
  companies?: CompanyInfo[];
  onUpdate: (condition: Condition) => void;
  onDelete: () => void;
}

export default function ConditionRow(props: ConditionRowProps) {
  const [mode, setMode] = createSignal<ConditionMode>(
    props.condition.formula ? 'formula' : 'metric'
  );

  const handleModeChange = (newMode: ConditionMode) => {
    setMode(newMode);
    if (newMode === 'formula') {
      props.onUpdate({ ...props.condition, metric: undefined, formula: props.condition.formula || '' });
    } else {
      props.onUpdate({ ...props.condition, formula: undefined, metric: props.condition.metric || '' });
    }
  };

  const handleMetricChange = (metric: string) => {
    props.onUpdate({ ...props.condition, metric });
  };

  const handleFormulaChange = (formula: string) => {
    props.onUpdate({ ...props.condition, formula });
  };

  const handleOperatorChange = (operator: string) => {
    const updated = { ...props.condition, operator };
    if (operator !== 'between') {
      delete updated.value2;
    }
    props.onUpdate(updated);
  };

  const handleValueChange = (value: number, value2?: number) => {
    const updated = { ...props.condition, value };
    if (value2 !== undefined) {
      updated.value2 = value2;
    }
    props.onUpdate(updated);
  };

  const handlePeriodChange = (period: Period) => {
    props.onUpdate({ ...props.condition, period });
  };

  const handleYearsChange = (years: number) => {
    props.onUpdate({ ...props.condition, years });
  };

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '0.75rem',
        padding: '0.75rem',
        background: '#f8f9fa',
        'border-radius': '6px',
        'border': '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
        <label style={{ 'font-size': '0.75rem', color: '#666' }}>Input Type</label>
        <div style={{ display: 'flex', background: '#f3f4f6', 'border-radius': '4px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => handleModeChange('metric')}
            style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '3px',
              border: 'none',
              background: mode() === 'metric' ? '#fff' : 'transparent',
              color: mode() === 'metric' ? '#111' : '#666',
              'font-size': '0.75rem',
              cursor: 'pointer',
              'box-shadow': mode() === 'metric' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Metric
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('formula')}
            style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '3px',
              border: 'none',
              background: mode() === 'formula' ? '#fff' : 'transparent',
              color: mode() === 'formula' ? '#111' : '#666',
              'font-size': '0.75rem',
              cursor: 'pointer',
              'box-shadow': mode() === 'formula' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Formula
          </button>
        </div>
      </div>

      <Show when={mode() === 'formula'}>
        <FormulaEditor
          value={props.condition.formula || ''}
          onChange={handleFormulaChange}
          companies={props.companies}
        />
      </Show>

      <Show when={mode() === 'metric'}>
        <div style={{ display: 'flex', 'align-items': 'flex-end', gap: '0.75rem' }}>
          <MetricDropdown
            value={props.condition.metric || ''}
            onChange={handleMetricChange}
          />
          <OperatorSelector
            value={props.condition.operator}
            onChange={handleOperatorChange}
          />
          <ValueInput
            value={props.condition.value}
            value2={props.condition.value2}
            operator={props.condition.operator}
            companies={props.companies}
            metricName={props.condition.metric}
            onChange={handleValueChange}
          />
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
            <label style={{ 'font-size': '0.75rem', color: '#666' }}>Period</label>
            <select
              value={props.condition.period}
              onChange={(e) => handlePeriodChange(e.currentTarget.value as Period)}
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                'border': '1px solid #ddd',
                'font-size': '0.875rem',
                'min-width': '100px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="ttm">TTM</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
            <label style={{ 'font-size': '0.75rem', color: '#666' }}>Years</label>
            <input
              type="number"
              min="1"
              max="10"
              value={props.condition.years ?? 1}
              onChange={(e) => handleYearsChange(parseInt(e.currentTarget.value) || 1)}
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                'border': '1px solid #ddd',
                'font-size': '0.875rem',
                'min-width': '80px',
                background: 'white',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => props.onDelete()}
            style={{
              padding: '0.5rem 0.75rem',
              'border-radius': '4px',
              'border': '1px solid #dc3545',
              'background': 'white',
              color: '#dc3545',
              'font-size': '0.875rem',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </Show>

      <Show when={mode() === 'formula'}>
        <div style={{ display: 'flex', 'align-items': 'flex-end', gap: '0.75rem' }}>
          <OperatorSelector
            value={props.condition.operator}
            onChange={handleOperatorChange}
          />
          <ValueInput
            value={props.condition.value}
            value2={props.condition.value2}
            operator={props.condition.operator}
            companies={props.companies}
            metricName="formula"
            onChange={handleValueChange}
          />
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
            <label style={{ 'font-size': '0.75rem', color: '#666' }}>Period</label>
            <select
              value={props.condition.period}
              onChange={(e) => handlePeriodChange(e.currentTarget.value as Period)}
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                'border': '1px solid #ddd',
                'font-size': '0.875rem',
                'min-width': '100px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="ttm">TTM</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
            <label style={{ 'font-size': '0.75rem', color: '#666' }}>Years</label>
            <input
              type="number"
              min="1"
              max="10"
              value={props.condition.years ?? 1}
              onChange={(e) => handleYearsChange(parseInt(e.currentTarget.value) || 1)}
              style={{
                padding: '0.5rem',
                'border-radius': '4px',
                'border': '1px solid #ddd',
                'font-size': '0.875rem',
                'min-width': '80px',
                background: 'white',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => props.onDelete()}
            style={{
              padding: '0.5rem 0.75rem',
              'border-radius': '4px',
              'border': '1px solid #dc3545',
              'background': 'white',
              color: '#dc3545',
              'font-size': '0.875rem',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </Show>
    </div>
  );
}