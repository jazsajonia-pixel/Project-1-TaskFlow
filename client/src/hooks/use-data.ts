import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError, json } from '../services/api';
import { useUI } from '../stores/ui';
import type { User, Workspace } from '../types';
export const useUser = () =>
  useQuery({
    queryKey: ['user'],
    queryFn: () => api<User>('/auth/me'),
    retry: false,
    staleTime: 60000,
  });
export function useWorkspaces() {
  return useQuery({ queryKey: ['workspaces'], queryFn: () => api<Workspace[]>('/workspaces') });
}
export function useWorkspace() {
  const query = useWorkspaces();
  const id = useUI((s) => s.workspaceId);
  const workspace = query.data?.find((w) => w.id === id) ?? query.data?.[0];
  const role = workspace?.members[0]?.role;
  return {
    ...query,
    workspace,
    role,
    canWrite: !!role && role !== 'VIEWER',
    canManage: role === 'OWNER' || role === 'ADMIN',
  };
}
export function useAction<T = unknown, V = void>(
  action: (variables: V) => Promise<T>,
  message?: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'user' });
      if (message) toast.success(message);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', json('POST')),
    onSuccess: () => {
      client.clear();
      useUI.getState().setWorkspace(null);
      window.location.assign('/login');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;
