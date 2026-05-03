import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { awardForGoodReview } from '../services/gamification.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  score: z
    .number({ invalid_type_error: 'Score must be a number' })
    .int('Score must be an integer')
    .min(1, 'Score must be between 1 and 5')
    .max(5, 'Score must be between 1 and 5'),
  comment: z.string().min(1, 'Comment is required'),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const reviewerId = req.user!.id;

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { targetUserId, score, comment } = parsed.data;

    if (reviewerId === targetUserId) {
      next(new AppError(400, 'You cannot review yourself'));
      return;
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    // Find the reviewer's team in this project
    const reviewerMembership = await prisma.teamMember.findFirst({
      where: { userId: reviewerId, team: { projectId } },
      select: { teamId: true },
    });
    if (!reviewerMembership) {
      next(new AppError(403, 'You are not a member of any team in this project'));
      return;
    }

    // Target must be in the same team
    const targetMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: reviewerMembership.teamId,
          userId: targetUserId,
        },
      },
    });
    if (!targetMembership) {
      next(new AppError(403, 'Target user is not in your team'));
      return;
    }

    const review = await prisma.peerReview.create({
      data: { projectId, reviewerId, targetUserId, score, comment },
      include: {
        targetUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    awardForGoodReview(targetUserId, score).catch((e) =>
      console.error(`awardForGoodReview failed for ${targetUserId}:`, e),
    );

    res.status(201).json({ review });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      next(new AppError(409, 'You have already reviewed this person for this project'));
      return;
    }
    next(err);
  }
}

export async function listForProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;

    // Only the project creator may see the full aggregate
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }
    if (
      req.user!.role !== Role.ADMIN &&
      project.createdById !== req.user!.id
    ) {
      next(new AppError(403, 'Only the project creator can view all reviews'));
      return;
    }

    const reviews = await prisma.peerReview.findMany({
      where: { projectId },
      select: {
        score: true,
        comment: true,
        targetUserId: true,
        targetUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate per targetUser: averageScore, count, anonymous comments
    const buckets = new Map<
      string,
      { user: { id: string; fullName: string }; scores: number[]; comments: string[] }
    >();

    for (const r of reviews) {
      let bucket = buckets.get(r.targetUserId);
      if (!bucket) {
        bucket = { user: r.targetUser, scores: [], comments: [] };
        buckets.set(r.targetUserId, bucket);
      }
      bucket.scores.push(r.score);
      bucket.comments.push(r.comment);
    }

    const aggregate = Array.from(buckets.values()).map(({ user, scores, comments }) => ({
      user,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
      comments, // no author names — reviewers stay anonymous
    }));

    res.json({ aggregate });
  } catch (err) {
    next(err);
  }
}

export async function listMyGiven(
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

    const reviews = await prisma.peerReview.findMany({
      where: { projectId, reviewerId: req.user!.id },
      include: {
        targetUser: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}
