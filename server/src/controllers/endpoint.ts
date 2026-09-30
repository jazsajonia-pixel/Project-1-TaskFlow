import type { RequestHandler } from 'express';
import { z } from 'zod';
import { idSchema, paginationSchema } from '../../../shared/validation.js';
export const params = (...keys: string[]) =>
  z.object(Object.fromEntries(keys.map((key) => [key, idSchema])));
export const pageQuery = paginationSchema;
export function endpoint<S extends z.ZodTypeAny>(
  schema: S,
  action: (input: z.infer<S>, userId: string) => Promise<unknown>,
  status = 200,
) {
  const handler: RequestHandler = async (req, res) => {
    const input = schema.parse({ body: req.body, params: req.params, query: req.query });
    const data = await action(input, res.locals.user.id as string);
    res.status(status).json({ success: true, data: data ?? null });
  };
  return Object.assign(handler, { schema });
}
export function requestSchema<
  B extends z.ZodTypeAny = z.ZodUnknown,
  P extends z.ZodTypeAny = z.ZodObject<Record<string, never>>,
  Q extends z.ZodTypeAny = z.ZodObject<Record<string, never>>,
>(body?: B, path?: P, query?: Q) {
  return z.object({
    body: (body ?? z.unknown()) as B,
    params: (path ?? z.object({})) as P,
    query: (query ?? z.object({})) as Q,
  });
}
