import { Router } from 'express';
import { isValidWCAId } from '../services/personDb';
import { getWpsBreakdown } from '../services/wpsBreakdown';

const router = Router();

router.get('/:id/wps-breakdown', async (req, res) => {
  const id = req.params.id?.trim();
  if (!id || !isValidWCAId(id)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }

  const breakdown = getWpsBreakdown(id);
  if (!breakdown) {
    res.status(404).json({ error: 'WPS breakdown not found for this cuber' });
    return;
  }

  res.json(breakdown);
});

export { router as cuberRoutes };
