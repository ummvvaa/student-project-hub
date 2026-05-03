import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getProfile } from '../controllers/profile.controller';

const router = Router();

router.use(requireAuth);

router.get('/me/profile', getProfile);

export default router;
