import { For, Show } from 'solid-js';
import { Condition, Period } from '../../stores/screeningStore';
import ConditionRow from './ConditionRow';
import LogicToggle from './LogicToggle';

type Logic = 'and' | 'or';

interface ConditionBuilderProps {
  conditions: Condition[];
  logic: Logic;
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
  const handleAdd = () => {
    props.onAdd();
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h3 style={{ margin: 0, 'font-size': '1rem', 'font-weight': '600' }}>Conditions</h3>
        <LogicToggle value={props.logic} onChange={props.onLogicChange} />
      </div>

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
    </div>
  );
}

export { defaultCondition };
