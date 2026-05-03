import { Router } from 'express';
import { getById, join, leave, kickMember } from '../controllers/teams.controller';
import { list, create } from '../controllers/tasks.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTeamMember } from '../middleware/team.middleware';

const router = Router();

router.use(requireAuth);

// ─── Team routes ──────────────────────────────────────────────────────────────
router.get('/:id', getById);
router.post('/join', join);
router.delete('/:id/members/me', leave);
router.delete('/:id/members/:userId', kickMember);

// ─── Task routes scoped to team ───────────────────────────────────────────────
// param name :teamId keeps it distinct from the :id above
router.get('/:teamId/tasks', requireTeamMember(), list);
router.post('/:teamId/tasks', requireTeamMember(), create);

export default router;
