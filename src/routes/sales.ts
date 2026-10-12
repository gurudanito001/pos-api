import { Router } from 'express';
import {
  getDashboardSummary,
  listSales,
  createSale,
  getSaleById,
  processSaleReturn,
} from '../controllers/saleController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard-summary', getDashboardSummary);
router.get('/', listSales);
router.post('/', handleIdempotency, createSale);
router.get('/:id', getSaleById);
router.post('/:saleId/returns', handleIdempotency, processSaleReturn);

export default router;
