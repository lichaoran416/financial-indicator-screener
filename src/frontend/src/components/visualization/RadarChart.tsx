import { Component, createEffect, onCleanup, createSignal } from 'solid-js';
import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import type { PeerMetric } from '../../lib/types';

Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarChartProps {
  metrics: PeerMetric[];
  companyName: string;
}

export const RadarChart: Component<RadarChartProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvasRef: any;
  const [chartInstance, setChartInstance] = createSignal<Chart | null>(null);

  const createChart = () => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
    if (!canvasRef) return;

    const validMetrics = props.metrics.filter(
      (m) => m.value !== null && m.industry_avg !== null
    );

    if (validMetrics.length === 0) return;

    const labels = validMetrics.map((m) => m.metric);
    const companyValues = validMetrics.map((m) => m.value ?? 0);
    const industryAvgValues = validMetrics.map((m) => m.industry_avg ?? 0);

    const chart = new Chart(canvasRef, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: props.companyName,
            data: companyValues,
            backgroundColor: 'rgba(25, 118, 210, 0.3)',
            borderColor: 'rgba(25, 118, 210, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(25, 118, 210, 1)',
          },
          {
            label: 'Industry Average',
            data: industryAvgValues,
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            ticks: {
              stepSize: 10,
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.r?.toFixed(2) ?? 'N/A';
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });

    setChartInstance(chart);
  };

  createEffect(() => {
    if (props.metrics.length > 0) {
      createChart();
    }
  });

  onCleanup(() => {
    if (chartInstance()) {
      chartInstance()!.destroy();
    }
  });

  return (
    <div style={{ height: '350px', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RadarChart;