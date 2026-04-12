import { Router } from 'express';
import * as NotificationsController from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', NotificationsController.list);
router.put('/:id/read', NotificationsController.markRead);
router.put('/read-all', NotificationsController.markAllRead);
router.delete('/:id', NotificationsController.remove);

export default router;
