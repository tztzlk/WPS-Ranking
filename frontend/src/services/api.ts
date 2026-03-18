import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import {
  WPSProfile,
  SearchResult,
  AboutData,
  LeaderboardCacheResponse,
  WpsBreakdownResponse,
  ProfileHistoryItem,
  LeaderboardPageResponse,
  CountryListItem,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1500;
const COUNTRIES_CACHE_TTL_MS = 10 * 60 * 1000;

interface RetryableConfig extends AxiosRequestConfig {
  _retryCount?: number;
  _disableRetry?: boolean;
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

let countriesCache:
  | {
      value: CountryListItem[];
      expiresAt: number;
    }
  | null = null;
let countriesRequest: Promise<CountryListItem[]> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const retryCount = config?._retryCount ?? 0;

    const isRetryable =
      config &&
      !config._disableRetry &&
      config.method === 'get' &&
      retryCount < MAX_RETRIES &&
      (error.code === 'ECONNABORTED' || error.response?.status === 503);

    if (isRetryable) {
      config._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return api(config);
    }

    if (!error.response) {
      (error as AxiosError & { userMessage?: string }).userMessage =
        "We couldn't load the latest data just now. Please try again.";
    } else if (error.response?.data && typeof (error.response.data as Record<string, unknown>).error === 'string') {
      (error as AxiosError & { userMessage?: string }).userMessage = (error.response.data as Record<string, unknown>).error as string;
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async getCountries(): Promise<{ iso2: string; name: string }[]> {
    if (countriesCache && countriesCache.expiresAt > Date.now()) {
      return countriesCache.value;
    }

    if (!countriesRequest) {
      countriesRequest = api.get<CountryListItem[]>('/countries').then((response) => {
        countriesCache = {
          value: response.data,
          expiresAt: Date.now() + COUNTRIES_CACHE_TTL_MS,
        };
        countriesRequest = null;
        return response.data;
      }).catch((error) => {
        countriesRequest = null;
        throw error;
      });
    }

    return countriesRequest;
  },

  async getLeaderboardTop100(limit = 100, country?: string): Promise<LeaderboardCacheResponse> {
    const params: { limit: number; country?: string } = { limit };
    if (country && country !== 'ALL') params.country = country;
    const config: RetryableConfig = {
      params,
      _disableRetry: true,
    };
    const response = await api.get<LeaderboardCacheResponse>('/leaderboard', config);
    return response.data;
  },

  async getLeaderboardPageData(limit = 100, country?: string): Promise<LeaderboardPageResponse> {
    const params: { limit: number; country?: string } = { limit };
    if (country && country !== 'ALL') params.country = country;
    const config: RetryableConfig = {
      params,
      _disableRetry: true,
    };
    const response = await api.get<LeaderboardPageResponse>('/leaderboard/page', config);

    countriesCache = {
      value: response.data.countries,
      expiresAt: Date.now() + COUNTRIES_CACHE_TTL_MS,
    };

    return response.data;
  },

  async getProfile(wcaId: string): Promise<WPSProfile> {
    const response = await api.get<WPSProfile>(`/profile/${wcaId}`);
    return response.data;
  },

  async searchCubers(query: string, limit: number = 20, signal?: AbortSignal): Promise<SearchResult[]> {
    const trimmed = query.trim();
    const isWcaId = /^\d{4}[A-Z]{4}\d{2}$/.test(trimmed);
    const params: Record<string, string | number> = isWcaId
      ? { wcaId: trimmed, limit }
      : { q: trimmed, limit };
    const response = await api.get<{ results: SearchResult[] }>('/search', { params, signal });
    return response.data.results;
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

  async getWpsBreakdown(wcaId: string): Promise<WpsBreakdownResponse> {
    const response = await api.get<WpsBreakdownResponse>(`/cuber/${encodeURIComponent(wcaId)}/wps-breakdown`);
    return response.data;
  },

  async getProfileHistory(wcaId: string): Promise<ProfileHistoryItem[]> {
    const response = await api.get<{ history: ProfileHistoryItem[] }>(`/profile/${encodeURIComponent(wcaId)}/history`);
    return response.data.history;
  },

  async getHealth(): Promise<{ ok: boolean; env: string }> {
    const response = await api.get<{ ok: boolean; env: string }>('/health');
    return response.data;
  }
};
