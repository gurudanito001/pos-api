import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  getOverview,
  getActivityFeed,
  listOtpSessions,
  listUsers,
  getUserDetails,
  listShops,
  getShopDetails,
  updateShop,
  listAllProducts,
  listAuditLogs,
  listStockInEntries,
  listAllSales,
  getSaleDetails,
  listAllReturns,
  listAllDebts,
  listAllRepayments,
  listProcessedMutations,
  listIdempotencyRecords,
  listCatalogProducts,
  createCatalogProduct,
  listSubscriptionUpgrades,
} from '../controllers/adminController.js';

const router = Router();

// Protect all admin endpoints
router.use(requireAdmin);

// 1. Overview & Activity Feed
router.get('/overview', getOverview);
router.get('/activity-feed', getActivityFeed);

// 2. Auth, OTP & Users
router.get('/otp-sessions', listOtpSessions);
router.get('/users', listUsers);
router.get('/users/:id', getUserDetails);

// 3. Shops & Merchants
router.get('/shops', listShops);
router.get('/shops/:id', getShopDetails);
router.patch('/shops/:id', updateShop);

// 4. Inventory, Audits & Stock Intake
router.get('/inventory/products', listAllProducts);
router.get('/inventory/audit-logs', listAuditLogs);
router.get('/stock-in/entries', listStockInEntries);

// 5. Sales & Customer Returns
router.get('/sales', listAllSales);
router.get('/sales/:id', getSaleDetails);
router.get('/returns', listAllReturns);

// 6. Customer Debts & Repayments
router.get('/debts', listAllDebts);
router.get('/debts/repayments', listAllRepayments);

// 7. Offline Sync & Idempotency
router.get('/sync/mutations', listProcessedMutations);
router.get('/sync/idempotency-records', listIdempotencyRecords);

// 8. FMCG Master Catalog & Subscriptions
router.get('/catalog', listCatalogProducts);
router.post('/catalog', createCatalogProduct);
router.get('/subscriptions', listSubscriptionUpgrades);

export default router;
