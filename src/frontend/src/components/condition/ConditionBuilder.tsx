import { For, Show, createSignal } from 'solid-js';
import { Condition, Period, CompanyInfo } from '../../api/screen';
import ConditionRow from './ConditionRow';
import LogicToggle from './LogicToggle';
import ConditionTree from './ConditionTree';

type Logic = 'and' | 'or';
type ViewMode = 'builder' | 'tree';

interface ConditionBuilderProps {
  conditions: Condition[];
  logic: Logic;
  companies?: CompanyInfo[];
  onAdd: () => void;
  onUpdate: (index: number, condition: Condition) => void;
  onRemove: (index: number) => void;
  onLogicChange: (logic: Logic) => void;
}

const defaultCondition = (): Condition => ({
  metric: '',
  operator: '>',
  value: 0,
  period: 'ttm' as Period,
});

export default function ConditionBuilder(props: ConditionBuilderProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>('builder');

  const handleAdd = () => {
    props.onAdd();
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h3 style={{ margin: 0, 'font-size': '1rem', 'font-weight': '600' }}>Conditions</h3>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: '#f3f4f6', 'border-radius': '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setViewMode('builder')}
              style={{
                padding: '0.375rem 0.75rem',
                'border-radius': '4px',
                border: 'none',
                background: viewMode() === 'builder' ? '#fff' : 'transparent',
                color: viewMode() === 'builder' ? '#111' : '#666',
                'font-size': '0.75rem',
                'font-weight': '500',
                cursor: 'pointer',
                'box-shadow': viewMode() === 'builder' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              style={{
                padding: '0.375rem 0.75rem',
                'border-radius': '4px',
                border: 'none',
                background: viewMode() === 'tree' ? '#fff' : 'transparent',
                color: viewMode() === 'tree' ? '#111' : '#666',
                'font-size': '0.75rem',
                'font-weight': '500',
                cursor: 'pointer',
                'box-shadow': viewMode() === 'tree' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Tree
            </button>
          </div>
          <LogicToggle value={props.logic} onChange={props.onLogicChange} />
        </div>
      </div>

      <Show when={viewMode() === 'tree'}>
        <div style={{
          border: '1px solid #e5e7eb',
          'border-radius': '8px',
          padding: '1rem',
          background: '#fafafa',
        }}>
          <ConditionTree conditions={props.conditions} logic={props.logic} />
        </div>
      </Show>

      <Show when={viewMode() === 'builder'}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
          <Show when={props.conditions.length === 0}>
            <p style={{ color: '#666', 'font-size': '0.875rem', margin: 0 }}>
              No conditions yet. Click "Add Condition" to start.
            </p>
          </Show>
          <For each={props.conditions}>
            {(condition, index) => (
              <ConditionRow
                condition={condition}
                companies={props.companies}
                onUpdate={(updated) => props.onUpdate(index(), updated)}
                onDelete={() => props.onRemove(index())}
              />
            )}
          </For>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '0.625rem 1rem',
            'border-radius': '4px',
            'border': 'none',
            'background': '#2563eb',
            color: 'white',
            'font-size': '0.875rem',
            'font-weight': '500',
            cursor: 'pointer',
            'align-self': 'flex-start',
          }}
        >
          + Add Condition
        </button>
      </Show>
    </div>
  );
}

export { defaultCondition };
