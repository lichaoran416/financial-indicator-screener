import { For, Show, createSignal } from 'solid-js';
import { Condition } from '../../api/screen';

type Logic = 'and' | 'or';

interface ConditionTreeProps {
  conditions: Condition[];
  logic: Logic;
}

function getPeriodLabel(period?: string, years?: number): string {
  if (!period) return '';
  
  const periodMap: Record<string, string> = {
    'ttm': 'TTM',
    'annual': 'Annual',
    'quarterly': 'Quarterly'
  };
  
  let label = periodMap[period] || period;
  
  if (years && years > 0) {
    label += `, ${years} year${years > 1 ? 's' : ''}`;
  }
  
  return label;
}

export default function ConditionTree(props: ConditionTreeProps) {
  const [collapsed, setCollapsed] = createSignal(false);

  const rootLabel = () => props.logic === 'and' ? 'ALL' : 'ANY';
  const rootColor = () => props.logic === 'and' ? '#2563eb' : '#7c3aed';

  const toggleCollapse = () => {
    setCollapsed(!collapsed());
  };

  return (
    <div style={{
      'font-family': 'system-ui, -apple-system, sans-serif',
      'font-size': '0.875rem',
    }}>
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '0.75rem',
      }}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'gap': '0.5rem',
        }}>
          <span style={{
            'font-size': '0.75rem',
            'font-weight': '500',
            color: '#666',
            'text-transform': 'uppercase',
          }}>
            Condition Tree
          </span>
        </div>
        <Show when={props.conditions.length > 3}>
          <button
            type="button"
            onClick={toggleCollapse}
            style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '4px',
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#666',
              'font-size': '0.75rem',
              cursor: 'pointer',
            }}
          >
            {collapsed() ? 'Expand' : 'Collapse'}
          </button>
        </Show>
      </div>

      <Show
        when={props.conditions.length > 0}
        fallback={
          <div style={{
            padding: '1rem',
            'background-color': '#f9fafb',
            'border-radius': '8px',
            'text-align': 'center',
            color: '#666',
          }}>
            No conditions yet
          </div>
        }
      >
        <div style={{
          'border-left': '2px solid #e5e7eb',
          'padding-left': '1rem',
          'margin-left': '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            'align-items': 'flex-start',
            'margin-bottom': '0.5rem',
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              width: '2rem',
              height: '2rem',
              'border-radius': '50%',
              background: rootColor(),
              color: 'white',
              'font-weight': '600',
              'font-size': '0.75rem',
              'flex-shrink': 0,
              'margin-left': '-1.25rem',
              'margin-right': '0.75rem',
              'box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              {rootLabel()}
            </div>
            <div style={{
              'border-bottom': collapsed() ? 'none' : '1px dashed #e5e7eb',
              'padding-bottom': collapsed() ? '0' : '0.5rem',
              'flex': 1,
            }}>
              <span style={{ color: '#374151', 'font-weight': '500' }}>
                {props.logic === 'and' ? 'All conditions must match' : 'Any condition can match'}
              </span>
            </div>
          </div>

          <Show when={!collapsed()}>
            <For each={props.conditions}>
              {(condition, index) => {
                const isLast = () => index() === props.conditions.length - 1;
                const periodLabel = () => getPeriodLabel(condition.period, condition.years);

                return (
                  <div style={{
                    display: 'flex',
                    'align-items': 'flex-start',
                    'margin-bottom': isLast() ? '0' : '0.5rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      'align-items': 'center',
                      'margin-left': '-1.25rem',
                      'margin-right': '0.75rem',
                      'flex-shrink': 0,
                    }}>
                      <div style={{
                        width: '0.75rem',
                        height: '0.75rem',
                        'border-radius': '2px',
                        background: '#10b981',
                        border: '2px solid #fff',
                        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
                      }} />
                      <Show when={!isLast()}>
                        <div style={{
                          width: '2px',
                          height: '1.5rem',
                          background: '#e5e7eb',
                          'margin-top': '0.25rem',
                        }} />
                      </Show>
                    </div>

                    <div style={{
                      'background': '#fff',
                      border: '1px solid #e5e7eb',
                      'border-radius': '8px',
                      padding: '0.75rem',
                      'flex': 1,
                      'box-shadow': '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{
                        display: 'flex',
                        'align-items': 'center',
                        'gap': '0.5rem',
                        'flex-wrap': 'wrap',
                      }}>
                        <span style={{
                          'font-weight': '600',
                          color: '#1f2937',
                          'font-size': '0.875rem',
                        }}>
                          {condition.metric || 'Unknown metric'}
                        </span>
                        <span style={{
                          color: '#6b7280',
                          'font-size': '0.875rem',
                        }}>
                          {condition.operator}
                        </span>
                        <span style={{
                          'font-weight': '600',
                          color: '#059669',
                          'font-size': '0.875rem',
                        }}>
                          {condition.value}
                        </span>
                        <Show when={condition.value2 !== undefined && condition.value2 !== null}>
                          <span style={{ color: '#6b7280' }}>~</span>
                          <span style={{
                            'font-weight': '600',
                            color: '#059669',
                          }}>
                            {condition.value2}
                          </span>
                        </Show>
                      </div>
                      <Show when={periodLabel()}>
                        <div style={{
                          'margin-top': '0.5rem',
                          'font-size': '0.75rem',
                          color: '#9ca3af',
                        }}>
                          {periodLabel()}
                        </div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>

          <Show when={collapsed() && props.conditions.length > 0}>
            <div style={{
              'margin-left': '2.5rem',
              'margin-top': '0.5rem',
              'font-size': '0.75rem',
              color: '#6b7280',
            }}>
              {props.conditions.length} condition{props.conditions.length !== 1 ? 's' : ''} hidden
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
