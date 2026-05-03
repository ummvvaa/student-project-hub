import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * requireTeamMember(param) — проверяет, что текущий пользователь является
 * участником команды, чей id находится в req.params[param].
 */
export function requireTeamMember(param = 'teamId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const teamId = req.params[param];
    const userId = req.user!.id;

    try {
      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
      });

      if (!member) {
        res.status(403).json({ error: 'You are not a member of this team' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
