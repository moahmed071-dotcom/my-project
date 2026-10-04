import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A titled section inside generated output. */
export function OutputBlock({
  index,
  title,
  children,
  className,
  actions,
}: {
  index?: number;
  title: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('group border-t border-white/[0.06] py-7 first:border-t-0 first:pt-0', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-baseline gap-3">
          {index !== undefined && <span className="font-mono text-[11px] text-fog-500">{String(index).padStart(2, '0')}</span>}
          <span className="label text-fog-300">{title}</span>
        </h3>
        {actions}
      </div>
      <div dir="auto" className="whitespace-pre-line text-[15px] leading-relaxed text-fog-200">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} dir="auto" className="flex gap-3">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
