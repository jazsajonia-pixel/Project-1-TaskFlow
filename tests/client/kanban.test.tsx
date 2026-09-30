import { describe, it, expect } from 'vitest';
import { boardCollision } from '../../client/src/features/kanban';
import type { CollisionDetection } from '@dnd-kit/core';
type Args = Parameters<CollisionDetection>[0];
describe('board drop targets', () => {
  it('prioritizes the column under the pointer when dropping into an empty column', () => {
    const rect = (left: number, width: number, height: number) => ({
      left,
      top: 0,
      right: left + width,
      bottom: height,
      width,
      height,
    });
    const args = {
      active: { id: 'task' },
      pointerCoordinates: { x: 350, y: 100 },
      collisionRect: rect(170, 190, 120),
      droppableRects: new Map([
        ['IN_PROGRESS', rect(0, 220, 400)],
        ['task', rect(10, 200, 120)],
        ['IN_REVIEW', rect(240, 220, 400)],
      ]),
      droppableContainers: [{ id: 'IN_PROGRESS' }, { id: 'task' }, { id: 'IN_REVIEW' }],
    } as unknown as Args;
    expect(boardCollision(args)[0].id).toBe('IN_REVIEW');
  });
  it('prioritizes a task under the pointer for in-column reordering', () => {
    const rect = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 };
    const args = {
      active: { id: 'moving' },
      pointerCoordinates: { x: 50, y: 30 },
      collisionRect: rect,
      droppableRects: new Map([
        ['TODO', { ...rect, bottom: 400, height: 400 }],
        ['target', rect],
      ]),
      droppableContainers: [{ id: 'TODO' }, { id: 'target' }],
    } as unknown as Args;
    expect(boardCollision(args)[0].id).toBe('target');
  });
});
