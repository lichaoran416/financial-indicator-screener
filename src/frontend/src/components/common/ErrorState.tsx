import { Component } from 'solid-js';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: Component<ErrorStateProps> = (props) => {
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
          color: '#d32f2f',
          'font-size': '1rem',
          'text-align': 'center',
        }}
      >
        {props.message}
      </div>
      <button
        onClick={() => props.onRetry()}
        style={{
          padding: '0.5rem 1rem',
          'background-color': '#1976d2',
          color: 'white',
          border: 'none',
          'border-radius': '4px',
          cursor: 'pointer',
          'font-size': '0.875rem',
        }}
      >
        Retry
      </button>
    </div>
  );
};

export default ErrorState;
