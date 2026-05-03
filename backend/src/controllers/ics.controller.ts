import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sync as icalSync, VEvent, ParameterValue } from 'node-ical';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paramToString(val: ParameterValue | undefined): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  // ParameterValue can be { val: string; params: Record<string, string> }
  return (val as { val: string }).val ?? '';
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title:       z.string().min(1, 'Название события обязательно'),
  description: z.string().default(''),
  start:       z.string().datetime({ message: 'start должен быть ISO datetime' }),
});

const confirmSchema = z.object({
  teamId: z.string().min(1, 'teamId обязателен'),
  events: z.array(eventSchema).min(1, 'Выберите хотя бы одно событие'),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function parseFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Проект не найден'));
      return;
    }

    if (!req.file) {
      next(new AppError(400, 'Файл не загружен'));
      return;
    }

    const content = req.file.buffer.toString('utf-8');

    let parsed: ReturnType<typeof icalSync.parseICS>;
    try {
      parsed = icalSync.parseICS(content);
    } catch {
      next(new AppError(400, 'Не удалось разобрать .ics файл: повреждён или неверный формат'));
      return;
    }

    const events = Object.values(parsed)
      .filter((e): e is VEvent => e !== undefined && e.type === 'VEVENT')
      .map((e) => ({
        uid:         e.uid ?? `uid-${Math.random().toString(36).slice(2)}`,
        title:       paramToString(e.summary) || '(без названия)',
        description: paramToString(e.description),
        start:       e.start instanceof Date ? e.start.toISOString() : new Date().toISOString(),
        end:         e.end instanceof Date ? e.end.toISOString() : null,
      }))
      .filter((e) => e.start);

    if (events.length === 0) {
      next(new AppError(400, 'Календарь не содержит событий (VEVENT)'));
      return;
    }

    res.json({ events });
  } catch (err) {
    next(err);
  }
}

export async function confirmImport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { id: userId } = req.user!;

    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { teamId, events } = parsed.data;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Проект не найден'));
      return;
    }

    if (project.createdById !== userId && req.user!.role !== Role.ADMIN) {
      next(new AppError(403, 'Только создатель проекта может импортировать задачи'));
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.projectId !== projectId) {
      next(new AppError(404, 'Команда не найдена в этом проекте'));
      return;
    }

    const tasks = await prisma.$transaction(
      events.map((ev) =>
        prisma.task.create({
          data: {
            title:       ev.title,
            description: ev.description,
            teamId,
            deadline:    new Date(ev.start),
          },
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
          },
        }),
      ),
    );

    res.status(201).json({ tasks });
  } catch (err) {
    next(err);
  }
}
