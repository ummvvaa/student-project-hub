import { HTMLAttributes } from 'react';
import clsx from 'clsx';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger:  'bg-red-100   text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info:    'bg-blue-100  text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Convenience helpers — map domain values to badge variants

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    ADMIN: 'danger',
    TEACHER: 'info',
    STUDENT: 'default',
  };
  return <Badge variant={map[role] ?? 'default'}>{role}</Badge>;
}

export function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    TODO: 'default',
    IN_PROGRESS: 'warning',
    DONE: 'success',
  };
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    COMPLETED: 'info',
    ARCHIVED: 'default',
  };
  const label: Record<string, string> = {
    ACTIVE: 'Активный',
    COMPLETED: 'Завершён',
    ARCHIVED: 'В архиве',
  };
  return <Badge variant={map[status] ?? 'default'}>{label[status] ?? status}</Badge>;
}
