import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';
import { hashString } from '@/services/ai/knowledge';

const tints = [
  'from-lime-300/30 to-lime-500/10 text-lime-200',
  'from-sky-300/30 to-sky-500/10 text-sky-200',
  'from-amber-300/30 to-amber-500/10 text-amber-200',
  'from-rose-300/30 to-rose-500/10 text-rose-200',
  'from-violet-300/30 to-violet-500/10 text-violet-200',
  'from-teal-300/30 to-teal-500/10 text-teal-200',
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br text-xs font-semibold',
        tints[hashString(name) % tints.length],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
