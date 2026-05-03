import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProjectStatus, Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { awardForProjectFinish } from '../services/gamification.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  deadline: z.string().datetime({ message: 'deadline must be a valid ISO 8601 string' }),
  requiredSkills: z.array(z.string()).optional().default([]),
});

const updateSchema = z.object({
  title:          z.string().min(1).optional(),
  description:    z.string().min(1).optional(),
  deadline:       z.string().datetime({ message: 'deadline must be a valid ISO 8601 string' }).optional(),
  requiredSkills: z.array(z.string()).optional(),
  status:         z.nativeEnum(ProjectStatus).optional(),
});

const changeStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
});

// ─── Shared select ────────────────────────────────────────────────────────────

const CREATOR_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canMutate(createdById: string, userId: string, role: Role): boolean {
  return role === Role.ADMIN || createdById === userId;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { role, id: userId } = req.user!;
    const statusParam = req.query.status as string | undefined;

    if (statusParam && statusParam !== 'all') {
      if (!Object.values(ProjectStatus).includes(statusParam as ProjectStatus)) {
        next(new AppError(400, 'Invalid status parameter'));
        return;
      }
    }

    // Resolve status filter: explicit param wins; default = ACTIVE for non-admin
    const statusWhere: ProjectStatus | undefined =
      statusParam === 'all'
        ? undefined
        : statusParam
        ? (statusParam as ProjectStatus)
        : role === Role.ADMIN ? undefined : ProjectStatus.ACTIVE;

    const baseWhere =
      role === Role.TEACHER ? { createdById: userId } : {};

    const where = {
      ...baseWhere,
      ...(statusWhere !== undefined && { status: statusWhere }),
    };

    const projects = await prisma.project.findMany({
      where,
      include: {
        createdBy: { select: CREATOR_SELECT },
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: CREATOR_SELECT },
        teams: {
          include: {
            leader: { select: { id: true, fullName: true, email: true } },
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, skills: true },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    res.json({ project });
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

    const { title, description, deadline, requiredSkills } = parsed.data;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        requiredSkills,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: CREATOR_SELECT } },
    });

    res.status(201).json({ project });
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
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    if (!canMutate(existing.createdById, req.user!.id, req.user!.role)) {
      next(new AppError(403, 'Forbidden'));
      return;
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { deadline, ...rest } = parsed.data;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
      },
      include: { createdBy: { select: CREATOR_SELECT } },
    });

    // Award all team members when project transitions into COMPLETED
    const justCompleted =
      existing.status !== ProjectStatus.COMPLETED &&
      project.status   === ProjectStatus.COMPLETED;
    if (justCompleted) {
      const memberships = await prisma.teamMember.findMany({
        where:  { team: { projectId: project.id } },
        select: { userId: true },
      });
      const uniqueIds = Array.from(new Set(memberships.map((m) => m.userId)));
      await Promise.all(
        uniqueIds.map((userId) =>
          awardForProjectFinish(userId).catch((e) =>
            console.error(`awardForProjectFinish failed for ${userId}:`, e),
          ),
        ),
      );
    }

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    if (!canMutate(existing.createdById, req.user!.id, req.user!.role)) {
      next(new AppError(403, 'Forbidden'));
      return;
    }

    const parsed = changeStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { status } = parsed.data;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status },
      include: { createdBy: { select: CREATOR_SELECT } },
    });

    const justCompleted =
      existing.status !== ProjectStatus.COMPLETED &&
      project.status   === ProjectStatus.COMPLETED;
    if (justCompleted) {
      const memberships = await prisma.teamMember.findMany({
        where:  { team: { projectId: project.id } },
        select: { userId: true },
      });
      const uniqueIds = Array.from(new Set(memberships.map((m) => m.userId)));
      await Promise.all(
        uniqueIds.map((uid) =>
          awardForProjectFinish(uid).catch((e) =>
            console.error(`awardForProjectFinish failed for ${uid}:`, e),
          ),
        ),
      );
    }

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    if (!canMutate(existing.createdById, req.user!.id, req.user!.role)) {
      next(new AppError(403, 'Forbidden'));
      return;
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
