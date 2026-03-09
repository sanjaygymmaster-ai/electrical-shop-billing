import express from 'express';
import { createBill, getBills, getBillById, getDailySales, getMonthlyReport, saveMonthlyReport, listSavedReports, getSavedReportById, finalizeSavedReport, updateBill, markBillPaid, deleteBill } from '../controllers/billController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/', getBills);
router.get('/daily', getDailySales);
router.get('/monthly', getMonthlyReport);
router.post('/monthly/save', saveMonthlyReport);
router.get('/monthly/saved', listSavedReports);
router.get('/monthly/saved/:id', getSavedReportById);
router.post('/monthly/saved/:id/finalize', finalizeSavedReport);
router.get('/:id', getBillById);
router.post('/', createBill);
router.put('/:id', updateBill);
router.patch('/:id/paid', markBillPaid);
router.delete('/:id', deleteBill);

export default router;
