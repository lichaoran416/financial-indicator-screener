import apiClient from "./client";
import type {
  IndustryClassification,
  PeerComparisonResponse,
  IndustryType
} from "../lib/types";

export interface CompanyDetailResponse {
  code: string;
  name: string;
  industry?: string;
  status: "ACTIVE" | "SUSPENDED" | "DELISTED";
  risk_flag: "NORMAL" | "ST" | "STAR_ST" | "DELISTING_RISK";
  metrics: Record<string, number>;
}

export const getCompany = async (code: string): Promise<CompanyDetailResponse> => {
  const response = await apiClient.get<CompanyDetailResponse>(`/company/${code}`);
  return response.data;
};

export const getCSRCIndustries = async (): Promise<IndustryClassification[]> => {
  const response = await apiClient.get<IndustryClassification[]>("/industry/csrc");
  return response.data;
};

export const getSWIndustries = async (level: 1 | 3): Promise<IndustryClassification[]> => {
  const endpoint = level === 1 ? "/industry/sw-one" : "/industry/sw-three";
  const response = await apiClient.get<IndustryClassification[]>(endpoint);
  return response.data;
};

export interface PeerComparisonRequest {
  code: string;
  industry_type?: IndustryType;
  metrics?: string[];
}

export const getPeerComparison = async (
  request: PeerComparisonRequest
): Promise<PeerComparisonResponse> => {
  const response = await apiClient.post<PeerComparisonResponse>("/company/compare", request);
  return response.data;
};

export interface DisclosureDateRequest {
  codes: string[];
  period?: "annual" | "quarterly" | "ttm";
}

export interface AnnualDisclosure {
  report_date?: string;
  disclosure_date?: string;
}

export interface QuarterlyDisclosure {
  report_date?: string;
  disclosure_date?: string;
}

export interface CompanyDisclosureDate {
  code: string;
  name?: string;
  disclosure_dates: {
    annual?: Record<string, AnnualDisclosure>;
    quarterly?: Record<string, QuarterlyDisclosure>;
  };
}

export interface DisclosureDateResponse {
  companies: CompanyDisclosureDate[];
}

export const getDisclosureDates = async (
  request: DisclosureDateRequest
): Promise<DisclosureDateResponse> => {
  const response = await apiClient.post<DisclosureDateResponse>("/company/disclosure-dates", request);
  return response.data;
};

export const getTHSIndustries = async (): Promise<IndustryClassification[]> => {
  const response = await apiClient.get<IndustryClassification[]>("/industry/ths");
  return response.data;
};

export interface TrendComparisonRequest {
  codes: string[];
  metrics: string[];
  period?: "annual" | "quarterly" | "ttm";
  years?: number;
}

export interface MetricTrendPoint {
  date: string;
  value: number | null;
}

export interface MetricTrendData {
  metric: string;
  data: MetricTrendPoint[];
}

export interface CompanyTrendData {
  code: string;
  name: string;
  trends: MetricTrendData[];
}

export interface TrendComparisonResponse {
  companies: CompanyTrendData[];
  period: string;
  years: number;
}

export const getCompanyTrend = async (
  request: TrendComparisonRequest
): Promise<TrendComparisonResponse> => {
  const response = await apiClient.post<TrendComparisonResponse>("/company/trend", request);
  return response.data;
};
