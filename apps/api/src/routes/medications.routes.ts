import { Router } from 'express';
import * as MedicationsController from '../controllers/medications.controller.js';

const router = Router();

// Order matters: static routes before parameterized ones
router.get('/scheduled/next', MedicationsController.getScheduledNext);
router.get('/scheduled/today', MedicationsController.scheduledToday);
router.get('/resident/:residentId', MedicationsController.listByResident);
router.post('/', MedicationsController.create);
router.put('/:id', MedicationsController.update);
router.delete('/:id', MedicationsController.remove);
router.post('/:id/logs', MedicationsController.registerLog);
router.get('/:id/history', MedicationsController.getHistory);

export default router;
