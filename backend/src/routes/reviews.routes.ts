import { Router } from 'express';
import { Role } from '@prisma/client';
import { create, listForProject, listMyGiven } from '../controllers/reviews.controller';
import { requireRole } from '../middleware/auth.middleware';

// mergeParams: true — inherits :projectId from the parent projects router
const router = Router({ mergeParams: true });

router.post('/', create);
router.get('/mine', listMyGiven);
router.get('/', requireRole(Role.TEACHER, Role.ADMIN), listForProject);

export default router;
