import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const pretty = (text: string) =>
  text
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (s) => s.toUpperCase());
export const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No date';
export const relative = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
};
export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
