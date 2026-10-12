import { Router } from 'express';
import {
  getDebtsLedger,
  recordDebtRepayment,
  logReminderSent,
} from '../controllers/debtController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.use(requireAuth);

router.get('/', getDebtsLedger);
router.post('/:saleId/repayments', handleIdempotency, recordDebtRepayment);
router.post('/:saleId/reminder-sent', logReminderSent);

export default router;
