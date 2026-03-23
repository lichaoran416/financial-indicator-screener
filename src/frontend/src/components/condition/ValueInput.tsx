import { createSignal } from 'solid-js';

interface ValueInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export default function ValueInput(props: ValueInputProps) {
  const [localValue, setLocalValue] = createSignal(String(props.value ?? ''));

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocalValue(target.value);
  };

  const handleBlur = () => {
    const num = parseFloat(localValue());
    if (!isNaN(num)) {
      props.onChange(num);
    } else {
      setLocalValue(String(props.value));
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
      <label style={{ 'font-size': '0.75rem', color: '#666' }}>Value</label>
      <input
        type="number"
        step="any"
        value={localValue()}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder ?? '0'}
        style={{
          padding: '0.5rem',
          'border-radius': '4px',
          'border': '1px solid #ddd',
          'font-size': '0.875rem',
          'min-width': '100px',
        }}
      />
    </div>
  );
}