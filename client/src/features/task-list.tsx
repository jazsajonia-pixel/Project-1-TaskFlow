import { Badge, Avatars } from '../components/common';
import { date } from '../lib/utils';
import type { Task } from '../types';
export function TaskList({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  return (
    <div className="table-scroll">
      <table className="data-table task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignees</th>
            <th>Due date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <button onClick={() => onOpen(t)}>
                  <span className={`status-dot ${t.status.toLowerCase()}`} />
                  {t.title}
                </button>
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td>
                <Badge value={t.priority} />
              </td>
              <td>
                <Avatars people={t.assignees.map((a) => a.user)} />
              </td>
              <td>{date(t.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
