import { createSignal, createResource, For, Show } from 'solid-js';
import { validateFormula, evaluateFormula, FormulaValidationResponse, FormulaEvaluationResponse } from '../../api/formula';
import { getMetrics, MetricInfo } from '../../api/metrics';
import { CompanyInfo } from '../../api/screen';

interface FormulaEditorProps {
  value: string;
  onChange: (formula: string) => void;
  onSave?: (name: string, formula: string, description: string) => void;
  companies?: CompanyInfo[];
}

export default function FormulaEditor(props: FormulaEditorProps) {
  const [formula, setFormula] = createSignal(props.value || '');
  const [validationResult, setValidationResult] = createSignal<FormulaValidationResponse | null>(null);
  const [evaluationResult, setEvaluationResult] = createSignal<FormulaEvaluationResponse | null>(null);
  const [isValidating, setIsValidating] = createSignal(false);
  const [showSaveDialog, setShowSaveDialog] = createSignal(false);
  const [formulaName, setFormulaName] = createSignal('');
  const [formulaDescription, setFormulaDescription] = createSignal('');

  const [metrics] = createResource(getMetrics);

  let validateTimeout: ReturnType<typeof setTimeout> | null = null;

  const getSampleMetrics = (): Record<string, number> => {
    if (props.companies && props.companies.length > 0) {
      const firstCompany = props.companies[0];
      if (firstCompany.metrics) {
        return firstCompany.metrics;
      }
    }
    return {};
  };

  const handleFormulaChange = (newFormula: string) => {
    setFormula(newFormula);
    props.onChange(newFormula);

    if (validateTimeout) {
      clearTimeout(validateTimeout);
    }

    if (!newFormula.trim()) {
      setValidationResult(null);
      setEvaluationResult(null);
      return;
    }

    validateTimeout = setTimeout(async () => {
      setIsValidating(true);
      setEvaluationResult(null);
      try {
        const result = await validateFormula(newFormula);
        setValidationResult(result);
        if (result.valid) {
          const sampleMetrics = getSampleMetrics();
          if (Object.keys(sampleMetrics).length > 0) {
            try {
              const evalResult = await evaluateFormula(newFormula, sampleMetrics);
              setEvaluationResult(evalResult);
            } catch (e) {
              setEvaluationResult({ success: false, error: 'Evaluation failed' });
            }
          }
        }
      } catch (e) {
        setValidationResult({ valid: false, error: 'Validation failed' });
      } finally {
        setIsValidating(false);
      }
    }, 300);
  };

  const insertText = (text: string) => {
    const newFormula = formula() + text;
    handleFormulaChange(newFormula);
  };

  const handleSave = () => {
    if (props.onSave && formulaName().trim()) {
      props.onSave(formulaName(), formula(), formulaDescription());
      setShowSaveDialog(false);
      setFormulaName('');
      setFormulaDescription('');
    }
  };

  const groupedMetrics = () => {
    const m = metrics();
    if (!m) return {};
    return m.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<string, MetricInfo[]>);
  };

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '0.75rem',
      padding: '1rem',
      border: '1px solid #e5e7eb',
      'border-radius': '8px',
      background: '#fafafa',
    }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h4 style={{ margin: 0, 'font-size': '0.875rem', 'font-weight': '600' }}>Formula Editor</h4>
        <Show when={validationResult()}>
          <span style={{
            'font-size': '0.75rem',
            color: validationResult()!.valid ? '#16a34a' : '#dc2626',
          }}>
            {validationResult()!.valid ? '✓ Valid' : `✗ ${validationResult()!.error}`}
          </span>
        </Show>
        <Show when={isValidating()}>
          <span style={{ 'font-size': '0.75rem', color: '#666' }}>Validating...</span>
        </Show>
      </div>

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'flex-wrap': 'wrap',
      }}>
        <For each={['+', '-', '*', '/', '(', ')']}>
          {(op) => (
            <button
              type="button"
              onClick={() => insertText(op)}
              style={{
                padding: '0.375rem 0.625rem',
                'border-radius': '4px',
                border: '1px solid #d1d5db',
                background: '#fff',
                'font-size': '0.875rem',
                cursor: 'pointer',
              }}
            >
              {op}
            </button>
          )}
        </For>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <For each={['AVG(', 'SUM(', 'MIN(', 'MAX(', 'STD(']}>
          {(fn) => (
            <button
              type="button"
              onClick={() => insertText(fn)}
              style={{
                padding: '0.375rem 0.5rem',
                'border-radius': '4px',
                border: '1px solid #d1d5db',
                background: '#fff',
                'font-size': '0.75rem',
                cursor: 'pointer',
              }}
            >
              {fn}
            </button>
          )}
        </For>
      </div>

      <div>
        <label style={{ 'font-size': '0.75rem', color: '#666', display: 'block', 'margin-bottom': '0.25rem' }}>
          Insert Metric
        </label>
        <select
          onChange={(e) => {
            if (e.currentTarget.value) {
              insertText(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          style={{
            padding: '0.5rem',
            'border-radius': '4px',
            border: '1px solid #d1d5db',
            'font-size': '0.875rem',
            width: '100%',
            background: 'white',
          }}
        >
          <option value="">Select metric...</option>
          <Show when={!metrics.loading && !metrics.error}>
            <For each={Object.entries(groupedMetrics())}>
              {([category, items]) => (
                <optgroup label={category}>
                  <For each={items}>
                    {(metric) => (
                      <option value={metric.id}>{metric.name} ({metric.id})</option>
                    )}
                  </For>
                </optgroup>
              )}
            </For>
          </Show>
        </select>
      </div>

      <div>
        <label style={{ 'font-size': '0.75rem', color: '#666', display: 'block', 'margin-bottom': '0.25rem' }}>
          Formula
        </label>
        <textarea
          value={formula()}
          onInput={(e) => handleFormulaChange(e.currentTarget.value)}
          placeholder="e.g., roe / roi or AVG(roe[2020:2023])"
          style={{
            width: '100%',
            'min-height': '60px',
            padding: '0.5rem',
            'border-radius': '4px',
            border: `1px solid ${validationResult() && !validationResult()!.valid ? '#dc2626' : '#d1d5db'}`,
            'font-size': '0.875rem',
            'font-family': 'monospace',
            resize: 'vertical',
          }}
        />
      </div>

      <Show when={formula().trim()}>
        <div style={{
          padding: '0.5rem',
          'border-radius': '4px',
          background: validationResult()?.valid ? '#dcfce7' : '#fee2e2',
          'font-size': '0.75rem',
        }}>
          <strong>Formula:</strong> {formula()}
          <Show when={validationResult()?.valid && evaluationResult()?.success}>
            <div style={{ 'margin-top': '0.25rem', color: '#16a34a' }}>
              <strong>Result:</strong> {evaluationResult()?.result?.toFixed(4)}
            </div>
          </Show>
          <Show when={validationResult()?.valid && evaluationResult() && !evaluationResult()?.success}>
            <div style={{ 'margin-top': '0.25rem', color: '#dc2626' }}>
              <strong>Evaluation:</strong> {evaluationResult()?.error || 'Cannot evaluate'}
            </div>
          </Show>
          <Show when={validationResult()?.valid && !evaluationResult() && Object.keys(getSampleMetrics()).length === 0}>
            <div style={{ 'margin-top': '0.25rem', color: '#666' }}>
              <em>No sample data available for evaluation</em>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.onSave}>
        <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowSaveDialog(true)}
            disabled={!validationResult()?.valid}
            style={{
              padding: '0.5rem 1rem',
              'border-radius': '4px',
              border: 'none',
              background: validationResult()?.valid ? '#2563eb' : '#9ca3af',
              color: 'white',
              'font-size': '0.875rem',
              cursor: validationResult()?.valid ? 'pointer' : 'not-allowed',
            }}
          >
            Save Formula
          </button>
        </div>
      </Show>

      <Show when={showSaveDialog()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            'border-radius': '8px',
            'min-width': '300px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '1rem',
          }}>
            <h3 style={{ margin: 0, 'font-size': '1rem' }}>Save Formula</h3>
            <div>
              <label style={{ 'font-size': '0.75rem', color: '#666', display: 'block', 'margin-bottom': '0.25rem' }}>
                Name
              </label>
              <input
                type="text"
                value={formulaName()}
                onInput={(e) => setFormulaName(e.currentTarget.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  'border-radius': '4px',
                  border: '1px solid #d1d5db',
                  'font-size': '0.875rem',
                }}
              />
            </div>
            <div>
              <label style={{ 'font-size': '0.75rem', color: '#666', display: 'block', 'margin-bottom': '0.25rem' }}>
                Description (optional)
              </label>
              <textarea
                value={formulaDescription()}
                onInput={(e) => setFormulaDescription(e.currentTarget.value)}
                style={{
                  width: '100%',
                  'min-height': '60px',
                  padding: '0.5rem',
                  'border-radius': '4px',
                  border: '1px solid #d1d5db',
                  'font-size': '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '0.5rem 1rem',
                  'border-radius': '4px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  'font-size': '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!formulaName().trim()}
                style={{
                  padding: '0.5rem 1rem',
                  'border-radius': '4px',
                  border: 'none',
                  background: formulaName().trim() ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  'font-size': '0.875rem',
                  cursor: formulaName().trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}