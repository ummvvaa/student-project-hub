'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from 'lucide-react';
import clsx from 'clsx';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  overlay?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function TaskCard({ task, overlay = false, onClick, disabled }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: overlay || disabled,
  });

  const style = overlay
    ? { transform: 'rotate(2deg) scale(1.03)' }
    : { transform: CSS.Translate.toString(transform) };

  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue =
    deadline !== null && deadline < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={onClick}
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-3 shadow-sm select-none',
        'dark:border-gray-700 dark:bg-gray-800 dark:shadow-none',
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        'transition-shadow hover:shadow-md dark:hover:border-gray-600',
        isDragging && !overlay && 'opacity-30',
        overlay && 'shadow-xl ring-2 ring-indigo-300 dark:ring-indigo-500',
      )}
    >
      <p className="mb-2 text-sm font-medium text-gray-900 line-clamp-2 dark:text-gray-100">
        {task.title}
      </p>

      {deadline && (
        <div
          className={clsx(
            'mb-2 flex items-center gap-1 text-xs',
            overdue ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500',
          )}
        >
          <Calendar className="h-3 w-3 flex-shrink-0" />
          {deadline.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          })}
          {overdue && ' — просрочено'}
        </div>
      )}

      {task.assignee && (
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {task.assignee.fullName?.[0] ?? '?'}
          </div>
          <span className="text-xs text-gray-500 truncate dark:text-gray-400">
            {task.assignee.fullName}
          </span>
        </div>
      )}
    </div>
  );
}
