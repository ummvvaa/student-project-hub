import { Router } from 'express';
import { Role } from '@prisma/client';
import { list, getById, create, update, deleteProject } from '../controllers/projects.controller';
import { create as createTeam } from '../controllers/teams.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import reviewsRouter from './reviews.routes';
import roadmapRouter from './roadmap.routes';
import icsRouter from './ics.routes';

const router = Router();

// Все маршруты требуют аутентификации
router.use(requireAuth);

router.get('/', list);
router.get('/:id', getById);

// Создавать проекты могут только преподаватели
router.post('/', requireRole(Role.TEACHER), create);

// Создание команды внутри проекта — проверка роли внутри контроллера
router.post('/:projectId/teams', createTeam);

// Peer reviews — :projectId передаётся через mergeParams
router.use('/:projectId/reviews', reviewsRouter);

// AI Roadmap — :projectId передаётся через mergeParams
router.use('/:projectId/ai-roadmap', roadmapRouter);

// ICS import — :projectId передаётся через mergeParams
router.use('/:projectId/import-ics', icsRouter);

// Изменять/удалять может создатель или ADMIN — проверка внутри контроллера
router.patch('/:id', update);
router.delete('/:id', deleteProject);

export default router;
