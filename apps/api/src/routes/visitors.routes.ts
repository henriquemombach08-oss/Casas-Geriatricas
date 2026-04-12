import { Router } from 'express';
import * as VisitorsController from '../controllers/visitors.controller.js';

const router = Router();

router.post('/', VisitorsController.create);
router.get('/resident/:residentId', VisitorsController.listByResident);
router.put('/:id/checkout', VisitorsController.checkout);
router.get('/', VisitorsController.listAll);

export default router;
