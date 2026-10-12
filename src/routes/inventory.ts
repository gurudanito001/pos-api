import { Router } from 'express';
import {
  listInventoryProducts,
  getProductDetails,
  updateProductDetails,
  updateProductPrice,
  auditProductStock,
  getLowStockAlerts,
} from '../controllers/inventoryController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.use(requireAuth);

router.get('/products', listInventoryProducts);
router.get('/products/:id', getProductDetails);
router.put('/products/:id', updateProductDetails);
router.patch('/products/:id/price', updateProductPrice);
router.post('/products/:id/audit', handleIdempotency, auditProductStock);
router.get('/low-stock', getLowStockAlerts);

export default router;
