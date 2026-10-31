import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";

export const API_URL_KEY = "@eworks_api_base_url";
export const ACCESS_TOKEN_KEY = "@eworks_access_token";
export const REFRESH_TOKEN_KEY = "@eworks_refresh_token";

export const apiClient = axios.create({
  baseURL: ENV.DEFAULT_API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true",
  },
});

// Configure baseURL dynamically from AsyncStorage if set by user
export async function updateApiBaseUrl(newBaseUrl: string) {
  await AsyncStorage.setItem(API_URL_KEY, newBaseUrl);
  apiClient.defaults.baseURL = newBaseUrl;
}

export async function getApiBaseUrl(): Promise<string> {
  const custom = await AsyncStorage.getItem(API_URL_KEY);
  return custom || ENV.DEFAULT_API_BASE_URL;
}

// Request interceptor: attach JWT access token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Ensure custom baseURL is applied if available
      const customUrl = await AsyncStorage.getItem(API_URL_KEY);
      if (customUrl && config.baseURL !== customUrl) {
        config.baseURL = customUrl;
      }

      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Storage access error
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh expired JWT token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          isRefreshing = false;
          return Promise.reject(error);
        }

        const baseUrl = await getApiBaseUrl();
        const { data } = await axios.post(`${baseUrl}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError, null);
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Normalizes DRF paginated responses ({ count, results: [...] }) or bare arrays ([...]).
 */
export function unwrapResults<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export function formatApiError(err: any): string {
  if (!err?.response) {
    return "Cannot connect to Eworks backend server. Please verify backend is running.";
  }
  const data = err.response.data;
  if (!data) return "An unexpected error occurred.";
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "Validation error. Please check your inputs.";
}

