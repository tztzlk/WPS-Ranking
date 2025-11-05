import { Router } from 'express';
import { WCAAPIService } from '../services/wcaApiService';
import { WPSCalculationService } from '../services/wpsCalculationService';
import { WPSProfile } from '../types';

const router = Router();
const wcaService = new WCAAPIService();
const wpsService = new WPSCalculationService();

/**
 * GET /api/profile/:wcaId
 * Get detailed profile for a specific cuber
 */
router.get('/:wcaId', async (req, res) => {
  try {
    const { wcaId } = req.params;
    
    // Validate WCA ID format
    if (!isValidWCAId(wcaId)) {
      return res.status(400).json({ error: 'Invalid WCA ID format' });
    }

    // Fetch person data from WCA API
    const person = await wcaService.getPerson(wcaId);
    if (!person) {
      return res.status(404).json({ error: 'Cuber not found' });
    }

    // Calculate WPS score and related data
    const wpsScore = wpsService.calculateWPSScore(person);
    const eventScores = wpsService.calculateEventScores(person);
    const eventRanks = wpsService.getEventRanks(person);
    const totalEvents = wpsService.getTotalEvents(person);

    // TODO: Calculate global rank (would need full leaderboard)
    const globalRank = 0; // Placeholder

    const profile: WPSProfile = {
      wcaId: person.id,
      name: person.name,
      country: person.countryId,
      wpsScore,
      globalRank,
      eventScores,
      eventRanks,
      totalEvents,
      lastUpdated: new Date().toISOString()
    };

    res.json(profile);
  } catch (error) {
    console.error(`Error fetching profile for ${req.params.wcaId}:`, error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Validate WCA ID format (e.g., 2019SMIT01)
 */
function isValidWCAId(wcaId: string): boolean {
  const wcaIdRegex = /^\d{4}[A-Z]{4}\d{2}$/;
  return wcaIdRegex.test(wcaId);
}

export { router as profileRoutes };
