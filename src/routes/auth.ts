import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  completeRegistration,
  refreshToken,
  registerBiometrics,
  logout,
} from '../controllers/authController.js';
import { requireAuth, requireRegistrationToken } from '../middleware/auth.js';
import { handleIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.post('/otp/send', handleIdempotency, requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/register/complete', requireRegistrationToken, completeRegistration);
router.post('/refresh', refreshToken);
router.post('/biometrics/register', requireAuth, registerBiometrics);
router.post('/logout', requireAuth, logout);

export default router;
