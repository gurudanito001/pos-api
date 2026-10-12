import { Router } from 'express';
import { searchCatalog } from '../controllers/catalogController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchCatalog);

export default router;
