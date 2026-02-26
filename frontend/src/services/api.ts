import axios from 'axios';
import { LeaderboardEntry, WPSProfile, SearchResult, AboutData, ApiResponse, LeaderboardCacheResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Request interceptor for logging
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      (error as Error & { userMessage?: string }).userMessage = 'Unable to reach server. Please try again.';
    } else if (error.response?.data?.error && typeof error.response.data.error === 'string') {
      (error as Error & { userMessage?: string }).userMessage = error.response.data.error;
    }
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Leaderboard (paginated from DB - may not be implemented on backend)
  async getLeaderboard(limit: number = 1000, offset: number = 0): Promise<ApiResponse<LeaderboardEntry>> {
    const response = await api.get('/leaderboard', {
      params: { limit, offset }
    });
    return response.data;
  },

  /** All countries in the dataset (for filter dropdown). */
  async getCountries(): Promise<{ iso2: string; name: string }[]> {
    const response = await api.get<{ iso2: string; name: string }[]>('/countries');
    return response.data;
  },

  /** Cached leaderboard: global top-100 or country top-N. */
  async getLeaderboardTop100(limit = 100, country?: string): Promise<LeaderboardCacheResponse> {
    const params: { limit: number; country?: string } = { limit };
    if (country && country !== 'ALL') params.country = country;
    const response = await api.get<LeaderboardCacheResponse>('/leaderboard', { params });
    return response.data;
  },

  // Profile (includeBreakdown=1 for calculation + per-event breakdown; default false to avoid loading breakdown until requested)
  async getProfile(wcaId: string, includeBreakdown = false): Promise<WPSProfile> {
    const response = await api.get(`/profile/${wcaId}`, {
      params: includeBreakdown ? { includeBreakdown: 1 } : undefined,
    });
    return response.data;
  },

  // Search: GET /api/search?q=<query> (backend expects q or wcaId; returns { results: SearchResult[] })
  async searchCubers(query: string, limit: number = 20): Promise<ApiResponse<SearchResult>> {
    const response = await api.get<ApiResponse<SearchResult>>('/search', {
      params: { q: query.trim(), limit },
    });
    return response.data;
  },

  // Compare: GET /api/compare?left=WCA_ID&right=WCA_ID
  async getCompare(left: string, right: string): Promise<{ left: WPSProfile; right: WPSProfile }> {
    const response = await api.get<{ left: WPSProfile; right: WPSProfile }>('/compare', {
      params: { left, right },
    });
    return response.data;
  },

  // About
  async getAbout(): Promise<AboutData> {
    const response = await api.get('/about');
    return response.data;
  },

  // Health check
  async getHealth(): Promise<{ ok: boolean; env: string }> {
    const response = await api.get<{ ok: boolean; env: string }>('/health');
    return response.data;
  }
};
