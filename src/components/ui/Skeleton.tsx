import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-white/[0.04]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

function useElapsedSeconds() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return s;
}

export function GeneratingSkeleton({ label = 'Generating…', blocks = 4, hint }: { label?: string; blocks?: number; hint?: string }) {
  const elapsed = useElapsedSeconds();
  return (
    <div className="surface animate-fade-in p-6 sm:p-8" aria-busy="true" aria-live="polite">
      <div className="mb-8 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="text-sm text-fog-300">{label}</span>
        {elapsed > 0 && <span className="ml-auto font-mono text-[11px] tabular-nums text-fog-500">{elapsed}s</span>}
      </div>
      {hint && <p className="-mt-5 mb-8 text-xs text-fog-500">{hint}</p>}
      <Skeleton className="mb-3 h-8 w-2/3" />
      <Skeleton className="mb-10 h-4 w-1/3" />
      <div className="space-y-8">
        {Array.from({ length: blocks }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
