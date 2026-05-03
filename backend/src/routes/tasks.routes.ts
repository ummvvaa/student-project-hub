import { Router } from 'express';
import { update, deleteTask } from '../controllers/tasks.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Membership check happens inside the controller (task → teamId → member lookup)
router.patch('/:id', update);
router.delete('/:id', deleteTask);

export default router;
