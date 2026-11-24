import { Router } from 'express';
import { searchPersons } from '../services/personDb';

const router = Router();

// Shorter queries match most of the ~300k persons; longer ones are not names.
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 64;

router.get('/', async (req, res) => {
  try {
    const raw = req.query.wcaId ?? req.query.q;
    const q = typeof raw === 'string' ? raw.trim() : '';
    if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
      res.status(400).json({
        error: `q must be a single ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} character query parameter`,
      });
      return;
    }

    const parsed = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN;
    const limit = Math.min(Math.max(1, Number.isNaN(parsed) ? 20 : parsed), 50);
    const results = await searchPersons(q, limit);
    console.log(`[db-search] q=${q} results=${results.length}`);
    res.json({ results, source: 'postgres' });
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export { router as searchRoutes };
