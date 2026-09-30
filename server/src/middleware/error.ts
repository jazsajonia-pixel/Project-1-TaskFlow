import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AppError } from '../utils/errors.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path =
        issue.path
          .filter(
            (part, index) => !(index === 0 && ['body', 'query', 'params'].includes(String(part))),
          )
          .join('.') || 'request';
      (errors[path] ??= []).push(issue.message);
    }
    res.status(422).json({ success: false, message: 'Validation failed', errors });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2002', 'P2003', 'P2025'].includes(error.code)
  ) {
    res.status(error.code === 'P2025' ? 404 : 409).json({
      success: false,
      message:
        error.code === 'P2002'
          ? 'This record already exists'
          : error.code === 'P2025'
            ? 'Record not found'
            : 'A referenced record is unavailable',
    });
    return;
  }
  if (error instanceof MulterError) {
    res.status(422).json({
      success: false,
      message:
        error.code === 'LIMIT_FILE_SIZE' ? 'Files must be 10 MB or smaller' : 'Invalid upload',
    });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ success: false, message: 'Invalid JSON' });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request too large' });
    return;
  }
  console.error('Request failed:', error instanceof Error ? error.name : 'Unknown error');
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};
