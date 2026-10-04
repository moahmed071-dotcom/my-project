import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, FolderKanban, LayoutGrid, Megaphone, PenTool, Search, Sparkles, Users } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { search, type SearchKind } from '@/lib/search';
import { cn } from '@/lib/cn';

export const KIND_ICONS: Record<SearchKind, typeof Search> = {
  Page: LayoutGrid,
  Project: FolderKanban,
  Client: Users,
  Brief: FileText,
  Campaign: Megaphone,
  Prompt: Sparkles,
  Design: PenTool,
};

export function GlobalSearch() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => search(store, q).slice(0, 8), [store, q]);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => setActive(0), [q]);

  function go(to: string) {
    navigate(to);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!q.trim()) return;
      if (active < results.length) go(results[active].to);
      else go(`/search?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search projects, clients, briefs…"
        className="h-10 w-full rounded-xl border border-white/[0.06] bg-ink-900 pl-10 pr-14 text-sm text-fog-50 placeholder:text-fog-500 transition focus:border-accent/40 focus:bg-ink-850 focus:outline-none focus:ring-2 focus:ring-accent/15"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open && !!q.trim()}
        aria-controls="global-search-results"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-fog-400 sm:block">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>

      {open && q.trim() && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-30 animate-scale-in overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-fog-400">
              No matches for <span className="text-fog-100">“{q}”</span>
            </div>
          ) : (
            results.map((r, i) => {
              const Icon = KIND_ICONS[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.to)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    i === active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-750">
                    <Icon className="h-4 w-4 text-fog-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fog-50">{r.title}</p>
                    <p className="truncate text-xs text-fog-500">{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-fog-500">{r.kind}</span>
                </button>
              );
            })
          )}
          <button
            onMouseEnter={() => setActive(results.length)}
            onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
            className={cn(
              'mt-1 flex w-full items-center justify-between rounded-xl border-t border-white/[0.06] px-3 py-2.5 text-xs text-fog-400 transition',
              active === results.length ? 'bg-white/[0.06] text-fog-100' : 'hover:text-fog-100',
            )}
          >
            See all results for “{q.trim()}”
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
