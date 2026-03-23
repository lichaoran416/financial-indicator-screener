import apiClient from "./client";

export type Period = "annual" | "quarterly" | "ttm";
export type SortOrder = "asc" | "desc";

export interface Condition {
  metric: string;
  operator: string;
  value: number;
  period?: Period;
  years?: number;
}

export interface ScreenRequest {
  conditions: Condition[];
  sort_by?: string;
  order?: SortOrder;
  limit?: number;
  page?: number;
  industry?: string;
  exclude_industry?: string;
  include_suspended?: boolean;
  profit_only?: boolean;
  include_st?: boolean;
  require_complete_data?: boolean;
}

export interface CompanyInfo {
  code: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "DELISTED";
  risk_flag: "NORMAL" | "ST" | "STAR_ST" | "DELISTING_RISK";
  industry?: string;
}

export interface ScreenResponse {
  companies: CompanyInfo[];
  total: number;
}

export interface SaveScreenRequest {
  name: string;
  conditions: Condition[];
}

export interface SavedScreen {
  id: string;
  name: string;
  conditions: Condition[];
  created_at: string;
}

export const screenCompanies = async (request: ScreenRequest): Promise<ScreenResponse> => {
  const response = await apiClient.post<ScreenResponse>("/screen", request);
  return response.data;
};

export const saveScreen = async (request: SaveScreenRequest): Promise<SavedScreen> => {
  const response = await apiClient.post<SavedScreen>("/screen/save", request);
  return response.data;
};

export const getSavedScreens = async (): Promise<SavedScreen[]> => {
  const response = await apiClient.get<SavedScreen[]>("/screen/saved");
  return response.data;
};

export const deleteSavedScreen = async (screenId: string): Promise<boolean> => {
  const response = await apiClient.delete<{ deleted: boolean }>(`/screen/saved/${screenId}`);
  return response.data.deleted;
};
