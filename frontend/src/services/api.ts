import i18n from '../i18n';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import {
  WPSProfile,
  SearchResult,
  AboutData,
  LeaderboardCacheResponse,
  WpsBreakdownResponse,
  ProfileHistoryItem,
  CountryListItem,
  CountryRankingResponse,
} from '../types';

/** Leaderboard scope: the world, a continent (AF, AS, EU, NA, OC, SA) or a country (ISO2). */
export type LeaderboardRegion = { continent: string } | { country: string } | null;

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

    // Only network failures get a ready message. API error texts are English, so pages
    // map the HTTP status (error.response.status) to their own translated message.
    if (!error.response && !axios.isCancel(error)) {
      (error as AxiosError & { userMessage?: string }).userMessage = i18n.t('errors.network');
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

  async getLeaderboardTop100(
    limit = 100,
    region: LeaderboardRegion = null,
    signal?: AbortSignal,
  ): Promise<LeaderboardCacheResponse> {
    const params = { limit, ...(region ?? {}) };
    const config: RetryableConfig = {
      params,
      signal,
      _disableRetry: true,
    };
    const response = await api.get<LeaderboardCacheResponse>('/leaderboard', config);
    return response.data;
  },

  async getCountryRanking(): Promise<CountryRankingResponse> {
    const response = await api.get<CountryRankingResponse>('/countries/ranking');
    return response.data;
  },

  async getProfile(wcaId: string, signal?: AbortSignal): Promise<WPSProfile> {
    const response = await api.get<WPSProfile>(`/profile/${encodeURIComponent(wcaId)}`, { signal });
    return response.data;
  },

  async searchCubers(query: string, limit: number = 20, signal?: AbortSignal): Promise<SearchResult[]> {
    const trimmed = query.trim();
    const isWcaId = /^\d{4}[A-Z]{4}\d{2}$/.test(trimmed.toUpperCase());
    const params: Record<string, string | number> = isWcaId
      ? { wcaId: trimmed.toUpperCase(), limit }
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
};
