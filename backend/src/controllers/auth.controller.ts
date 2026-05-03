import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role).optional().default(Role.STUDENT),
  skills: z.array(z.string()).optional().default([]),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  skills: z.array(z.string()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_PUBLIC_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  skills: true,
  points: true,
  badges: true,
  createdAt: true,
} as const;

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { fullName, email, password, role, skills } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { fullName, email, password: hashedPassword, role, skills },
      select: USER_PUBLIC_SELECT,
    });

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      next(new AppError(409, 'Email already in use'));
      return;
    }
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { email, password } = parsed.data;

    const userWithPassword = await prisma.user.findUnique({ where: { email } });
    if (!userWithPassword) {
      next(new AppError(401, 'Invalid credentials'));
      return;
    }

    const passwordMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!passwordMatch) {
      next(new AppError(401, 'Invalid credentials'));
      return;
    }

    const token = signToken({ id: userWithPassword.id, role: userWithPassword.role });

    const { password: _, ...user } = userWithPassword;
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      next(new AppError(404, 'User not found'));
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { fullName, skills } = parsed.data;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(skills !== undefined && { skills }),
      },
      select: USER_PUBLIC_SELECT,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors[0].message));
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    const userWithPassword = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!userWithPassword) {
      next(new AppError(404, 'User not found'));
      return;
    }

    const passwordMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!passwordMatch) {
      next(new AppError(400, 'Текущий пароль неверен'));
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
