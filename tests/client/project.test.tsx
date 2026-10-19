import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectPage from '../../client/src/pages/project';
import type { Page, Project, Task, Workspace } from '../../client/src/types';

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const project = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Launch',
  description: null,
  status: 'ACTIVE',
  color: '#6a5bf4',
  startDate: null,
  dueDate: null,
  members: [],
  labels: [],
  _count: { tasks: 2 },
  completedTasks: 0,
} as Project;
const workspace = {
  id: 'workspace-1',
  name: 'Team',
  description: null,
  ownerId: 'user-1',
  members: [{ role: 'OWNER' }],
  _count: { members: 1, projects: 1 },
} as Workspace;
const task = {
  id: 'task-1',
  projectId: project.id,
  title: 'Keep this task visible',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  position: 0,
  version: 0,
  assignees: [],
  labels: [],
  subtasks: [],
  attachments: [],
  _count: { comments: 0, attachments: 0 },
  project,
} as Task;
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), { status });
const page = (items: Task[], pageNumber: number): Page<Task> => ({
  items,
  total: 2,
  page: pageNumber,
  limit: 1,
});

describe('project task pagination errors', () => {
  it('keeps loaded tasks visible and offers a retry when loading the next page fails', async () => {
    let pageTwoAttempts = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/workspaces') return response([workspace]);
      if (url.pathname === `/api/projects/${project.id}`) return response(project);
      if (url.pathname === `/api/projects/${project.id}/tasks`) {
        const pageNumber = Number(url.searchParams.get('page'));
        if (pageNumber === 1) return response(page([task], 1));
        pageTwoAttempts += 1;
        if (pageTwoAttempts === 1)
          return new Response(JSON.stringify({ success: false, message: 'Temporary outage' }), {
            status: 503,
          });
        return response(page([], 2));
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/app/projects/${project.id}?view=Tasks`]}>
          <Routes>
            <Route path="/app/projects/:id" element={<ProjectPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(task.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more tasks (1 of 2)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t load more tasks. Your loaded tasks are still available.',
    );
    expect(screen.getByText(task.title)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Load more tasks (1 of 2)' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(pageTwoAttempts).toBe(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(task.title)).toBeInTheDocument();
  });
});
