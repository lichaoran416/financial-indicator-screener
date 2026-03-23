import { Component } from 'solid-js';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: '20px',
  medium: '40px',
  large: '60px',
};

export const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const size = () => props.size ?? 'medium';
  const dimension = () => sizeMap[size()];

  return (
    <div
      style={{
        display: 'inline-block',
        width: dimension(),
        height: dimension(),
        'border-radius': '50%',
        'border': '3px solid #e0e0e0',
        'border-top-color': '#1976d2',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
