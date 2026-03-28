import apiClient from "./client";

export interface FormulaValidationRequest {
  formula: string;
}

export interface FormulaValidationResponse {
  valid: boolean;
  error?: string;
  ast?: Record<string, unknown>;
}

export interface FormulaEvaluationRequest {
  formula: string;
  metrics: Record<string, number>;
}

export interface FormulaEvaluationResponse {
  success: boolean;
  error?: string;
  result?: number;
}

export interface FormulaSaveRequest {
  name: string;
  formula: string;
  description?: string;
}

export interface FormulaResponse {
  id: string;
  name: string;
  formula: string;
  description?: string;
  created_at?: string;
}

export const validateFormula = async (
  formula: string
): Promise<FormulaValidationResponse> => {
  const response = await apiClient.post<FormulaValidationResponse>(
    "/formula/validate",
    { formula }
  );
  return response.data;
};

export const evaluateFormula = async (
  formula: string,
  metrics: Record<string, number>
): Promise<FormulaEvaluationResponse> => {
  const response = await apiClient.post<FormulaEvaluationResponse>(
    "/formula/evaluate",
    { formula, metrics }
  );
  return response.data;
};

export const saveFormula = async (
  request: FormulaSaveRequest
): Promise<FormulaResponse> => {
  const response = await apiClient.post<FormulaResponse>(
    "/formula/save",
    request
  );
  return response.data;
};

export const getSavedFormulas = async (): Promise<FormulaResponse[]> => {
  const response = await apiClient.get<FormulaResponse[]>("/formula/saved");
  return response.data;
};

export const deleteFormula = async (formulaId: string): Promise<boolean> => {
  const response = await apiClient.delete<{ deleted: boolean }>(
    `/formula/${formulaId}`
  );
  return response.data.deleted;
};

export interface FormulaUpdateRequest {
  name?: string;
  formula?: string;
  description?: string;
}

export const updateFormula = async (
  formulaId: string,
  request: FormulaUpdateRequest
): Promise<FormulaResponse> => {
  const response = await apiClient.put<FormulaResponse>(
    `/formula/${formulaId}`,
    request
  );
  return response.data;
};
