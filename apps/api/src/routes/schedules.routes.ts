import { Router } from 'express';
import * as SchedulesController from '../controllers/schedules.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', SchedulesController.list);
router.post('/', requirePermission('manage_medications'), SchedulesController.create);
router.get('/:userId/schedules', SchedulesController.getByUser);
router.put('/:id/confirm', SchedulesController.confirm);
router.post('/:id/check-in', SchedulesController.checkIn);
router.post('/:id/check-out', SchedulesController.checkOut);
router.put('/:id/absence', SchedulesController.absence);
router.delete('/:id', requirePermission('manage_medications'), SchedulesController.remove);

export default router;
