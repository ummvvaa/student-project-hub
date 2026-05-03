import { Request, Response, NextFunction } from 'express';
import { TaskStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:        true,
        fullName:  true,
        email:     true,
        role:      true,
        skills:    true,
        points:    true,
        badges:    true,
        createdAt: true,
      },
    });
    if (!user) {
      next(new AppError(404, 'User not found'));
      return;
    }

    const closedTasks = await prisma.task.count({
      where: { assigneeId: userId, status: TaskStatus.DONE },
    });

    const reviewAgg = await prisma.peerReview.aggregate({
      where:  { targetUserId: userId },
      _avg:   { score: true },
      _count: { _all: true },
    });

    res.json({
      user,
      stats: {
        closedTasks,
        averageReview: reviewAgg._avg.score ?? 0,
        reviewCount:   reviewAgg._count._all,
      },
    });
  } catch (err) {
    next(err);
  }
}
