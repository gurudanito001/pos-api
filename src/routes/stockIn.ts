import { Router } from 'express';
import {
  getStockInSummary,
  submitStockIn,
  editPurchaseEntry,
} from '../controllers/stockInController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getStockInSummary);
router.post('/', handleIdempotency, submitStockIn);
router.put('/entries/:id', handleIdempotency, editPurchaseEntry);

export default router;
