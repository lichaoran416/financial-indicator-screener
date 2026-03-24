import { Condition, Period, CompanyInfo } from '../../api/screen';
import MetricDropdown from './MetricDropdown';
import OperatorSelector from './OperatorSelector';
import ValueInput from './ValueInput';

interface ConditionRowProps {
  condition: Condition;
  companies?: CompanyInfo[];
  onUpdate: (condition: Condition) => void;
  onDelete: () => void;
}

export default function ConditionRow(props: ConditionRowProps) {
  const handleMetricChange = (metric: string) => {
    props.onUpdate({ ...props.condition, metric });
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

  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'flex-end',
        gap: '0.75rem',
        padding: '0.75rem',
        'background': '#f8f9fa',
        'border-radius': '6px',
        'border': '1px solid #e5e7eb',
      }}
    >
      <MetricDropdown
        value={props.condition.metric}
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
          'margin-left': 'auto',
        }}
      >
        Delete
      </button>
    </div>
  );
}
