import { ProjectStatus, TaskStatus } from '@prisma/client';
import prisma from '../utils/prisma';

// ─── Point values ─────────────────────────────────────────────────────────────

const TASK_ON_TIME_POINTS   = 10;
const TASK_LATE_POINTS      = 5;
const PROJECT_FINISH_POINTS = 20;
const REVIEW_MULTIPLIER     = 2;

// ─── Badge codes ──────────────────────────────────────────────────────────────

export const BADGE_CODES = {
  FIRST_TASK:   'FIRST_TASK',
  ON_FIRE:      'ON_FIRE',
  TEAM_PLAYER:  'TEAM_PLAYER',
  PROJECT_DONE: 'PROJECT_DONE',
} as const;

export type BadgeCode = typeof BADGE_CODES[keyof typeof BADGE_CODES];

export interface AwardResult {
  pointsDelta: number;
  newBadges:   string[];
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export async function awardForTaskCompletion(
  userId: string,
  wasOnTime: boolean,
): Promise<AwardResult> {
  const pointsDelta = wasOnTime ? TASK_ON_TIME_POINTS : TASK_LATE_POINTS;
  await prisma.user.update({
    where: { id: userId },
    data:  { points: { increment: pointsDelta } },
  });
  const newBadges = await checkBadges(userId);
  return { pointsDelta, newBadges };
}

export async function awardForGoodReview(
  targetUserId: string,
  score: number,
): Promise<AwardResult> {
  const pointsDelta = score * REVIEW_MULTIPLIER;
  await prisma.user.update({
    where: { id: targetUserId },
    data:  { points: { increment: pointsDelta } },
  });
  const newBadges = await checkBadges(targetUserId);
  return { pointsDelta, newBadges };
}

export async function awardForProjectFinish(userId: string): Promise<AwardResult> {
  const pointsDelta = PROJECT_FINISH_POINTS;
  await prisma.user.update({
    where: { id: userId },
    data:  { points: { increment: pointsDelta } },
  });
  const newBadges = await checkBadges(userId);
  return { pointsDelta, newBadges };
}

// ─── Badges ───────────────────────────────────────────────────────────────────

/**
 * Checks every badge condition for the given user and pushes newly earned
 * codes to User.badges (without duplicates). Returns the array of newly
 * granted badge codes (empty if nothing was added).
 */
export async function checkBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { badges: true },
  });
  if (!user) return [];

  const existing  = new Set(user.badges);
  const newBadges: string[] = [];

  // FIRST_TASK — at least one DONE task
  if (!existing.has(BADGE_CODES.FIRST_TASK)) {
    const doneCount = await prisma.task.count({
      where: { assigneeId: userId, status: TaskStatus.DONE },
    });
    if (doneCount >= 1) newBadges.push(BADGE_CODES.FIRST_TASK);
  }

  // ON_FIRE — last 5 closed tasks were all on time
  if (!existing.has(BADGE_CODES.ON_FIRE)) {
    const last5 = await prisma.task.findMany({
      where:   { assigneeId: userId, status: TaskStatus.DONE, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take:    5,
      select:  { wasOnTime: true },
    });
    if (last5.length === 5 && last5.every((t) => t.wasOnTime === true)) {
      newBadges.push(BADGE_CODES.ON_FIRE);
    }
  }

  // TEAM_PLAYER — average peer-review ≥ 4.0 with at least 3 reviews
  if (!existing.has(BADGE_CODES.TEAM_PLAYER)) {
    const agg = await prisma.peerReview.aggregate({
      where:  { targetUserId: userId },
      _avg:   { score: true },
      _count: { _all: true },
    });
    const count = agg._count._all;
    const avg   = agg._avg.score ?? 0;
    if (count >= 3 && avg >= 4.0) {
      newBadges.push(BADGE_CODES.TEAM_PLAYER);
    }
  }

  // PROJECT_DONE — member of a team in a COMPLETED project
  if (!existing.has(BADGE_CODES.PROJECT_DONE)) {
    const completedMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { project: { status: ProjectStatus.COMPLETED } },
      },
      select: { teamId: true },
    });
    if (completedMembership) newBadges.push(BADGE_CODES.PROJECT_DONE);
  }

  if (newBadges.length === 0) return [];

  await prisma.user.update({
    where: { id: userId },
    data:  { badges: { push: newBadges } },
  });

  return newBadges;
}
