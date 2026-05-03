import { Router } from 'express';
import { generate, getLast, importToTasks } from '../controllers/roadmap.controller';

// mergeParams: true — inherit :projectId from projects router
const router = Router({ mergeParams: true });

router.post('/',        generate);
router.get('/',         getLast);
router.post('/import',  importToTasks);

export default router;
