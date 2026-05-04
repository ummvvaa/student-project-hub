'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Task, TaskStatus, ApiError } from '../types';
import { TaskCard } from './TaskCard';
import { triggerAuthRefresh } from '../hooks/useAuth';
import { BADGES } from '../lib/badges';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO',        label: 'К выполнению', color: 'bg-gray-100 dark:bg-gray-800/60'   },
  { id: 'IN_PROGRESS', label: 'В процессе',   color: 'bg-blue-50 dark:bg-blue-950/30'    },
  { id: 'DONE',        label: 'Готово',        color: 'bg-green-50 dark:bg-green-950/30'   },
];

function KanbanColumn({
  id,
  label,
  color,
  tasks,
  onAddClick,
  onCardClick,
  readOnly,
}: {
  id: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onAddClick: (status: TaskStatus) => void;
  onCardClick: (task: Task) => void;
  readOnly?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col rounded-2xl p-3 transition-colors min-h-[200px]',
        color,
        isOver && !readOnly && 'ring-2 ring-indigo-300',
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-300 dark:shadow-none">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={readOnly ? undefined : () => onCardClick(task)}
            disabled={readOnly}
          />
        ))}
      </div>

      {!readOnly && (
        <button
          onClick={() => onAddClick(id)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-xs text-gray-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-600 dark:text-gray-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить задачу
        </button>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  readOnly?: boolean;
}

export function KanbanBoard({ tasks, onTasksChange, onAddTask, onEditTask, readOnly }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  // Empty sensors when readOnly: no drag activation
  const emptySensors = useSensors();

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (readOnly) return;
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    const snapshot = tasks.map((t) => ({ ...t }));
    onTasksChange(tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      const { data } = await api.patch<{
        task: Task;
        pointsDelta: number;
        newBadges: string[];
      }>(`/tasks/${task.id}`, { status: newStatus });

      if (data.pointsDelta > 0) {
        toast.success(`+${data.pointsDelta} очков!`, { icon: '🏆' });
        triggerAuthRefresh();
      }
      data.newBadges.forEach((code) => {
        const info = BADGES[code];
        const label = info ? `${info.emoji} ${info.name}` : code;
        toast.success(`Новый бейдж: ${label}`, { duration: 5000, icon: '🎉' });
      });
    } catch (err) {
      onTasksChange(snapshot);
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка обновления задачи'
          : 'Ошибка обновления задачи',
      );
    }
  }

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <DndContext
      sensors={readOnly ? emptySensors : sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[272px] flex-shrink-0 sm:min-w-0">
            <KanbanColumn
              id={col.id}
              label={col.label}
              color={col.color}
              tasks={byStatus(col.id)}
              onAddClick={onAddTask}
              onCardClick={onEditTask}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
