import apiClient from "./client";

export interface RawAccountingItem {
  name: string;
  report_type: string;
  category?: string;
}

export interface DerivedMetric {
  id: string;
  name: string;
  category: string;
  formula?: string;
}

export interface MetricsListResponse {
  derived_metrics: DerivedMetric[];
  raw_items: RawAccountingItem[];
}

export const getAccountingItems = async (
  reportType?: string
): Promise<RawAccountingItem[]> => {
  const response = await apiClient.get<MetricsListResponse>("/metrics");
  const rawItems = response.data.raw_items;
  
  if (reportType) {
    return rawItems.filter(item => item.report_type === reportType);
  }
  
  return rawItems;
};

export const getMetrics = async (): Promise<MetricsListResponse> => {
  const response = await apiClient.get<MetricsListResponse>("/metrics");
  return response.data;
};