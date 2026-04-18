import { Router } from 'express';
import * as FinancialController from '../controllers/financial.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { requirePin } from '../middleware/requirePin.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

router.get('/summary', requirePermission('view_reports'), FinancialController.summary);
router.get('/report',  requirePermission('view_reports'), FinancialController.report);
router.get('/resident/:residentId', FinancialController.listByResident);

router.post('/',      requirePermission('manage_financial'), requirePin, auditAction('financial.create', 'FinancialRecord'), FinancialController.create);
router.put('/:id',    requirePermission('manage_financial'), requirePin, auditAction('financial.update', 'FinancialRecord'), FinancialController.update);
router.delete('/:id', requirePermission('manage_financial'), requirePin, auditAction('financial.delete', 'FinancialRecord'), FinancialController.remove);

router.post('/:id/generate-nfe',  requirePermission('generate_nfe'),    FinancialController.generateNfe);
router.post('/:id/send-reminder', requirePermission('manage_financial'), FinancialController.sendReminder);

export default router;
