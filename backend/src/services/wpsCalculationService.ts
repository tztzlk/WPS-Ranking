import { WCAPerson, EVENT_WEIGHTS, MAX_WPS_SCORE } from '../types';

export interface WPSBreakdownItem {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
}

export interface WPSBreakdown {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: WPSBreakdownItem[];
}

export class WPSCalculationService {
  /**
   * Calculate WPS score for a person based on their WCA records
   */
  calculateWPSScore(person: WCAPerson): number {
    let totalScore = 0;
    let eventsParticipated = 0;

    for (const [eventId, weight] of Object.entries(EVENT_WEIGHTS)) {
      const record = person.personalRecords[eventId];
      if (record && record.average && record.worldRank) {
        // Calculate normalized score for this event
        const eventScore = this.calculateEventScore(record.worldRank, weight);
        totalScore += eventScore;
        eventsParticipated++;
      }
    }

    // Return normalized WPS score (0-100)
    return eventsParticipated > 0 ? (totalScore / MAX_WPS_SCORE) * 100 : 0;
  }

  /**
   * Calculate individual event score based on world rank and event weight
   */
  private calculateEventScore(worldRank: number, weight: number): number {
    // Use logarithmic scaling to prevent top ranks from dominating
    // Formula: weight * (1 / log(rank + 1)) * 10
    const logScore = 1 / Math.log(worldRank + 1);
    return weight * logScore * 10;
  }

  /**
   * Calculate event-specific scores for a person
   */
  calculateEventScores(person: WCAPerson): Record<string, number> {
    const eventScores: Record<string, number> = {};

    for (const [eventId, weight] of Object.entries(EVENT_WEIGHTS)) {
      const record = person.personalRecords[eventId];
      if (record && record.average && record.worldRank) {
        eventScores[eventId] = this.calculateEventScore(record.worldRank, weight);
      } else {
        eventScores[eventId] = 0;
      }
    }

    return eventScores;
  }

  /**
   * Get event ranks for a person
   */
  getEventRanks(person: WCAPerson): Record<string, number> {
    const eventRanks: Record<string, number> = {};

    for (const eventId of Object.keys(EVENT_WEIGHTS)) {
      const record = person.personalRecords[eventId];
      if (record && record.worldRank) {
        eventRanks[eventId] = record.worldRank;
      } else {
        eventRanks[eventId] = 0;
      }
    }

    return eventRanks;
  }

  /**
   * Count total events participated in
   */
  getTotalEvents(person: WCAPerson): number {
    let count = 0;
    for (const record of Object.values(person.personalRecords)) {
      if (record && record.average) {
        count++;
      }
    }
    return count;
  }

  /**
   * Return full WPS calculation breakdown for transparency.
   * Matches formula: EventScore(e) = w_e × (1/ln(R_e+1)) × 10, WPS = (Σ/MAX)×100.
   */
  getWPSBreakdown(person: WCAPerson): WPSBreakdown {
    const breakdown: WPSBreakdownItem[] = [];
    let sumEventScores = 0;

    for (const [eventId, weight] of Object.entries(EVENT_WEIGHTS)) {
      const record = person.personalRecords[eventId];
      if (record && record.average && record.worldRank) {
        const eventScore = this.calculateEventScore(record.worldRank, weight);
        sumEventScores += eventScore;
        breakdown.push({
          eventId,
          worldRank: record.worldRank,
          weight,
          eventScore,
        });
      }
    }

    return {
      sumEventScores,
      maxPossible: MAX_WPS_SCORE,
      eventsParticipated: breakdown.length,
      breakdown,
    };
  }
}






