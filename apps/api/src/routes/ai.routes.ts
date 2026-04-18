import { Router } from 'express';
import * as AiController from '../controllers/ai.controller.js';

const router = Router();

router.get('/schedule/analyze', AiController.analyzeSchedule);
router.post('/schedule/suggest', AiController.suggestSchedule);
router.get('/schedule/suggestions', AiController.getScheduleSuggestions);
router.get('/risk-scores', AiController.getHouseRiskScores);
router.get('/risk-scores/:residentId', AiController.getResidentRiskScore);

export default router;
