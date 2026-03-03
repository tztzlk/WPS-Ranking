import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { LeaderboardEntry, WPSProfile, SearchResult, AboutData, ApiResponse, LeaderboardCacheResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1500;

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const retryCount = config?._retryCount ?? 0;

    const isRetryable =
      config &&
      config.method === 'get' &&
      retryCount < MAX_RETRIES &&
      (error.code === 'ECONNABORTED' || error.response?.status === 503);

    if (isRetryable) {
      config._retryCount = retryCount + 1;
      console.log(`Retrying request (${config._retryCount}/${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return api(config);
    }

    if (!error.response) {
      (error as AxiosError & { userMessage?: string }).userMessage = 'Unable to reach server. Please try again.';
    } else if (error.response?.data && typeof (error.response.data as Record<string, unknown>).error === 'string') {
      (error as AxiosError & { userMessage?: string }).userMessage = (error.response.data as Record<string, unknown>).error as string;
    }
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  async getLeaderboard(limit: number = 1000, offset: number = 0): Promise<ApiResponse<LeaderboardEntry>> {
    const response = await api.get('/leaderboard', {
      params: { limit, offset }
    });
    return response.data;
  },

  async getCountries(): Promise<{ iso2: string; name: string }[]> {
    const response = await api.get<{ iso2: string; name: string }[]>('/countries');
    return response.data;
  },

  async getLeaderboardTop100(limit = 100, country?: string): Promise<LeaderboardCacheResponse> {
    const params: { limit: number; country?: string } = { limit };
    if (country && country !== 'ALL') params.country = country;
    const response = await api.get<LeaderboardCacheResponse>('/leaderboard', { params });
    return response.data;
  },

  async getProfile(wcaId: string, includeBreakdown = false): Promise<WPSProfile> {
    const response = await api.get(`/profile/${wcaId}`, {
      params: includeBreakdown ? { includeBreakdown: 1 } : undefined,
    });
    return response.data;
  },

  async searchCubers(query: string, limit: number = 20): Promise<ApiResponse<SearchResult>> {
    const response = await api.get<ApiResponse<SearchResult>>('/search', {
      params: { q: query.trim(), limit },
    });
    return response.data;
  },

  async getCompare(left: string, right: string): Promise<{ left: WPSProfile; right: WPSProfile }> {
    const response = await api.get<{ left: WPSProfile; right: WPSProfile }>('/compare', {
      params: { left, right },
    });
    return response.data;
  },

  async getAbout(): Promise<AboutData> {
    const response = await api.get('/about');
    return response.data;
  },

  async getHealth(): Promise<{ ok: boolean; env: string }> {
    const response = await api.get<{ ok: boolean; env: string }>('/health');
    return response.data;
  }
};
