import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  recommendedProjects,
  suggestedStudents,
} from '../controllers/recommendations.controller';

const router = Router();

router.use(requireAuth);

router.get('/projects',                       recommendedProjects);
router.get('/projects/:projectId/students',   suggestedStudents);

export default router;
