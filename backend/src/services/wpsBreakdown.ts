/**
 * WPS breakdown per event. The DB stores per-event world ranks and, in meta,
 * the size of each event's field; scores are recomputed here with the same
 * formula as the pipeline (see WPS v2 in types/index.ts).
 */
import { prisma } from '../lib/prisma';
import { EVENT_NAMES, EVENT_WEIGHTS, MAX_WPS_SCORE, eventScore, rankTypeOf, type RankType } from '../types';
import { getMetaValue } from './personDb';

export interface WpsBreakdownEventItem {
  eventId: string;
  eventName: string;
  weight: number;
  /** Which WCA ranking the event uses. */
  rankType: RankType;
  worldRank: number;
  /** People in that ranking of the event. */
  participants: number;
  /** Contribution to WPS in points (all events sum to `wps`). */
  eventScore: number;
}

/**
 * "Where can I gain the most": what WPS would rise by if the cuber reached
 * their own typical level in each event. Typical level = the median of their
 * rank / field-size ratios over the events they have a result in.
 */
export interface WpsPotentialItem {
  eventId: string;
  eventName: string;
  rankType: RankType;
  /** null = no result in this event yet. */
  worldRank: number | null;
  /** World rank at the cuber's typical level. */
  targetRank: number;
  participants: number;
  /** WPS points gained by reaching targetRank. */
  gain: number;
}

export interface WpsBreakdownResponse {
  personId: string;
  events: WpsBreakdownEventItem[];
  wps: number;
  /** Median rank / field size over the cuber's events, e.g. 0.05 = top 5%. */
  typicalShare: number;
  potential: WpsPotentialItem[];
}

const POTENTIAL_LIMIT = 5;
/** Gains below this are rounding noise in a 2-decimal score. */
const MIN_GAIN = 0.01;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computePotential(
  ranks: Record<string, number>,
  participants: Record<string, number>,
): { typicalShare: number; potential: WpsPotentialItem[] } {
  const shares = Object.entries(ranks)
    .filter(([eventId]) => (participants[eventId] ?? 0) > 0)
    .map(([eventId, rank]) => rank / participants[eventId]);
  if (shares.length === 0) return { typicalShare: 1, potential: [] };
  const typicalShare = median(shares);

  const potential = Object.keys(EVENT_WEIGHTS)
    .filter((eventId) => (participants[eventId] ?? 0) > 0)
    .map((eventId) => {
      const n = participants[eventId];
      const weight = EVENT_WEIGHTS[eventId];
      const worldRank = ranks[eventId] ?? null;
      const targetRank = Math.min(n, Math.max(1, Math.ceil(typicalShare * n)));
      const current = worldRank ? eventScore(weight, worldRank, n) : 0;
      const gain = ((eventScore(weight, targetRank, n) - current) / MAX_WPS_SCORE) * 100;
      return {
        eventId,
        eventName: EVENT_NAMES[eventId] ?? eventId,
        rankType: rankTypeOf(eventId),
        worldRank,
        targetRank,
        participants: n,
        gain: round2(gain),
      };
    })
    .filter((p) => p.gain >= MIN_GAIN && (p.worldRank === null || p.targetRank < p.worldRank))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, POTENTIAL_LIMIT);

  return { typicalShare, potential };
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

  const ranks = Object.fromEntries(
    Object.entries(row.eventRanks as Record<string, number>).filter(
      ([eventId, rank]) => eventId in EVENT_WEIGHTS && Number.isInteger(rank) && rank >= 1,
    ),
  );
  const items = Object.entries(ranks)
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
    .sort((a, b) => b.score - a.score);
  if (items.length === 0) return null;

  const total = items.reduce((acc, i) => acc + i.score, 0);
  const { typicalShare, potential } = computePotential(ranks, participants);

  return {
    personId: normalized,
    wps: round2((total / MAX_WPS_SCORE) * 100),
    events: items.map((i) => ({
      eventId: i.eventId,
      eventName: EVENT_NAMES[i.eventId] ?? i.eventId,
      weight: round2(i.weight),
      rankType: rankTypeOf(i.eventId),
      worldRank: i.worldRank,
      participants: i.participants,
      eventScore: round2((i.score / MAX_WPS_SCORE) * 100),
    })),
    typicalShare,
    potential,
  };
}
