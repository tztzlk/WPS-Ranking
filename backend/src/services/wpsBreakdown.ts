/**
 * WPS breakdown per event. The DB stores only per-event world ranks;
 * weights and scores come from EVENT_WEIGHTS (same formula as the pipeline).
 */
import { prisma } from '../lib/prisma';
import { EVENT_NAMES, EVENT_WEIGHTS, MAX_WPS_SCORE, eventScore } from '../types';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getWpsBreakdown(personId: string): Promise<WpsBreakdownResponse | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const row = await prisma.wpsBreakdown.findUnique({ where: { personId: normalized } });
  if (!row || !row.eventRanks || typeof row.eventRanks !== 'object') return null;

  const items = Object.entries(row.eventRanks as Record<string, number>)
    .filter(([eventId, rank]) => eventId in EVENT_WEIGHTS && Number.isInteger(rank) && rank >= 1)
    .map(([eventId, worldRank]) => ({
      eventId,
      weight: EVENT_WEIGHTS[eventId],
      worldRank,
      score: eventScore(EVENT_WEIGHTS[eventId], worldRank),
    }));
  if (items.length === 0) return null;

  const sum = items.reduce((acc, i) => acc + i.score, 0);

  return {
    personId: normalized,
    wps: round2((sum / MAX_WPS_SCORE) * 100),
    events: items
      .sort((a, b) => b.score - a.score)
      .map((i) => ({
        eventId: i.eventId,
        eventName: EVENT_NAMES[i.eventId] ?? i.eventId,
        weight: round2(i.weight),
        worldRank: i.worldRank,
        eventScore: round2(i.score),
      })),
  };
}
