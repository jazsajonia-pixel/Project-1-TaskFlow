import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskDialog } from '../../client/src/features/task-editor';
import MyTasks from '../../client/src/pages/my-tasks';
import { Stats } from '../../client/src/features/analytics';
import type { Project, Analytics } from '../../client/src/types';
const project = {
  id: 'clproject12345678901234567',
  workspaceId: 'clworkspace12345678901234',
  name: 'Integration project',
  labels: [],
  members: [],
} as unknown as Project;
const wrapper = (node: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), { status });
describe('task workflows', () => {
  it('creates a validated task through the API with its selected status and priority', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
      const path = String(input);
      if (options?.method === 'POST') return response({ id: 'new-task', version: 0 }, 201);
      if (path === '/api/workspaces')
        return response([{ id: project.workspaceId, name: 'Team', members: [{ role: 'OWNER' }] }]);
      if (path.includes('/members')) return response({ items: [], total: 0 });
      return response({});
    });
    const close = vi.fn();
    wrapper(<TaskDialog project={project} open onClose={close} defaultStatus="IN_PROGRESS" />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText('Task title')).toBeEnabled());
    await user.type(screen.getByLabelText('Task title'), 'Ship the onboarding flow');
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST');
    expect(call?.[0]).toBe(`/api/projects/${project.id}/tasks`);
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      title: 'Ship the onboarding flow',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    });
  });
  it('sends task filters to the server and shows the empty result', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => response({ items: [], total: 0, page: 1, limit: 20 }));
    wrapper(<MyTasks />);
    const user = userEvent.setup();
    await screen.findByText('A little breathing room');
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'DONE');
    await user.selectOptions(screen.getByLabelText('Filter by priority'), 'HIGH');
    await user.type(screen.getByLabelText('Filter tasks'), 'authentication');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          (c) =>
            String(c[0]).includes('q=authentication') &&
            String(c[0]).includes('status=DONE') &&
            String(c[0]).includes('priority=HIGH'),
        ),
      ).toBe(true),
    );
  });
  it('renders dashboard metrics from the supplied analytics', () => {
    wrapper(
      <Stats
        data={
          {
            projects: 4,
            open: 11,
            completed: 21,
            total: 32,
            overdue: 3,
            completion: 66,
          } as Analytics
        }
      />,
    );
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('66% of all tasks')).toBeInTheDocument();
    expect(screen.getByText('A little attention needed')).toBeInTheDocument();
  });
});
