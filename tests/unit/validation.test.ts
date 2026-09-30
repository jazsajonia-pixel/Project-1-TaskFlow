import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  taskSchema,
  taskPatchSchema,
  paginationSchema,
  passwordSchema,
} from '../../shared/validation';
describe('shared API contracts', () => {
  it('rejects mismatched and short registration passwords', () => {
    expect(
      registerSchema.safeParse({
        name: 'Alex',
        email: 'a@example.com',
        password: 'short',
        confirmPassword: 'different',
      }).success,
    ).toBe(false);
  });
  it('normalizes identity emails', () => {
    expect(
      registerSchema.parse({
        name: ' Alex ',
        email: ' A@EXAMPLE.COM ',
        password: 'a-long-password',
        confirmPassword: 'a-long-password',
      }).email,
    ).toBe('a@example.com');
  });
  it('rejects bcrypt truncation by UTF-8 byte count', () => {
    expect(passwordSchema.safeParse('🔑'.repeat(20)).success).toBe(false);
  });
  it('requires real task content and a version for concurrent edits', () => {
    expect(taskSchema.safeParse({ title: ' ' }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ status: 'DONE' }).success).toBe(false);
    expect(taskPatchSchema.parse({ status: 'DONE', version: 2 })).toEqual({
      status: 'DONE',
      version: 2,
    });
  });
  it('bounds pagination and rejects invalid states', () => {
    expect(paginationSchema.safeParse({ limit: 10001 }).success).toBe(false);
    expect(taskSchema.safeParse({ title: 'Task', status: 'invented' }).success).toBe(false);
  });
});
