import { Router } from 'express';
import * as FinancialController from '../controllers/financial.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

// Summary / report (before /:id to avoid param collision)
router.get('/summary', requirePermission('view_reports'), FinancialController.summary);
router.get('/report',  requirePermission('view_reports'), FinancialController.report);

// Resident history
router.get('/resident/:residentId', FinancialController.listByResident);

// CRUD
router.post('/',    requirePermission('manage_financial'), FinancialController.create);
router.put('/:id',  requirePermission('manage_financial'), FinancialController.update);
router.delete('/:id', requirePermission('manage_financial'), FinancialController.remove);

// Actions
router.post('/:id/generate-nfe',   requirePermission('generate_nfe'),     FinancialController.generateNfe);
router.post('/:id/send-reminder',  requirePermission('manage_financial'),  FinancialController.sendReminder);

export default router;
