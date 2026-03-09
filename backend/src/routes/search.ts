import { Router } from 'express';
import { searchPersons } from '../services/personDb';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = ((req.query.wcaId as string) ?? (req.query.q as string))?.trim();
    if (!q) {
      res.status(400).json({ error: 'wcaId or q query parameter is required' });
      return;
    }

    const results = await searchPersons(q, 20);
    console.log(`[db-search] q=${q} results=${results.length}`);
    res.json({ results, source: 'postgres' });
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export { router as searchRoutes };
