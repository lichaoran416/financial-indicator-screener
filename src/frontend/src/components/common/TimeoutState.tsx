import { Component } from 'solid-js';

interface TimeoutStateProps {
  onSimplify: () => void;
}

export const TimeoutState: Component<TimeoutStateProps> = (props) => {
  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <div
        style={{
          color: '#f57c00',
          'font-size': '1rem',
          'text-align': 'center',
        }}
      >
        Request timed out. This may be due to too many conditions or a network issue.
      </div>
      <button
        onClick={() => props.onSimplify()}
        style={{
          padding: '0.5rem 1rem',
          'background-color': '#f57c00',
          color: 'white',
          border: 'none',
          'border-radius': '4px',
          cursor: 'pointer',
          'font-size': '0.875rem',
        }}
      >
        Simplify Conditions
      </button>
    </div>
  );
};

export default TimeoutState;
