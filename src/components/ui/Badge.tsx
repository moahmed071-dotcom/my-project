import type { ReactNode } from 'react';
import type { ProjectStatus } from '@/types';
import { cn } from '@/lib/cn';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-fog-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusStyles: Record<ProjectStatus, string> = {
  Planning: 'text-sky-300 border-sky-400/20 bg-sky-400/[0.07]',
  'In Progress': 'text-accent border-accent/25 bg-accent/[0.07]',
  Review: 'text-amber-300 border-amber-400/20 bg-amber-400/[0.07]',
  Delivered: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/[0.07]',
  'On Hold': 'text-fog-400 border-white/10 bg-white/[0.03]',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
