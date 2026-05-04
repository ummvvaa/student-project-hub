import { Skeleton } from '../ui/Skeleton';

export function ListSkeleton({ count = 3, height = 'h-10' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height}`} />
      ))}
    </div>
  );
}
