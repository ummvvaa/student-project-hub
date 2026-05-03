import { Router } from 'express';
import { register, login, me, updateProfile, changePassword } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);

export default router;
