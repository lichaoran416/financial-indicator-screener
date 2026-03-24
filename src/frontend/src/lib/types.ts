export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELISTED = 'DELISTED',
}

export enum RiskFlag {
  NORMAL = 'NORMAL',
  ST = 'ST',
  STAR_ST = 'STAR_ST',
  DELISTING_RISK = 'DELISTING_RISK',
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
  companies: CompanyResult[];
  total: number;
}

export interface CompanyResult {
  code: string;
  name: string;
  status: CompanyStatus;
  riskFlag: RiskFlag;
  industry?: string;
}

export interface MetricInfo {
  id: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
}

export interface MetricsListResponse {
  metrics: MetricInfo[];
  categories: string[];
}

export interface SavedScreen {
  id: string;
  name: string;
  conditions: Condition[];
  created_at: string;
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

export interface IndustryClassification {
  code: string;
  name: string;
  level: string;
}

export interface PeerMetric {
  metric: string;
  value: number | null;
  industry_avg: number | null;
  industry_median: number | null;
  percentile: number | null;
}

export interface PeerComparisonResponse {
  code: string;
  name: string;
  industry: string;
  peers_count: number;
  metrics: PeerMetric[];
}

export type IndustryType = 'csrc' | 'sw1' | 'sw3';