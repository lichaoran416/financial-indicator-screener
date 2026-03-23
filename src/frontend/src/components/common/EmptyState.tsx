import { Component } from 'solid-js';

interface EmptyStateProps {
  message?: string;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  const displayMessage = () => props.message ?? 'No data found';

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        padding: '2rem',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          color: '#757575',
          'font-size': '1rem',
          'text-align': 'center',
        }}
      >
        {displayMessage()}
      </div>
    </div>
  );
};

export default EmptyState;
