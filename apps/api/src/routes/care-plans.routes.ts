import { Router } from 'express';
import * as AiController from '../controllers/ai.controller.js';

const router = Router();

router.get('/', AiController.listCarePlans);
router.post('/', AiController.createCarePlan);
router.post('/auto-generate', AiController.autoGenerateCarePlan);
router.put('/tasks/:taskId', AiController.updateCarePlanTask);
router.put('/:id', AiController.updateCarePlan);
router.delete('/:id', AiController.deleteCarePlan);

export default router;
