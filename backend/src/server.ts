import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import authRouter from './routes/auth.routes';
import projectsRouter from './routes/projects.routes';
import teamsRouter from './routes/teams.routes';
import tasksRouter from './routes/tasks.routes';
import recommendationsRouter from './routes/recommendations.routes';
import usersRouter from './routes/users.routes';
import { AppError } from './utils/AppError';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/users', usersRouter);

// ─── Fallback & Error handlers ────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    const msg = err.errors[0]?.message ?? 'Ошибка валидации';
    res.status(400).json({ error: msg });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Запись не найдена' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Запись с такими данными уже существует' });
      return;
    }
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
