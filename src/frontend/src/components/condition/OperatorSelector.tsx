type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between';

const operators: { value: Operator; label: string }[] = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '==', label: '=' },
  { value: '!=', label: '!=' },
  { value: 'between', label: 'between' },
];

interface OperatorSelectorProps {
  value: string;
  onChange: (operator: string) => void;
}

export default function OperatorSelector(props: OperatorSelectorProps) {
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
      <label style={{ 'font-size': '0.75rem', color: '#666' }}>Operator</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        style={{
          padding: '0.5rem',
          'border-radius': '4px',
          'border': '1px solid #ddd',
          'font-size': '0.875rem',
          'min-width': '80px',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        <For each={operators}>
          {(op) => <option value={op.value}>{op.label}</option>}
        </For>
      </select>
    </div>
  );
}

import { For } from 'solid-js';
