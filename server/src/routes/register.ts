import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { requireAuth } from '../middleware/auth.js';
export const router = Router();
export const paths: Record<string, Record<string, unknown>> = {};
type DocumentedHandler = RequestHandler & { schema?: z.ZodTypeAny };
export function route(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  handler: DocumentedHandler,
  tag: string,
  summary: string,
  options: {
    public?: boolean;
    middleware?: RequestHandler[];
    body?: z.ZodTypeAny;
    multipart?: boolean;
  } = {},
) {
  router[method](
    path,
    ...(options.public ? [] : [requireAuth]),
    ...(options.middleware ?? []),
    handler,
  );
  const documentPath = path.replace(/:([A-Za-z]+)/g, '{$1}');
  const schema = handler.schema instanceof z.ZodObject ? handler.schema.shape : undefined;
  const body = options.body ?? schema?.body;
  const query = schema?.query;
  const parameters: unknown[] = [...path.matchAll(/:([A-Za-z]+)/g)].map((match) => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  if (query instanceof z.ZodObject)
    for (const [name, value] of Object.entries(query.shape as Record<string, z.ZodTypeAny>))
      parameters.push({
        name,
        in: 'query',
        required: !value.isOptional(),
        schema: zodToJsonSchema(value, { target: 'openApi3', $refStrategy: 'none' }),
      });
  let requestBody: unknown;
  if (options.multipart)
    requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description:
                  'PDF, DOCX, PNG, JPEG or WebP; maximum 10 MB. Content signatures are checked.',
              },
            },
          },
        },
      },
    };
  else if (body && !(body instanceof z.ZodUnknown))
    requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: zodToJsonSchema(body, { target: 'openApi3', $refStrategy: 'none' }),
        },
      },
    };
  const descriptions: Record<number, string> = {
    400: 'Bad request',
    401: 'Authentication required',
    403: 'Insufficient permissions or invalid Origin',
    404: 'Resource not found',
    409: 'Conflict or stale version',
    422: 'Validation failed',
    429: 'Rate limit exceeded',
    500: 'Internal error',
  };
  const responses: Record<string, unknown> = {};
  for (const code of [400, 401, 403, 404, 409, 422, 429, 500])
    responses[code] = {
      description: descriptions[code],
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    };
  responses['200'] = {
    description: 'Success',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } },
  };
  if (method === 'post') responses['201'] = responses['200'];
  paths[documentPath] ??= {};
  paths[documentPath][method] = {
    tags: [tag],
    summary,
    security: options.public ? [] : [{ cookieAuth: [] }],
    parameters,
    ...(requestBody ? { requestBody } : {}),
    responses,
  };
}
