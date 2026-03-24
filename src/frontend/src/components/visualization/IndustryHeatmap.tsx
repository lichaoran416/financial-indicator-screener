import { Component, createMemo, For, Show } from 'solid-js';
import type { CompanyInfo } from '../../api/screen';

interface IndustryHeatmapProps {
  companies: CompanyInfo[];
}

interface IndustryData {
  name: string;
  count: number;
  percentage: number;
}

const getHeatColor = (count: number, min: number, max: number): string => {
  if (max === min) return '#e3f2fd';
  const normalized = (count - min) / (max - min);
  const lightness = 85 - normalized * 50;
  const saturation = 60 + normalized * 30;
  return `hsl(210, ${saturation}%, ${lightness}%)`;
};

const IndustryHeatmap: Component<IndustryHeatmapProps> = (props) => {
  const industryData = createMemo((): IndustryData[] => {
    const industryMap = new Map<string, number>();
    
    props.companies.forEach((company) => {
      const industry = company.industry || 'Unknown';
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    });

    const total = props.companies.length;
    const data: IndustryData[] = [];
    
    industryMap.forEach((count, name) => {
      data.push({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      });
    });

    return data.sort((a, b) => b.count - a.count);
  });

  const minCount = createMemo(() => {
    const data = industryData();
    return data.length > 0 ? Math.min(...data.map(d => d.count)) : 0;
  });

  const maxCount = createMemo(() => {
    const data = industryData();
    return data.length > 0 ? Math.max(...data.map(d => d.count)) : 0;
  });

  const maxVisible = 50;

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <div style={{ 'font-size': '0.875rem', color: '#666' }}>
          Industry Distribution ({industryData().length} industries)
        </div>
        <div style={{ 'font-size': '0.75rem', color: '#666' }}>
          {props.companies.length} companies total
        </div>
      </div>

      <Show
        when={industryData().length > 0}
        fallback={
          <div style={{
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            height: '200px',
            color: '#666',
            background: '#f5f5f5',
            'border-radius': '8px',
          }}>
            No industry data available
          </div>
        }
      >
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '8px',
          padding: '0.5rem',
        }}>
          <For each={industryData().slice(0, maxVisible)}>
            {(item) => (
              <div
                style={{
                  background: getHeatColor(item.count, minCount(), maxCount()),
                  border: '1px solid rgba(0,0,0,0.1)',
                  'border-radius': '6px',
                  padding: '0.75rem',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '0.25rem',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={`${item.name}: ${item.count} companies (${item.percentage.toFixed(1)}%)`}
              >
                <div style={{
                  'font-size': '0.75rem',
                  'font-weight': '600',
                  color: '#333',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap',
                }}>
                  {item.name}
                </div>
                <div style={{
                  'font-size': '1.125rem',
                  'font-weight': '700',
                  color: '#1976d2',
                }}>
                  {item.count}
                </div>
                <div style={{
                  'font-size': '0.625rem',
                  color: '#666',
                }}>
                  {item.percentage.toFixed(1)}%
                </div>
              </div>
            )}
          </For>
        </div>

        <Show when={industryData().length > maxVisible}>
          <div style={{
            'text-align': 'center',
            'font-size': '0.75rem',
            color: '#666',
            padding: '0.5rem',
          }}>
            ... and {industryData().length - maxVisible} more industries
          </div>
        </Show>

        <div style={{
          display: 'flex',
          'justify-content': 'center',
          gap: '2rem',
          'font-size': '0.75rem',
          color: '#666',
          'padding-top': '0.5rem',
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
            <div style={{ width: '12px', height: '12px', background: getHeatColor(minCount(), minCount(), maxCount()), 'border-radius': '2px' }} />
            <span>Fewer ({minCount()})</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
            <div style={{ width: '12px', height: '12px', background: getHeatColor((minCount() + maxCount()) / 2, minCount(), maxCount()), 'border-radius': '2px' }} />
            <span>Medium</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
            <div style={{ width: '12px', height: '12px', background: getHeatColor(maxCount(), minCount(), maxCount()), 'border-radius': '2px' }} />
            <span>More ({maxCount()})</span>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default IndustryHeatmap;
