import { Router } from 'express';
import * as AiController from '../controllers/ai.controller.js';
import { requirePin } from '../middleware/requirePin.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();

router.get('/', AiController.listCarePlans);
router.post('/',              auditAction('care_plan.create', 'CarePlan'), AiController.createCarePlan);
router.post('/auto-generate', auditAction('care_plan.create', 'CarePlan'), AiController.autoGenerateCarePlan);
router.put('/tasks/:taskId',  AiController.updateCarePlanTask);
router.put('/:id',            requirePin, auditAction('care_plan.update', 'CarePlan'), AiController.updateCarePlan);
router.delete('/:id',         requirePin, auditAction('care_plan.delete', 'CarePlan'), AiController.deleteCarePlan);

export default router;
