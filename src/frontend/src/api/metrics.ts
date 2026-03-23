import apiClient from "./client";

export interface MetricInfo {
  id: string;
  name: string;
  category: string;
}

export interface MetricsListResponse {
  metrics: MetricInfo[];
}

export const getMetrics = async (): Promise<MetricInfo[]> => {
  const response = await apiClient.get<MetricsListResponse>("/metrics");
  return response.data.metrics;
};
