import multer, { FileFilterCallback } from 'multer';
import { Request, RequestHandler, NextFunction, Response } from 'express';
import { AppError } from '../utils/AppError';

const _upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
    const ok =
      file.originalname.toLowerCase().endsWith('.ics') ||
      file.mimetype === 'text/calendar';
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только .ics файлы'));
    }
  },
}).single('file');

// Wraps multer to convert its errors into AppError (400) instead of 500
export const handleIcsUpload: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  _upload(req, res, (err) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'Файл слишком большой (максимум 1 МБ)'));
    } else {
      next(new AppError(400, (err as Error).message ?? 'Ошибка загрузки файла'));
    }
  });
};
