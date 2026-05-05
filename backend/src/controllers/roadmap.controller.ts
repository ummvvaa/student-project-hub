import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { generateRoadmap, RoadmapStep } from '../services/ai.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const stepSchema = z.object({
  title:         z.string().min(1, 'Step title is required'),
  description:   z.string().min(1, 'Step description is required'),
  estimatedDays: z.number().int().min(1, 'estimatedDays must be ≥ 1'),
});

const importSchema = z.object({
  teamId:    z.string().min(1, 'teamId is required'),
  steps:     z.array(stepSchema).min(1, 'At least one step is required'),
  startDate: z.string().datetime({ message: 'startDate must be ISO datetime' }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertProjectMemberOrTeacher(
  projectId: string,
  userId: string,
  role: Role,
): Promise<void> {
  if (role === Role.TEACHER || role === Role.ADMIN) return;

  // STUDENT: must be in at least one team of this project
  const member = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { projectId },
    },
  });

  if (!member) {
    throw new AppError(403, 'You are not a member of any team in this project');
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function generate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { id: userId, role } = req.user!;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    await assertProjectMemberOrTeacher(projectId, userId, role);

    let steps: RoadmapStep[];
    try {
      steps = await generateRoadmap({
        title:       project.title,
        description: project.description,
        deadline:    project.deadline.toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      next(new AppError(502, msg));
      return;
    }

    // Upsert — one roadmap per project
    const roadmap = await prisma.aIRoadmap.upsert({
      where:  { projectId },
      update: { generatedSteps: steps as object[], createdAt: new Date() },
      create: { projectId,       generatedSteps: steps as object[] },
    });

    res.status(201).json({ roadmap: { ...roadmap, generatedSteps: steps } });
  } catch (err) {
    next(err);
  }
}

export async function getLast(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    const roadmap = await prisma.aIRoadmap.findUnique({ where: { projectId } });
    if (!roadmap) {
      next(new AppError(404, 'No roadmap generated yet'));
      return;
    }

    res.json({ roadmap });
  } catch (err) {
    next(err);
  }
}

export async function importToTasks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { id: userId } = req.user!;

    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { teamId, steps, startDate } = parsed.data;

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    // Verify team belongs to this project
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.projectId !== projectId) {
      next(new AppError(404, 'Team not found in this project'));
      return;
    }

    // Verify requester is a team member
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      next(new AppError(403, 'You are not a member of this team'));
      return;
    }

    // Create tasks with cumulative deadlines
    const start = new Date(startDate);
    let cumulativeDays = 0;

    const tasks = await prisma.$transaction(
      steps.map((step) => {
        cumulativeDays += step.estimatedDays;
        const deadline = new Date(start);
        deadline.setDate(deadline.getDate() + cumulativeDays);

        return prisma.task.create({
          data: {
            title:       step.title,
            description: step.description,
            teamId,
            deadline,
          },
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
          },
        });
      }),
    );

    res.status(201).json({ tasks });
  } catch (err) {
    next(err);
  }
}
