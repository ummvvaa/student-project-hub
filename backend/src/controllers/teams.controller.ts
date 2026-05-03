import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, ProjectStatus, Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { generateInviteCode } from '../utils/inviteCode';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
});

const joinSchema = z.object({
  inviteCode: z.string().length(8, 'Invite code must be 8 characters'),
});

// ─── Includes ─────────────────────────────────────────────────────────────────

const TEAM_MINE_INCLUDE = {
  project: {
    select: { id: true, title: true, deadline: true, status: true },
  },
  leader: {
    select: { id: true, fullName: true },
  },
  members: {
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  tasks: {
    select: { status: true },
  },
} satisfies Prisma.TeamInclude;

const TEAM_FULL_INCLUDE = {
  project: {
    select: { id: true, title: true, status: true, deadline: true },
  },
  leader: {
    select: { id: true, fullName: true, email: true },
  },
  members: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, skills: true },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  tasks: {
    include: {
      assignee: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TeamInclude;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const exists = await prisma.team.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate a unique invite code after 10 attempts');
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function listMyTeams(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: userId, role } = req.user!;

    let where: Prisma.TeamWhereInput;
    if (role === Role.STUDENT) {
      where = { members: { some: { userId } } };
    } else if (role === Role.TEACHER) {
      where = { project: { createdById: userId } };
    } else {
      where = {};
    }

    const teams = await prisma.team.findMany({
      where,
      include: TEAM_MINE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ teams });
  } catch (err) {
    next(err);
  }
}

export async function listArchiveTeams(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: userId, role } = req.user!;

    const archiveStatuses = [ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED];

    let where: Prisma.TeamWhereInput;
    if (role === Role.STUDENT) {
      where = {
        members: { some: { userId } },
        project: { status: { in: archiveStatuses } },
      };
    } else if (role === Role.TEACHER) {
      where = {
        project: { createdById: userId, status: { in: archiveStatuses } },
      };
    } else {
      where = { project: { status: { in: archiveStatuses } } };
    }

    const teams = await prisma.team.findMany({
      where,
      include: TEAM_MINE_INCLUDE,
      orderBy: { project: { deadline: 'desc' } },
    });

    res.json({ teams });
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
    if (req.user!.role !== Role.STUDENT) {
      next(new AppError(403, 'Only students can create teams'));
      return;
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }
    if (project.status !== ProjectStatus.ACTIVE) {
      next(new AppError(400, 'Cannot create a team in an inactive project'));
      return;
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId, team: { projectId } },
    });
    if (existingMembership) {
      next(new AppError(409, 'You are already in a team for this project'));
      return;
    }

    const inviteCode = await resolveUniqueInviteCode();

    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        inviteCode,
        projectId,
        leaderId: userId,
        members: { create: { userId } },
      },
      include: TEAM_FULL_INCLUDE,
    });

    res.status(201).json({ team });
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
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: TEAM_FULL_INCLUDE,
    });

    if (!team) {
      next(new AppError(404, 'Team not found'));
      return;
    }

    res.json({ team });
  } catch (err) {
    next(err);
  }
}

export async function join(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const userId = req.user!.id;

    const team = await prisma.team.findUnique({
      where: { inviteCode: parsed.data.inviteCode },
      include: { project: { select: { id: true, status: true } } },
    });

    if (!team) {
      next(new AppError(404, 'Invalid invite code'));
      return;
    }

    if (team.project.status !== ProjectStatus.ACTIVE) {
      next(new AppError(400, 'Cannot join a team in an inactive project'));
      return;
    }

    // Already a member of this exact team
    const alreadyMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (alreadyMember) {
      next(new AppError(409, 'You are already a member of this team'));
      return;
    }

    // Already in any other team for the same project
    const existingInProject = await prisma.teamMember.findFirst({
      where: { userId, team: { projectId: team.project.id } },
    });
    if (existingInProject) {
      next(new AppError(409, 'You are already in a team for this project'));
      return;
    }

    await prisma.teamMember.create({ data: { teamId: team.id, userId } });

    const updated = await prisma.team.findUnique({
      where: { id: team.id },
      include: TEAM_FULL_INCLUDE,
    });

    res.json({ team: updated });
  } catch (err) {
    next(err);
  }
}

export async function leave(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: teamId } = req.params;
    const userId = req.user!.id;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      next(new AppError(404, 'Team not found'));
      return;
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      next(new AppError(404, 'You are not a member of this team'));
      return;
    }

    if (team.leaderId === userId) {
      next(
        new AppError(
          400,
          'Leader cannot leave the team. Transfer leadership or delete the team first',
        ),
      );
      return;
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function kickMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: teamId, userId: targetUserId } = req.params;
    const requesterId = req.user!.id;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      next(new AppError(404, 'Team not found'));
      return;
    }

    if (team.leaderId !== requesterId) {
      next(new AppError(403, 'Only the team leader can remove members'));
      return;
    }

    if (targetUserId === requesterId) {
      next(new AppError(400, 'Leader cannot kick themselves'));
      return;
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!membership) {
      next(new AppError(404, 'User is not a member of this team'));
      return;
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
