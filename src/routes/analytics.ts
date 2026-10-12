import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getAnalyticsSummary);

export default router;
