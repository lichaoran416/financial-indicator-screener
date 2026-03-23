import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = (data as { message?: string })?.message || error.message;
      
      switch (status) {
        case 400:
          throw new Error(`Bad request: ${message}`);
        case 401:
          throw new Error(`Unauthorized: ${message}`);
        case 403:
          throw new Error(`Forbidden: ${message}`);
        case 404:
          throw new Error(`Not found: ${message}`);
        case 500:
          throw new Error(`Internal server error: ${message}`);
        default:
          throw new Error(`API error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error("Network error: No response from server");
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
);

export default apiClient;
