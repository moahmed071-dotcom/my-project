import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: Props) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-center',
        compact ? 'px-6 py-10' : 'px-6 py-16',
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-ink-800">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-fog-50">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fog-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
