import { Router } from 'express';
import * as FinancialController from '../controllers/financial.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/resident/:residentId', FinancialController.listByResident);
router.post('/', requirePermission('manage_financial'), FinancialController.create);
router.put('/:id', requirePermission('manage_financial'), FinancialController.update);
router.delete('/:id', requirePermission('manage_financial'), FinancialController.remove);
router.get('/nfe/generate', requirePermission('generate_nfe'), FinancialController.generateNfe);
router.get('/reports', requirePermission('view_reports'), FinancialController.report);
router.get('/dashboard', requirePermission('view_reports'), FinancialController.dashboard);

export default router;
