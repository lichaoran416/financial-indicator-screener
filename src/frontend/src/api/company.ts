import apiClient from "./client";

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
