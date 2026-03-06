import { Router, Request, Response } from 'express';
import { getProfileByWcaId } from './profile';
import { isValidWCAId } from '../services/personDb';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const left = ((req.query.left ?? req.query.id1) as string)?.trim();
  const right = ((req.query.right ?? req.query.id2) as string)?.trim();

  if (!left || !right) {
    res.status(400).json({ error: 'Query parameters "left" and "right" (WCA IDs) are required' });
    return;
  }
  if (!isValidWCAId(left)) {
    res.status(400).json({ error: 'Invalid "left" WCA ID format' });
    return;
  }
  if (!isValidWCAId(right)) {
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
});

export { router as compareRoutes };
