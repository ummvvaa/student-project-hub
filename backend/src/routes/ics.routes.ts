import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/auth.middleware';
import { handleIcsUpload } from '../middleware/upload.middleware';
import { parseFile, confirmImport } from '../controllers/ics.controller';

// mergeParams: true — inherits :projectId from projects router
const router = Router({ mergeParams: true });

router.use(requireRole(Role.TEACHER, Role.ADMIN));

router.post('/',        handleIcsUpload, parseFile);
router.post('/confirm', confirmImport);

export default router;
