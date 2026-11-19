/**
 * WPS breakdown per event. The DB stores per-event world ranks and, in meta,
 * the size of each event's field; scores are recomputed here with the same
 * formula as the pipeline (see WPS v2 in types/index.ts).
 */
import { prisma } from '../lib/prisma';
import { EVENT_NAMES, EVENT_WEIGHTS, MAX_WPS_SCORE, WPS_TOP_EVENTS, eventScore } from '../types';
import { getMetaValue } from './personDb';

export interface WpsBreakdownEventItem {
  eventId: string;
  eventName: string;
  weight: number;
  worldRank: number;
  /** People with an average in this event. */
  participants: number;
  /** Contribution to WPS in points (counted events sum to `wps`). */
  eventScore: number;
  /** Whether the event is among the person's WPS_TOP_EVENTS best. */
  counted: boolean;
}

export interface WpsBreakdownResponse {
  personId: string;
  events: WpsBreakdownEventItem[];
  wps: number;
  topEvents: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function getEventParticipants(): Promise<Record<string, number>> {
  const raw = await getMetaValue('eventParticipants');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function getWpsBreakdown(personId: string): Promise<WpsBreakdownResponse | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const [row, participants] = await Promise.all([
    prisma.wpsBreakdown.findUnique({ where: { personId: normalized } }),
    getEventParticipants(),
  ]);
  if (!row || !row.eventRanks || typeof row.eventRanks !== 'object') return null;

  const items = Object.entries(row.eventRanks as Record<string, number>)
    .filter(([eventId, rank]) => eventId in EVENT_WEIGHTS && Number.isInteger(rank) && rank >= 1)
    .map(([eventId, worldRank]) => {
      const n = participants[eventId] ?? 0;
      return {
        eventId,
        weight: EVENT_WEIGHTS[eventId],
        worldRank,
        participants: n,
        score: eventScore(EVENT_WEIGHTS[eventId], worldRank, n),
      };
    })
    // Same order as the pipeline: score desc, then event id.
    .sort((a, b) => b.score - a.score || (a.eventId < b.eventId ? -1 : 1));
  if (items.length === 0) return null;

  const total = items.slice(0, WPS_TOP_EVENTS).reduce((acc, i) => acc + i.score, 0);

  return {
    personId: normalized,
    wps: round2((total / MAX_WPS_SCORE) * 100),
    topEvents: WPS_TOP_EVENTS,
    events: items.map((i, idx) => ({
      eventId: i.eventId,
      eventName: EVENT_NAMES[i.eventId] ?? i.eventId,
      weight: round2(i.weight),
      worldRank: i.worldRank,
      participants: i.participants,
      eventScore: round2((i.score / MAX_WPS_SCORE) * 100),
      counted: idx < WPS_TOP_EVENTS,
    })),
  };
}
