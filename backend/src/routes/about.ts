import { Router } from 'express';
import { EVENT_WEIGHTS } from '../types';

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
      description: 'WPS calculates a weighted score based on performance across all WCA events',
      calculation: 'Each event score = weight × (1 / log(world_rank + 1)) × 10',
      normalization: 'Final WPS score = (sum of event scores / max possible score) × 100'
    },
    philosophy: {
      fairness: 'Balances all events to prevent specialization bias',
      versatility: 'Rewards cubers who perform well across multiple disciplines',
      transparency: 'Open formula with clear event weights'
    },
    eventWeights: EVENT_WEIGHTS,
    maxScore: Object.values(EVENT_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
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
