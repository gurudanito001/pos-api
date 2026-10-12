import { Router } from 'express';
import { processBatchSync } from '../controllers/syncController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/batch', processBatchSync);

export default router;
