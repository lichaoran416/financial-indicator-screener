import { createStore } from "solid-js/store";
import type { CustomFormula, FormulaValidationResult, FormulaEvaluationResult } from "../lib/types";
import * as formulaApi from "../api/formula";

interface FormulaState {
  formulas: CustomFormula[];
  currentFormula: CustomFormula | null;
  validationResult: FormulaValidationResult | null;
  evaluationResult: FormulaEvaluationResult | null;
  loading: boolean;
  error: string | null;
}

const [formulaState, setFormulaState] = createStore<FormulaState>({
  formulas: [],
  currentFormula: null,
  validationResult: null,
  evaluationResult: null,
  loading: false,
  error: null,
});

export const formulaStore = {
  get formulas() {
    return formulaState.formulas;
  },
  get currentFormula() {
    return formulaState.currentFormula;
  },
  get validationResult() {
    return formulaState.validationResult;
  },
  get evaluationResult() {
    return formulaState.evaluationResult;
  },
  get loading() {
    return formulaState.loading;
  },
  get error() {
    return formulaState.error;
  },

  setCurrentFormula(formula: CustomFormula | null) {
    setFormulaState("currentFormula", formula);
  },

  setValidationResult(result: FormulaValidationResult | null) {
    setFormulaState("validationResult", result);
  },

  setEvaluationResult(result: FormulaEvaluationResult | null) {
    setFormulaState("evaluationResult", result);
  },

  async validateFormula(formula: string): Promise<FormulaValidationResult> {
    setFormulaState("loading", true);
    setFormulaState("error", null);
    try {
      const result = await formulaApi.validateFormula(formula);
      const validationResult: FormulaValidationResult = {
        valid: result.valid,
        error: result.error,
        ast: result.ast,
      };
      setFormulaState("validationResult", validationResult);
      return validationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Validation failed";
      setFormulaState("error", errorMessage);
      const failedResult: FormulaValidationResult = {
        valid: false,
        error: errorMessage,
      };
      setFormulaState("validationResult", failedResult);
      return failedResult;
    } finally {
      setFormulaState("loading", false);
    }
  },

  async evaluateFormula(
    formula: string,
    metrics: Record<string, number>
  ): Promise<FormulaEvaluationResult> {
    setFormulaState("loading", true);
    setFormulaState("error", null);
    try {
      const result = await formulaApi.evaluateFormula(formula, metrics);
      const evaluationResult: FormulaEvaluationResult = {
        success: result.success,
        error: result.error,
        result: result.result,
      };
      setFormulaState("evaluationResult", evaluationResult);
      return evaluationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Evaluation failed";
      setFormulaState("error", errorMessage);
      const failedResult: FormulaEvaluationResult = {
        success: false,
        error: errorMessage,
      };
      setFormulaState("evaluationResult", failedResult);
      return failedResult;
    } finally {
      setFormulaState("loading", false);
    }
  },

  async loadFormulas() {
    setFormulaState("loading", true);
    setFormulaState("error", null);
    try {
      const response = await formulaApi.getSavedFormulas();
      const formulas: CustomFormula[] = response.map((f) => ({
        id: f.id,
        name: f.name,
        formula: f.formula,
        description: f.description,
        createdAt: f.created_at,
      }));
      setFormulaState("formulas", formulas);
      return formulas;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load formulas";
      setFormulaState("error", errorMessage);
      throw err;
    } finally {
      setFormulaState("loading", false);
    }
  },

  async saveFormula(
    name: string,
    formula: string,
    description?: string
  ): Promise<CustomFormula> {
    setFormulaState("loading", true);
    setFormulaState("error", null);
    try {
      const response = await formulaApi.saveFormula({ name, formula, description });
      const newFormula: CustomFormula = {
        id: response.id,
        name: response.name,
        formula: response.formula,
        description: response.description,
        createdAt: response.created_at,
      };
      setFormulaState("formulas", (prev) => [...prev, newFormula]);
      return newFormula;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save formula";
      setFormulaState("error", errorMessage);
      throw err;
    } finally {
      setFormulaState("loading", false);
    }
  },

  async deleteFormula(formulaId: string): Promise<boolean> {
    setFormulaState("loading", true);
    setFormulaState("error", null);
    try {
      await formulaApi.deleteFormula(formulaId);
      setFormulaState("formulas", (prev) =>
        prev.filter((f) => f.id !== formulaId)
      );
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete formula";
      setFormulaState("error", errorMessage);
      throw err;
    } finally {
      setFormulaState("loading", false);
    }
  },

  reset() {
    setFormulaState({
      formulas: [],
      currentFormula: null,
      validationResult: null,
      evaluationResult: null,
      loading: false,
      error: null,
    });
  },
};
