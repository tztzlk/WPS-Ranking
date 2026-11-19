import { Router } from 'express';
import { EVENT_WEIGHTS, MAX_WPS_SCORE, WPS_TOP_EVENTS } from '../types';

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
      description: 'WPS measures overall competitive strength using official WCA world rankings.',
      calculation: 'Each event score = weight × (1 − ln(worldRank) / ln(participants + 1))',
      normalization: `WPS = sum of your ${WPS_TOP_EVENTS} best event scores / maximum possible × 100`,
      intro: 'WPS measures overall competitive strength using official WCA world rankings.',
      steps: [
        'Each event is scored by how high you rank relative to everyone who has an average in it: world #1 gets the full event weight, last place gets nothing.',
        `Only your ${WPS_TOP_EVENTS} best events count, so WPS rewards being strong, not the number of events you have tried.`,
        'The result is scaled to 0–100, where 100 means world #1 in the five highest-weighted events.'
      ],
      formulaBlock: `eventScore = weight × (1 − ln(worldRank) / ln(participants + 1))\n\nWPS = (sum of best ${WPS_TOP_EVENTS} event scores / maxPossibleScore) × 100`,
      variables: [
        { label: 'worldRank', meaning: 'Your official WCA world rank by average in that event' },
        { label: 'participants', meaning: 'How many people have an official average in that event' },
        { label: 'weight', meaning: 'Event weight, ordered by how many people compete in the event' },
        { label: 'maxPossibleScore', meaning: `Sum of the ${WPS_TOP_EVENTS} highest event weights (world #1 in each of them)` }
      ],
      credits: 'The idea for a weighted all-around ranking was inspired by the YouTuber STUCUBE. We thank him for the original concept. The formula used on this site has been further modified and adapted for our ranking system.'
    },
    philosophy: {
      fairness: 'Ranks are compared within each event and scaled by the size of its field',
      versatility: `Your ${WPS_TOP_EVENTS} best events count, so one event alone is not enough`,
      transparency: 'Open formula with clear event weights'
    },
    eventWeights: EVENT_WEIGHTS,
    maxScore: MAX_WPS_SCORE,
    features: [
      'Global and country leaderboards for every ranked speedcuber',
      'Event weights based on how many people compete in each event',
      'Daily updates from the official WCA export',
      'Search by name, WCA ID, or country',
      'Detailed profile views with per-event breakdowns'
    ],
    benefits: [
      'Recognizes cubers who are strong across several events',
      'Compares ranks fairly between big and small events',
      'Does not reward entering events just to collect points',
      'Creates new competitive opportunities and recognition'
    ]
  };

  res.json(aboutData);
});

export { router as aboutRoutes };
