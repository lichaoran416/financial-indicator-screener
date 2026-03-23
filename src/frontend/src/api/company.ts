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
