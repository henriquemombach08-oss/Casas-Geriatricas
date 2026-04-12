import { Router } from 'express';
import * as ResidentsController from '../controllers/residents.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { upload } from '../lib/upload.js';

const router = Router();

router.get('/', ResidentsController.list);
router.post('/', requirePermission('view_residents'), ResidentsController.create);
router.get('/:id', ResidentsController.getOne);
router.put('/:id', ResidentsController.update);
router.delete('/:id', requirePermission('manage_users'), ResidentsController.remove);
router.post('/:id/photo', upload.single('file'), ResidentsController.uploadPhoto);
router.get('/:id/documents', ResidentsController.listDocuments);
router.post('/:id/documents', upload.single('document'), ResidentsController.uploadDocument);

export default router;
