export enum CompanyStatus {
  Normal = 'normal',
  Warning = 'warning',
  Danger = 'danger',
}

export enum RiskFlag {
  None = 'none',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export interface Condition {
  metric: string;
  operator: string;
  value: number;
  period?: string;
  years?: number;
}

export interface ScreenRequest {
  conditions: Condition[];
  logic?: 'and' | 'or';
}

export interface ScreenResponse {
  results: CompanyResult[];
  total: number;
  timestamp: string;
}

export interface CompanyResult {
  code: string;
  name: string;
  metrics: Record<string, number>;
  status: CompanyStatus;
  riskFlag: RiskFlag;
}

export interface CompanyDetailResponse {
  code: string;
  name: string;
  industry: string;
  market: string;
  totalShares: number;
  circulatingShares: number;
  financials: FinancialData;
  riskAssessment: RiskAssessment;
}

export interface FinancialData {
  revenue: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  roe: number;
  roa: number;
  debtRatio: number;
  currentRatio: number;
  quickRatio: number;
}

export interface RiskAssessment {
  riskFlag: RiskFlag;
  riskScore: number;
  riskFactors: string[];
}

export interface MetricInfo {
  key: string;
  name: string;
  category: string;
  unit: string;
  description: string;
}

export interface MetricsListResponse {
  metrics: MetricInfo[];
  categories: string[];
}

export interface SavedScreen {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  logic: 'and' | 'or';
  createdAt: string;
  updatedAt: string;
}

export interface CustomFormula {
  id: string;
  name: string;
  formula: string;
  description?: string;
  createdAt?: string;
}

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
  ast?: Record<string, unknown>;
}

export interface FormulaEvaluationResult {
  success: boolean;
  error?: string;
  result?: number;
}
