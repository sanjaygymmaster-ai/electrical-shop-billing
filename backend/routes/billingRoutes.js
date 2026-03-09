import express from 'express';
import { createBilling, listBillingByUser } from '../controllers/billingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.post('/', createBilling);
router.get('/', listBillingByUser);

export default router;

