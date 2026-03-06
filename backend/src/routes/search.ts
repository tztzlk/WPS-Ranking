import { Router } from 'express';
import { searchPersons } from '../services/personDb';
import type { SearchResultItem } from '../types';

const router = Router();

router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    const q = ((req.query.wcaId as string) ?? (req.query.q as string))?.trim();
    if (!q) {
      res.status(400).json({ error: 'wcaId or q query parameter is required' });
      return;
    }

    const results: SearchResultItem[] = await searchPersons(q, 20);
    res.json(results);
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ error: 'Search failed' });
  } finally {
    console.log(`[search] ${Date.now() - start}ms`);
  }
});

export { router as searchRoutes };
