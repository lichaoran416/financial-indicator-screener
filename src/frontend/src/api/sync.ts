import apiClient from "./client";

export interface SyncTriggerRequest {
  sync_type: "financial" | "basic" | "industry" | "all";
  industry_sw_three?: string;
}

export interface SyncTriggerResponse {
  status: string;
  task_id: string;
  message?: string;
}

export interface SyncStatusHistory {
  id: number;
  task_id: string;
  sync_type: string;
  status: string;
  industry_sw_three?: string;
  started_at: string;
  finished_at?: string;
  total_count: number;
  processed_count: number;
  failed_count: number;
  failed_codes?: string;
  error_message?: string;
}

export interface IndustrySyncStatus {
  id: number;
  industry_sw_three: string;
  industry_sw_three_code?: string;
  sync_type: string;
  last_sync_at?: string;
  record_count: number;
}

export interface SyncStatusResponse {
  tasks: SyncStatusHistory[];
  industries: IndustrySyncStatus[];
  total_tasks: number;
}

export async function triggerSync(request: SyncTriggerRequest): Promise<SyncTriggerResponse> {
  const response = await apiClient.post<SyncTriggerResponse>("/sync/trigger", request);
  return response.data;
}

export async function getSyncStatus(industry_sw_three?: string): Promise<SyncStatusResponse> {
  const params = industry_sw_three ? { industry_sw_three } : {};
  const response = await apiClient.get<SyncStatusResponse>("/sync/status", { params });
  return response.data;
}
