import { Router } from 'express';
import { searchPlaces } from '../controllers/placesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchPlaces);

export default router;
