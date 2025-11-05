import axios from 'axios';
import { WCAEvent, WCAPerson, WCARecord } from '../types';

export class WCAAPIService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.WCA_API_BASE_URL || 'https://www.worldcubeassociation.org/api/v0';
  }

  async getEvents(): Promise<WCAEvent[]> {
    try {
      const response = await axios.get(`${this.baseURL}/events`);
      return response.data;
    } catch (error) {
      console.error('Error fetching WCA events:', error);
      throw new Error('Failed to fetch WCA events');
    }
  }

  async getPerson(wcaId: string): Promise<WCAPerson | null> {
    try {
      const response = await axios.get(`${this.baseURL}/persons/${wcaId}`);
      return response.data.person;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching person ${wcaId}:`, error);
      throw new Error(`Failed to fetch person ${wcaId}`);
    }
  }

  async searchPersons(query: string, limit: number = 10): Promise<WCAPerson[]> {
    try {
      const response = await axios.get(`${this.baseURL}/search/persons`, {
        params: { q: query, limit }
      });
      return response.data.result;
    } catch (error) {
      console.error('Error searching persons:', error);
      throw new Error('Failed to search persons');
    }
  }

  async getRankings(eventId: string, type: 'single' | 'average' = 'average', limit: number = 1000): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/rankings/${eventId}/${type}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching rankings for ${eventId}:`, error);
      throw new Error(`Failed to fetch rankings for ${eventId}`);
    }
  }

  async getRecords(eventId: string, type: 'single' | 'average' = 'average'): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/records/${eventId}/${type}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching records for ${eventId}:`, error);
      throw new Error(`Failed to fetch records for ${eventId}`);
    }
  }
}
