import { Router } from 'express';
import * as PinController from '../controllers/pin.controller.js';

const router = Router();

router.get('/status', PinController.pinStatus);
router.post('/set', PinController.setPin);
router.post('/verify', PinController.verifyPin);

export default router;
