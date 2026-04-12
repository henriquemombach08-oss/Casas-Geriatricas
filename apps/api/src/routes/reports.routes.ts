import { Router } from 'express';
import * as ReportsController from '../controllers/reports.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requirePermission('view_reports'));

router.get('/medications', ReportsController.medications);
router.get('/residents', ReportsController.residents);
router.get('/financial', ReportsController.financial);
router.get('/staff', ReportsController.staff);
router.get('/visitors', ReportsController.visitors);
router.post('/schedule', ReportsController.scheduleReport);

export default router;
