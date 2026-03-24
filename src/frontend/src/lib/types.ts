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
  metric?: string;
  formula?: string;
  operator: string;
  value: number;
  value2?: number;
  period?: 'annual' | 'quarterly' | 'ttm';
  years?: number;
}

export interface MetricInfo {
  id: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
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