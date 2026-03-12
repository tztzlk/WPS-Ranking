/**
 * Serves WPS breakdown per event for a cuber (for profile transparency).
 * Reads from the precomputed cache file written by the leaderboard pipeline.
 */
import path from 'path';
import fs from 'fs';
import { EVENT_NAMES } from '../types';

const CACHE_DIR = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(process.cwd(), 'cache');
const WPS_BREAKDOWN_PATH = path.join(CACHE_DIR, 'wps.breakdown.json');

export interface WpsBreakdownEventItem {
  eventId: string;
  eventName: string;
  weight: number;
  worldRank: number;
  eventScore: number;
}

export interface WpsBreakdownResponse {
  personId: string;
  events: WpsBreakdownEventItem[];
  wps: number;
}

interface BreakdownRow {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
}

interface PersonWPSBreakdown {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: BreakdownRow[];
}

type BreakdownIndex = Record<string, PersonWPSBreakdown>;

let breakdownCache: BreakdownIndex | null = null;

function loadBreakdownIndex(): BreakdownIndex | null {
  if (breakdownCache !== null) return breakdownCache;
  if (!fs.existsSync(WPS_BREAKDOWN_PATH)) return null;
  try {
    const raw = fs.readFileSync(WPS_BREAKDOWN_PATH, 'utf8');
    breakdownCache = JSON.parse(raw) as BreakdownIndex;
    return breakdownCache;
  } catch {
    return null;
  }
}

/**
 * Returns WPS breakdown per event for a given cuber.
 * Events are sorted by contribution (eventScore) descending.
 * Only includes events where the cuber has a rank.
 */
export function getWpsBreakdown(personId: string): WpsBreakdownResponse | null {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const index = loadBreakdownIndex();
  if (!index) return null;

  const data = index[normalized];
  if (!data || !Array.isArray(data.breakdown) || data.breakdown.length === 0) return null;

  const maxPossible = data.maxPossible > 0 ? data.maxPossible : 1;
  const wps = Math.round((data.sumEventScores / maxPossible) * 100 * 100) / 100;

  const events: WpsBreakdownEventItem[] = [...data.breakdown]
    .sort((a, b) => b.eventScore - a.eventScore)
    .map((row) => ({
      eventId: row.eventId,
      eventName: EVENT_NAMES[row.eventId] ?? row.eventId,
      weight: Math.round(row.weight * 100) / 100,
      worldRank: row.worldRank,
      eventScore: Math.round(row.eventScore * 100) / 100,
    }));

  return {
    personId: normalized,
    events,
    wps,
  };
}
