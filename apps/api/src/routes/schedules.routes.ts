import { Router } from 'express';
import * as SchedulesController from '../controllers/schedules.controller.js';

const router = Router();

router.get('/', SchedulesController.list);
router.post('/', SchedulesController.create);
router.get('/:userId', SchedulesController.getByUser);
router.put('/:id/confirm', SchedulesController.confirm);
router.delete('/:id', SchedulesController.remove);

export default router;
