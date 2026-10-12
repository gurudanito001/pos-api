import { Router } from 'express';
import { upgradeSubscription } from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/upgrade', upgradeSubscription);

export default router;
