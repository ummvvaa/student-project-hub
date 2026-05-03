import { Request, Response, NextFunction } from 'express';
import { ProjectStatus, Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { jaccardScore, matchedSkills } from '../utils/jaccard';

// ─── Shared selects ───────────────────────────────────────────────────────────

const PROJECT_LIST_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true, role: true } },
  _count:    { select: { teams: true } },
} as const;

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function recommendedProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.user!.role !== Role.STUDENT) {
      next(new AppError(403, 'Only students can get project recommendations'));
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { skills: true },
    });

    if (!currentUser) {
      next(new AppError(404, 'User not found'));
      return;
    }

    const projects = await prisma.project.findMany({
      where:   { status: ProjectStatus.ACTIVE },
      include: PROJECT_LIST_INCLUDE,
    });

    const scored = projects
      .map((p) => ({
        project:      p,
        score:        jaccardScore(currentUser.skills, p.requiredSkills),
        matchedSkills: matchedSkills(currentUser.skills, p.requiredSkills),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ recommendations: scored });
  } catch (err) {
    next(err);
  }
}

export async function suggestedStudents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { id: userId, role } = req.user!;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      next(new AppError(404, 'Project not found'));
      return;
    }

    // Only creator or ADMIN
    if (role !== Role.ADMIN && project.createdById !== userId) {
      next(new AppError(403, 'Only the project creator can get student suggestions'));
      return;
    }

    // Fetch all students + count of active-project team memberships (busyness)
    const students = await prisma.user.findMany({
      where:  { role: Role.STUDENT },
      select: {
        id:       true,
        fullName: true,
        email:    true,
        skills:   true,
        points:   true,
        _count: {
          select: {
            teamMemberships: {
              where: { team: { project: { status: ProjectStatus.ACTIVE } } },
            },
          },
        },
      },
    });

    const scored = students
      .map((s) => {
        const score         = jaccardScore(s.skills, project.requiredSkills);
        const matched       = matchedSkills(s.skills, project.requiredSkills);
        const activeTeams   = s._count.teamMemberships;
        // Busyness penalty: each active team reduces score by 0.05, capped at 0
        const adjustedScore = Math.max(0, score - 0.05 * activeTeams);
        return {
          user: {
            id:       s.id,
            fullName: s.fullName,
            email:    s.email,
            skills:   s.skills,
            points:   s.points,
          },
          score,
          matchedSkills:   matched,
          activeTeamCount: activeTeams,
          adjustedScore,
        };
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
      .slice(0, 15);

    res.json({ suggestions: scored });
  } catch (err) {
    next(err);
  }
}
