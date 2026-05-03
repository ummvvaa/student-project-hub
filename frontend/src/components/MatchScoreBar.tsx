'use client';

import clsx from 'clsx';

interface MatchScoreBarProps {
  score: number;        // 0..1
  matchedSkills: string[];
  showLabel?: boolean;
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 0.6) return 'bg-emerald-500';
  if (score >= 0.3) return 'bg-amber-400';
  return 'bg-gray-300';
}

function scoreTextColor(score: number): string {
  if (score >= 0.6) return 'text-emerald-700';
  if (score >= 0.3) return 'text-amber-700';
  return 'text-gray-400';
}

export function MatchScoreBar({
  score,
  matchedSkills,
  showLabel = true,
  className,
}: MatchScoreBarProps) {
  const pct = Math.round(score * 100);
  const tooltip =
    matchedSkills.length > 0
      ? `Совпадают: ${matchedSkills.join(', ')}`
      : 'Совпадений нет';

  return (
    <div className={clsx('flex items-center gap-2', className)} title={tooltip}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', scoreColor(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={clsx('w-9 text-right text-xs font-semibold tabular-nums', scoreTextColor(score))}>
          {pct}%
        </span>
      )}
    </div>
  );
}
