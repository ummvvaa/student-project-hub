import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function ProjectCardSkeleton() {
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-4 w-28" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-20" />
    </Card>
  );
}
