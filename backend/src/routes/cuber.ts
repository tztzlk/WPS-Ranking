import { Router } from 'express';
import { parseWcaId } from '../services/personDb';
import { getWpsBreakdown } from '../services/wpsBreakdown';
import { asyncRoute } from '../lib/asyncRoute';

const router = Router();

router.get('/:id/wps-breakdown', asyncRoute(async (req, res) => {
  const id = parseWcaId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }

  const breakdown = await getWpsBreakdown(id);
  if (!breakdown) {
    res.status(404).json({ error: 'WPS breakdown not found for this cuber' });
    return;
  }

  res.json(breakdown);
}));

export { router as cuberRoutes };
