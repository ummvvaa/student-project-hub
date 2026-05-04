import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function TeamCardSkeleton() {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* deadline */}
      <Skeleton className="h-4 w-36" />

      {/* avatars */}
      <div className="flex -space-x-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-white" />
        ))}
      </div>

      {/* progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* button */}
      <Skeleton className="h-8 w-full rounded-lg" />
    </Card>
  );
}
