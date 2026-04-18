import { Router } from 'express';
import * as MedicationsController from '../controllers/medications.controller.js';
import { requirePin } from '../middleware/requirePin.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

router.get('/scheduled/next', MedicationsController.getScheduledNext);
router.get('/scheduled/today', MedicationsController.scheduledToday);
router.get('/resident/:residentId', MedicationsController.listByResident);
router.post('/',        auditAction('medication.create', 'Medication'), MedicationsController.create);
router.put('/:id',      auditAction('medication.update', 'Medication'), MedicationsController.update);
router.delete('/:id',   requirePin, auditAction('medication.delete', 'Medication'), MedicationsController.remove);
router.post('/:id/logs', requirePin, auditAction('medication.administer', 'MedicationLog'), MedicationsController.registerLog);
router.get('/:id/history', MedicationsController.getHistory);

export default router;
