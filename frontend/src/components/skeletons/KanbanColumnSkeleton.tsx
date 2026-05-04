import { Skeleton } from '../ui/Skeleton';
import { TaskCardSkeleton } from './TaskCardSkeleton';

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-gray-100 p-3 min-h-[200px]">
      <div className="mb-3 flex items-center justify-between px-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}
