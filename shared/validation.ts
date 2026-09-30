import { z } from 'zod';
export const idSchema = z.string().cuid();
export const emailSchema = z.string().trim().email().max(254).toLowerCase();
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Password must be at most 72 UTF-8 bytes',
  );
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export const roleSchema = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);
export const statusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const dateSchema = z.string().datetime().nullable().optional();
export const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
});
export const projectSchema = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().max(5000).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#635bff'),
  startDate: dateSchema,
  dueDate: dateSchema,
});
export const taskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(10000).optional(),
  status: statusSchema.default('TODO'),
  priority: prioritySchema.default('MEDIUM'),
  dueDate: dateSchema,
  assigneeIds: z.array(idSchema).max(20).default([]),
  labelIds: z.array(idSchema).max(20).default([]),
});
export const taskPatchSchema = taskSchema.partial().extend({
  position: z.number().finite().min(0).max(1e12).optional(),
  version: z.number().int().nonnegative(),
});
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const commentSchema = z.object({ body: z.string().trim().min(1).max(5000) });
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
