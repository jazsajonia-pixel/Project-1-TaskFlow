import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  GripVertical,
  MessageSquare,
  Paperclip,
  CalendarDays,
  ListChecks,
} from 'lucide-react';
import { useAction } from '../hooks/use-data';
import { api, json } from '../services/api';
import { Avatar, Badge } from '../components/common';
import { pretty, date, statuses } from '../lib/utils';
import type { Task, TaskStatus } from '../types';
export const boardCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const task = hits.find((hit) => !statuses.includes(hit.id as TaskStatus));
  return task ? [task] : hits.length ? hits : closestCorners(args);
};
export function Kanban({
  tasks,
  canWrite,
  onOpen,
  onCreate,
}: {
  tasks: Task[];
  canWrite: boolean;
  onOpen: (id: string) => void;
  onCreate: (status: TaskStatus) => void;
}) {
  const [active, setActive] = useState<Task>();
  const [optimistic, setOptimistic] = useState<{
    id: string;
    status: TaskStatus;
    position: number;
  }>();
  const move = useAction((data: { task: Task; status: TaskStatus; position: number }) =>
    api(
      `/tasks/${data.task.id}`,
      json('PATCH', { status: data.status, position: data.position, version: data.task.version }),
    ),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const shown = tasks
    .map((t) => (optimistic?.id === t.id ? { ...t, ...optimistic } : t))
    .sort((a, b) => a.position - b.position);
  function dragEnd(event: DragEndEvent) {
    setActive(undefined);
    const { active: item, over } = event;
    if (!over || item.id === over.id) return;
    const task = tasks.find((t) => t.id === item.id);
    const target = tasks.find((t) => t.id === over.id);
    const status =
      target?.status ??
      (statuses.includes(over.id as TaskStatus) ? (over.id as TaskStatus) : undefined);
    if (!task || !status) return;
    const destination = tasks
      .filter((t) => t.status === status && t.id !== task.id)
      .sort((a, b) => a.position - b.position);
    let index = target ? destination.findIndex((t) => t.id === target.id) : destination.length;
    if (target && task.status === status && task.position < target.position) index++;
    const before = destination[index - 1]?.position ?? 0;
    const after = destination[index]?.position ?? before + 2048;
    const position = (before + after) / 2;
    setOptimistic({ id: task.id, status, position });
    move.mutate({ task, status, position }, { onSettled: () => setOptimistic(undefined) });
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollision}
      onDragStart={(e: DragStartEvent) => setActive(tasks.find((t) => t.id === e.active.id))}
      onDragEnd={dragEnd}
      onDragCancel={() => setActive(undefined)}
    >
      <div className="kanban-board">
        {statuses.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={shown.filter((t) => t.status === status)}
            canWrite={canWrite && !move.isPending}
            onOpen={onOpen}
            onCreate={() => onCreate(status)}
          />
        ))}
      </div>
      <DragOverlay>
        {active && (
          <div className="drag-card">
            <TaskCard task={active} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
function Column({
  status,
  tasks,
  canWrite,
  onOpen,
  onCreate,
}: {
  status: TaskStatus;
  tasks: Task[];
  canWrite: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`kanban-column ${isOver ? 'column-over' : ''}`}>
      <header>
        <span className={`status-dot ${status.toLowerCase()}`} />
        <h2>{pretty(status)}</h2>
        <span className="column-count">{tasks.length}</span>
        {canWrite && (
          <button
            className="icon-button"
            onClick={onCreate}
            aria-label={`Add task to ${pretty(status)}`}
          >
            <Plus size={16} />
          </button>
        )}
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="column-tasks">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} disabled={!canWrite} onOpen={() => onOpen(t.id)} />
          ))}
          {!tasks.length && <p className="column-empty">A little room for what’s next.</p>}
        </div>
      </SortableContext>
      {canWrite && (
        <button className="add-task-button" onClick={onCreate}>
          <Plus size={15} /> Add task
        </button>
      )}
    </section>
  );
}
function SortableCard({
  task,
  onOpen,
  disabled,
}: {
  task: Task;
  onOpen: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <TaskCard
        task={task}
        onOpen={onOpen}
        handle={
          !disabled && (
            <button
              className="drag-handle"
              aria-label={`Move ${task.title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={15} />
            </button>
          )
        }
      />
    </div>
  );
}
export function TaskCard({
  task,
  onOpen,
  handle,
}: {
  task: Task;
  onOpen: () => void;
  handle?: React.ReactNode;
}) {
  return (
    <article className="task-card">
      <div className="task-card-top">
        <span className="task-reference">TF-{task.id.slice(-4).toUpperCase()}</span>
        {handle}
      </div>
      <button className="task-card-main" onClick={onOpen}>
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
      </button>
      {task.labels.length > 0 && (
        <div className="card-labels">
          {task.labels.slice(0, 3).map((l) => (
            <span
              className="task-label"
              style={{
                color: `color-mix(in srgb, ${l.label.color} 55%, var(--text))`,
                background: `${l.label.color}13`,
              }}
              key={l.labelId}
            >
              {l.label.name}
            </span>
          ))}
        </div>
      )}
      <div className="task-card-meta">
        <Badge value={task.priority} />
        {task.dueDate && (
          <span
            className={
              new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'overdue-text' : ''
            }
          >
            <CalendarDays size={12} />
            {date(task.dueDate)}
          </span>
        )}
      </div>
      <footer>
        <div className="task-counters">
          {!!task._count.comments && (
            <span>
              <MessageSquare size={13} />
              {task._count.comments}
            </span>
          )}
          {!!task._count.attachments && (
            <span>
              <Paperclip size={13} />
              {task._count.attachments}
            </span>
          )}
          {!!task.subtasks.length && (
            <span>
              <ListChecks size={13} />
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
            </span>
          )}
        </div>
        <div className="avatar-stack">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar user={a.user} key={a.userId} size="small" />
          ))}
        </div>
      </footer>
    </article>
  );
}
