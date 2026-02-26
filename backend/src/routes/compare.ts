import { Router, Request, Response } from 'express';
import { buildProfileResponse } from './profile';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/**
 * GET /api/compare?left=<WCA_ID1>&right=<WCA_ID2>
 * Returns side-by-side profile data (same shape as /api/profile) for both cubers.
 */
router.get('/', (req: Request, res: Response) => {
  const left = (req.query.left as string)?.trim();
  const right = (req.query.right as string)?.trim();

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

  const leftProfile = buildProfileResponse(left, false);
  const rightProfile = buildProfileResponse(right, false);

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
