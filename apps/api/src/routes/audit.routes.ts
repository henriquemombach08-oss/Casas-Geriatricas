import { Router } from 'express';
import * as AuditController from '../controllers/audit.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', requirePermission('view_reports'), AuditController.listAll);
router.get('/me', AuditController.listMine);

export default router;
