import { Router } from 'express';
import * as UsersController from '../controllers/users.controller.js';

const router = Router();

router.get('/',              UsersController.listUsers);
router.post('/',             UsersController.createUser);
router.put('/:id',           UsersController.updateUser);
router.post('/:id/reset-password', UsersController.resetPassword);
router.post('/push-token',         UsersController.registerPushToken);

export default router;
