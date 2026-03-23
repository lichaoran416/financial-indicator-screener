import { createSignal, For, Show } from "solid-js";
import { formulaStore } from "../../stores/formulaStore";

interface FormulaEditorProps {
  initialFormula?: string;
  onSave?: (name: string, formula: string, description?: string) => void;
  onValidate?: (formula: string) => void;
  onEvaluate?: (formula: string, metrics: Record<string, number>) => void;
  testMetrics?: Record<string, number>;
}

export default function FormulaEditor(props: FormulaEditorProps) {
  const [name, setName] = createSignal("");
  const [formula, setFormula] = createSignal(props.initialFormula || "");
  const [description, setDescription] = createSignal("");
  const [showSaved, setShowSaved] = createSignal(false);

  const handleValidate = async () => {
    const result = await formulaStore.validateFormula(formula());
    props.onValidate?.(formula());
    return result;
  };

  const handleEvaluate = async () => {
    if (!props.testMetrics) {
      return { success: false, error: "No test metrics provided" };
    }
    const result = await formulaStore.evaluateFormula(formula(), props.testMetrics);
    props.onEvaluate?.(formula(), props.testMetrics);
    return result;
  };

  const handleSave = async () => {
    if (!name().trim()) {
      return { success: false, error: "Name is required" };
    }
    if (!formula().trim()) {
      return { success: false, error: "Formula is required" };
    }
    const result = await formulaStore.saveFormula(name(), formula(), description() || undefined);
    props.onSave?.(name(), formula(), description() || undefined);
    return result;
  };

  const handleDelete = async (id: string) => {
    await formulaStore.deleteFormula(id);
  };

  const selectFormula = (savedFormula: typeof formulaStore.formulas[0]) => {
    setFormula(savedFormula.formula);
    setName(savedFormula.name);
    setDescription(savedFormula.description || "");
  };

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}>
      <div style={{ "border-bottom": "1px solid #e5e7eb", "padding-bottom": "0.5rem" }}>
        <h3 style={{ margin: 0, "font-size": "1.125rem", "font-weight": "600" }}>
          Custom Formula Editor
        </h3>
        <p style={{ margin: "0.25rem 0 0", color: "#6b7280", "font-size": "0.875rem" }}>
          Create custom financial formulas using metrics and operators
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setShowSaved(false)}
          style={{
            padding: "0.5rem 1rem",
            "border-radius": "4px",
            border: showSaved() ? "1px solid #d1d5db" : "none",
            background: showSaved() ? "white" : "#2563eb",
            color: showSaved() ? "#374151" : "white",
            "font-size": "0.875rem",
            cursor: "pointer",
          }}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => {
            setShowSaved(true);
            formulaStore.loadFormulas();
          }}
          style={{
            padding: "0.5rem 1rem",
            "border-radius": "4px",
            border: !showSaved() ? "1px solid #d1d5db" : "none",
            background: !showSaved() ? "white" : "#2563eb",
            color: !showSaved() ? "#374151" : "white",
            "font-size": "0.875rem",
            cursor: "pointer",
          }}
        >
          Saved Formulas
        </button>
      </div>

      <Show when={!showSaved()}>
        <div style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", "font-size": "0.875rem", "font-weight": "500", "margin-bottom": "0.25rem" }}>
              Formula Name
            </label>
            <input
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="e.g., High ROE Screener"
              style={{
                width: "100%",
                padding: "0.5rem",
                "border-radius": "4px",
                border: "1px solid #d1d5db",
                "font-size": "0.875rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", "font-size": "0.875rem", "font-weight": "500", "margin-bottom": "0.25rem" }}>
              Formula
            </label>
            <textarea
              value={formula()}
              onInput={(e) => setFormula(e.currentTarget.value)}
              placeholder="e.g., ROE / 总资产 * 100 or AVG(ROE[2020:2024])"
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem",
                "border-radius": "4px",
                border: formulaStore.validationResult && !formulaStore.validationResult.valid
                  ? "1px solid #ef4444"
                  : "1px solid #d1d5db",
                "font-size": "0.875rem",
                "font-family": "monospace",
                resize: "vertical",
              }}
            />
            <Show when={formulaStore.validationResult}>
              {(result) => (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    "font-size": "0.75rem",
                    color: result().valid ? "#059669" : "#dc2626",
                  }}
                >
                  {result().valid
                    ? "Formula syntax is valid"
                    : result().error || "Invalid formula"}
                </p>
              )}
            </Show>
          </div>

          <div>
            <label style={{ display: "block", "font-size": "0.875rem", "font-weight": "500", "margin-bottom": "0.25rem" }}>
              Description (optional)
            </label>
            <input
              type="text"
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              placeholder="Describe what this formula does"
              style={{
                width: "100%",
                padding: "0.5rem",
                "border-radius": "4px",
                border: "1px solid #d1d5db",
                "font-size": "0.875rem",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", "flex-wrap": "wrap" }}>
            <button
              type="button"
              onClick={handleValidate}
              disabled={formulaStore.loading}
              style={{
                padding: "0.5rem 1rem",
                "border-radius": "4px",
                border: "1px solid #d1d5db",
                background: "white",
                "font-size": "0.875rem",
                cursor: formulaStore.loading ? "not-allowed" : "pointer",
                opacity: formulaStore.loading ? 0.6 : 1,
              }}
            >
              Validate
            </button>
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={formulaStore.loading || !props.testMetrics}
              style={{
                padding: "0.5rem 1rem",
                "border-radius": "4px",
                border: "1px solid #d1d5db",
                background: "white",
                "font-size": "0.875rem",
                cursor: formulaStore.loading || !props.testMetrics ? "not-allowed" : "pointer",
                opacity: formulaStore.loading || !props.testMetrics ? 0.6 : 1,
              }}
            >
              Test Evaluate
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={formulaStore.loading}
              style={{
                padding: "0.5rem 1rem",
                "border-radius": "4px",
                border: "none",
                background: "#059669",
                color: "white",
                "font-size": "0.875rem",
                cursor: formulaStore.loading ? "not-allowed" : "pointer",
                opacity: formulaStore.loading ? 0.6 : 1,
              }}
            >
              Save Formula
            </button>
          </div>

          <Show when={formulaStore.evaluationResult}>
            {(result) => (
              <div
                style={{
                  padding: "0.75rem",
                  "border-radius": "4px",
                  background: result().success ? "#d1fae5" : "#fee2e2",
                }}
              >
                <p style={{ margin: 0, "font-size": "0.875rem" }}>
                  <strong>Evaluation Result:</strong>{" "}
                  {result().success
                    ? result().result?.toFixed(4)
                    : result().error}
                </p>
              </div>
            )}
          </Show>

          <div
            style={{
              padding: "0.75rem",
              "border-radius": "4px",
              background: "#f3f4f6",
              "font-size": "0.75rem",
            }}
          >
            <p style={{ margin: "0 0 0.5rem", "font-weight": "600" }}>Syntax Reference:</p>
            <ul style={{ margin: 0, "padding-left": "1rem" }}>
              <li>Operators: +, -, *, /, ()</li>
              <li>Functions: AVG(), SUM(), MIN(), MAX(), STD()</li>
              <li>Metric refs: 净利润 / 总资产</li>
              <li>Time series: ROE[2023], AVG(ROE[2020:2024])</li>
            </ul>
          </div>
        </div>
      </Show>

      <Show when={showSaved()}>
        <div style={{ display: "flex", "flex-direction": "column", gap: "0.75rem" }}>
          <Show when={formulaStore.formulas.length === 0}>
            <p style={{ color: "#6b7280", "font-size": "0.875rem", margin: 0 }}>
              No saved formulas yet. Create one in the Editor tab.
            </p>
          </Show>
          <Show when={formulaStore.formulas.length > 0}>
            <For each={formulaStore.formulas}>
              {(f) => (
                <div
                  style={{
                    padding: "0.75rem",
                    "border-radius": "4px",
                    border: "1px solid #e5e7eb",
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", "justify-content": "space-between", "align-items": "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, "font-weight": "600", "font-size": "0.875rem" }}>{f.name}</p>
                      <code style={{ "font-size": "0.75rem", color: "#6b7280" }}>{f.formula}</code>
                      <Show when={f.description}>
                        <p style={{ margin: "0.25rem 0 0", "font-size": "0.75rem", color: "#9ca3af" }}>
                          {f.description}
                        </p>
                      </Show>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        type="button"
                        onClick={() => selectFormula(f)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          "border-radius": "4px",
                          border: "1px solid #d1d5db",
                          background: "white",
                          "font-size": "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          "border-radius": "4px",
                          border: "1px solid #ef4444",
                          background: "white",
                          color: "#dc2626",
                          "font-size": "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
