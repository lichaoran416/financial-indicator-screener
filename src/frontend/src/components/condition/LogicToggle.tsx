type Logic = 'and' | 'or';

interface LogicToggleProps {
  value: Logic;
  onChange: (logic: Logic) => void;
}

export default function LogicToggle(props: LogicToggleProps) {
  const isOr = () => props.value === 'or';

  const toggle = () => {
    props.onChange(isOr() ? 'and' : 'or');
  };

  return (
    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          'border-radius': '4px',
          'border': '1px solid #ddd',
          'background': 'white',
          'font-size': '0.875rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span
          style={{
            'font-weight': '600',
            color: props.value === 'and' ? '#2563eb' : '#666',
          }}
        >
          AND
        </span>
        <span style={{ color: '#ccc' }}>|</span>
        <span
          style={{
            'font-weight': '600',
            color: props.value === 'or' ? '#2563eb' : '#666',
          }}
        >
          OR
        </span>
      </button>
    </div>
  );
}
