import axios from 'axios';
import { LeaderboardEntry, WPSProfile, SearchResult, AboutData, ApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Leaderboard
  async getLeaderboard(limit: number = 1000, offset: number = 0): Promise<ApiResponse<LeaderboardEntry>> {
    const response = await api.get('/leaderboard', {
      params: { limit, offset }
    });
    return response.data;
  },

  // Profile
  async getProfile(wcaId: string): Promise<WPSProfile> {
    const response = await api.get(`/profile/${wcaId}`);
    return response.data;
  },

  // Search
  async searchCubers(query: string, limit: number = 20): Promise<ApiResponse<SearchResult>> {
    const response = await api.get('/search', {
      params: { q: query, limit }
    });
    return response.data;
  },

  // About
  async getAbout(): Promise<AboutData> {
    const response = await api.get('/about');
    return response.data;
  },

  // Health check
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  }
};
