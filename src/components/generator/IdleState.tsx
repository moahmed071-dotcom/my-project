import type { LucideIcon } from 'lucide-react';

export function IdleState({ icon: Icon, title, description, points }: { icon: LucideIcon; title: string; description: string; points: string[] }) {
  return (
    <div className="surface grain relative flex min-h-[420px] animate-fade-in flex-col justify-between overflow-hidden p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-ink-800">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <h2 className="font-display text-3xl italic text-fog-50 sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-fog-400">{description}</p>
      </div>
      <ul className="relative mt-10 grid gap-2 sm:grid-cols-2">
        {points.map((p, i) => (
          <li key={p} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-ink-850/60 px-3 py-2.5 text-xs text-fog-300">
            <span className="font-mono text-[10px] text-fog-500">{String(i + 1).padStart(2, '0')}</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
