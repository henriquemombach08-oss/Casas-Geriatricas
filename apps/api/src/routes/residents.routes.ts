import { Router } from 'express';
import * as ResidentsController from '../controllers/residents.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { requirePin } from '../middleware/requirePin.js';
import { auditAction } from '../middleware/audit.js';
import { upload } from '../lib/upload.js';

const router = Router();

router.get('/', ResidentsController.list);
router.post('/',    requirePermission('view_residents'), auditAction('resident.create', 'Resident'), ResidentsController.create);
router.get('/:id',  ResidentsController.getOne);
router.put('/:id',  requirePin, auditAction('resident.update', 'Resident'), ResidentsController.update);
router.delete('/:id', requirePermission('manage_users'), requirePin, auditAction('resident.delete', 'Resident'), ResidentsController.remove);
router.post('/:id/photo', upload.single('file'), ResidentsController.uploadPhoto);
router.get('/:id/documents', ResidentsController.listDocuments);
router.post('/:id/documents', upload.single('document'), ResidentsController.uploadDocument);

export default router;
