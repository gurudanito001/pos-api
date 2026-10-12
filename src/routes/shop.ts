import { Router } from 'express';
import {
  getShopProfile,
  updateShopProfile,
  updatePreferences,
} from '../controllers/shopController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getShopProfile);
router.put('/profile', updateShopProfile);
router.patch('/preferences', updatePreferences);

export default router;
