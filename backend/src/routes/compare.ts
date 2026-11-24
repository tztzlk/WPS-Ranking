import { Router, Request, Response } from 'express';
import { getProfileByWcaId } from './profile';
import { parseWcaId } from '../services/personDb';
import { asyncRoute } from '../lib/asyncRoute';

const router = Router();

router.get('/', asyncRoute(async (req: Request, res: Response) => {
  const leftRaw = req.query.left ?? req.query.id1;
  const rightRaw = req.query.right ?? req.query.id2;

  if (!leftRaw || !rightRaw) {
    res.status(400).json({ error: 'Query parameters "left" and "right" (WCA IDs) are required' });
    return;
  }
  const left = parseWcaId(leftRaw);
  const right = parseWcaId(rightRaw);
  if (!left) {
    res.status(400).json({ error: 'Invalid "left" WCA ID format' });
    return;
  }
  if (!right) {
    res.status(400).json({ error: 'Invalid "right" WCA ID format' });
    return;
  }

  const [leftProfile, rightProfile] = await Promise.all([
    getProfileByWcaId(left),
    getProfileByWcaId(right),
  ]);

  if (!leftProfile) {
    res.status(404).json({ error: `Person not found: ${left}` });
    return;
  }
  if (!rightProfile) {
    res.status(404).json({ error: `Person not found: ${right}` });
    return;
  }

  res.json({ left: leftProfile, right: rightProfile });
}));

export { router as compareRoutes };
