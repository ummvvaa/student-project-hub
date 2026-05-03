import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TaskStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { awardForTaskCompletion } from '../services/gamification.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  deadline: z.string().datetime({ message: 'Invalid ISO datetime' }).optional(),
  assigneeId: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().min(1, 'Description cannot be empty').optional(),
  // null = explicitly clear the field
  deadline: z.string().datetime({ message: 'Invalid ISO datetime' }).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

// ─── Shared include ───────────────────────────────────────────────────────────

const TASK_INCLUDE = {
  assignee: { select: { id: true, fullName: true, email: true } },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertTeamMember(teamId: string, userId: string): Promise<void> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) throw new AppError(403, 'You are not a member of this team');
}

async function assertAssigneeMember(teamId: string, assigneeId: string): Promise<void> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: assigneeId } },
  });
  if (!member) throw new AppError(400, 'Assignee must be a member of the team');
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // requireTeamMember middleware already verified membership
    const tasks = await prisma.task.findMany({
      where: { teamId: req.params.teamId },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { teamId } = req.params;
    const { title, description, deadline, assigneeId } = parsed.data;

    if (assigneeId) {
      await assertAssigneeMember(teamId, assigneeId).catch((err) => { throw err; });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        teamId,
        ...(deadline && { deadline: new Date(deadline) }),
        ...(assigneeId && { assigneeId }),
      },
      include: TASK_INCLUDE,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) {
      next(new AppError(404, 'Task not found'));
      return;
    }

    // Any team member may update a task
    await assertTeamMember(task.teamId, req.user!.id).catch((err) => { throw err; });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { deadline, assigneeId, status, ...rest } = parsed.data;

    // Validate new assignee is a team member
    if (assigneeId != null) {
      await assertAssigneeMember(task.teamId, assigneeId).catch((err) => { throw err; });
    }

    // Compute completion fields when transitioning → DONE
    const completingNow =
      status === TaskStatus.DONE && task.status !== TaskStatus.DONE;
    const now = new Date();
    const completedAt = completingNow ? now : undefined;
    const wasOnTime = completingNow
      ? task.deadline !== null
        ? now <= task.deadline
        : true
      : undefined;

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...rest,
        ...(status !== undefined && { status }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId ?? null }),
        ...(completedAt !== undefined && { completedAt, wasOnTime }),
      },
      include: TASK_INCLUDE,
    });

    let pointsDelta = 0;
    let newBadges: string[] = [];
    if (completingNow && updated.assigneeId) {
      const result = await awardForTaskCompletion(updated.assigneeId, wasOnTime!);
      pointsDelta = result.pointsDelta;
      newBadges   = result.newBadges;
    }

    res.json({ task: updated, pointsDelta, newBadges });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        team: {
          select: {
            leaderId: true,
            project: { select: { createdById: true } },
          },
        },
      },
    });

    if (!task) {
      next(new AppError(404, 'Task not found'));
      return;
    }

    const userId = req.user!.id;
    const isLeader = task.team.leaderId === userId;
    const isProjectCreator = task.team.project.createdById === userId;

    if (!isLeader && !isProjectCreator) {
      next(new AppError(403, 'Only the team leader or project creator can delete tasks'));
      return;
    }

    await prisma.task.delete({ where: { id: task.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
