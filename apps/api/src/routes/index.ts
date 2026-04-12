import { Router } from 'express';
import authRoutes from './auth.routes.js';
import residentsRoutes from './residents.routes.js';
import medicationsRoutes from './medications.routes.js';
import schedulesRoutes from './schedules.routes.js';
import financialRoutes from './financial.routes.js';
import visitorsRoutes from './visitors.routes.js';
import reportsRoutes from './reports.routes.js';
import notificationsRoutes from './notifications.routes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use(authenticate);
router.use('/residents', residentsRoutes);
router.use('/medications', medicationsRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/financial', financialRoutes);
router.use('/visitors', visitorsRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
