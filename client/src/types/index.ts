export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export interface Person {
  id: string;
  name: string;
  avatar: string | null;
}
export interface User extends Person {
  email: string;
  bio: string | null;
  emailVerified: boolean;
  emailNotifications: boolean;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  members: { role: Role }[];
  _count: { members: number; projects: number };
}
export interface Member {
  id: string;
  userId: string;
  role: Role;
  user: Person & { email: string };
}
export interface Label {
  id: string;
  name: string;
  color: string;
}
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  color: string;
  startDate: string | null;
  dueDate: string | null;
  members: { userId: string; user: Person }[];
  labels: Label[];
  _count: { tasks: number };
  completedTasks: number;
}
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}
export interface Attachment {
  id: string;
  taskId: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  task?: { id: string; title: string };
}
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  position: number;
  version: number;
  assignees: { userId: string; user: Person }[];
  labels: { labelId: string; label: Label }[];
  subtasks: Subtask[];
  attachments: Attachment[];
  _count: { comments: number; attachments: number };
  project: Project;
}
export interface Comment {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: Person;
}
export interface Activity {
  id: string;
  actor: Person;
  action: string;
  entity: string;
  entityId: string;
  projectId?: string;
  metadata: { title?: string } | null;
  createdAt: string;
}
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
}
export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: string;
  expiresAt: string;
  inviteUrl?: string;
}
export interface Analytics {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  projects: number;
  completion: number;
  byStatus: { name: string; value: number }[];
  byPriority: { name: string; value: number }[];
  assigned: Task[];
  deadlines: Task[];
  activity: Activity[];
  timeline: { date: string; day: string; created: number; completed: number }[];
}
