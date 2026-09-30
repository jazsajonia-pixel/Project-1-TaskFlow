export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('The server could not be reached. Please try again.', response.status);
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(result.message ?? 'Request failed', response.status, result.errors);
  }
  return result.data as T;
}
export const json = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data !== undefined && { body: JSON.stringify(data) }),
});
export const qs = (data: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
};
