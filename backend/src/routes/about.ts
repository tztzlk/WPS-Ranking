import { Router } from 'express';
import { EVENT_WEIGHTS, MAX_WPS_SCORE } from '../types';

const router = Router();

/**
 * GET /api/about
 * Get information about WPS formula and philosophy
 */
router.get('/', (req, res) => {
  const aboutData = {
    title: 'About WPS Ranking',
    description: 'Weighted Performance Scale - A fair ranking system for speedcubers',
    formula: {
      description: 'WPS measures your current all-around competitive strength using official WCA world rankings.',
      calculation: 'Each event score = weight × (1 / log(world_rank + 1)) × 10',
      normalization: 'Final WPS score = (sum of event scores / max possible score) × 100',
      intro: 'WPS measures your current all-around competitive strength using official WCA world rankings.',
      steps: [
        'Each event contributes a score based on your world ranking in that event.',
        'Higher ranks (e.g. top 10) contribute more to your score; lower ranks contribute less.',
        'Scores from all events are combined and then normalized to a 0–100 scale.'
      ],
      formulaBlock: 'eventScore = weight × (1 / log(worldRank + 1)) × 10\n\nWPS = (sum of event scores / maxPossibleScore) × 100',
      variables: [
        { label: 'worldRank', meaning: 'Your official WCA world rank in that event' },
        { label: 'weight', meaning: 'Event weight (based on popularity and difficulty)' },
        { label: 'maxPossibleScore', meaning: 'Theoretical maximum sum if you were rank 1 in every event (normalization factor)' }
      ],
      credits: 'The idea for a weighted all-around ranking was inspired by the YouTuber STUCUBE. We thank him for the original concept. The formula used on this site has been further modified and adapted for our ranking system.'
    },
    philosophy: {
      fairness: 'Balances all events to prevent specialization bias',
      versatility: 'Rewards cubers who perform well across multiple disciplines',
      transparency: 'Open formula with clear event weights'
    },
    eventWeights: EVENT_WEIGHTS,
    maxScore: MAX_WPS_SCORE,
    features: [
      'Global leaderboard of top 1000 speedcubers',
      'Fair weighting system based on event popularity and difficulty',
      'Real-time updates from official WCA data',
      'Search by name, WCA ID, or country',
      'Detailed profile views with per-event breakdowns'
    ],
    benefits: [
      'Recognizes all-rounders who excel in multiple events',
      'Provides fair comparison between cubers of different specialties',
      'Encourages participation in diverse events',
      'Creates new competitive opportunities and recognition'
    ]
  };

  res.json(aboutData);
});

export { router as aboutRoutes };
