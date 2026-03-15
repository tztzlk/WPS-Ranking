/**
 * Serves WPS breakdown per event for a cuber from PostgreSQL.
 * Runtime intentionally avoids loading large repo-local cache files into memory.
 */
import { prisma } from '../lib/prisma';
import { EVENT_NAMES } from '../types';

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

export async function getWpsBreakdown(personId: string): Promise<WpsBreakdownResponse | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const row = await prisma.wpsBreakdown.findUnique({
    where: { personId: normalized },
    select: {
      sumEventScores: true,
      maxPossible: true,
      breakdown: true,
    },
  });

  if (!row || !Array.isArray(row.breakdown) || row.breakdown.length === 0) {
    return null;
  }

  const breakdown = row.breakdown as unknown as BreakdownRow[];
  const maxPossible = row.maxPossible > 0 ? row.maxPossible : 1;
  const wps = Math.round((row.sumEventScores / maxPossible) * 100 * 100) / 100;

  const events: WpsBreakdownEventItem[] = [...breakdown]
    .filter((item) => item && typeof item.eventId === 'string')
    .sort((a, b) => b.eventScore - a.eventScore)
    .map((item) => ({
      eventId: item.eventId,
      eventName: EVENT_NAMES[item.eventId] ?? item.eventId,
      weight: Math.round(item.weight * 100) / 100,
      worldRank: item.worldRank,
      eventScore: Math.round(item.eventScore * 100) / 100,
    }));

  if (events.length === 0) {
    return null;
  }

  return {
    personId: normalized,
    events,
    wps,
  };
}
