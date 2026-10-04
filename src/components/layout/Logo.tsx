export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-ink-950 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 17V7l7 7 7-7v10" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-fog-50">Mohamed</div>
          <div className="mt-1 font-display text-[15px] italic text-fog-400">Creative OS</div>
        </div>
      )}
    </div>
  );
}
