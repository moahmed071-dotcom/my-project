import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/lib/cn';
import { useStore } from '@/store/AppStore';
import { Logo } from './Logo';

const GROUPS = ['Workspace', 'Create', 'System'] as const;

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { projects } = useStore();
  const active = projects.filter((p) => p.status === 'In Progress' || p.status === 'Review').length;

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2 scrollbar-none" aria-label="Main">
      {GROUPS.map((group) => (
        <div key={group}>
          {!collapsed && <p className="label mb-2 px-3 text-[10px] text-fog-500">{group}</p>}
          <ul className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.group === group).map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-white/[0.06] text-fog-50' : 'text-fog-400 hover:bg-white/[0.03] hover:text-fog-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />}
                      <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive ? 'text-accent' : 'text-fog-500 group-hover:text-fog-300')} />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      {!collapsed && to === '/projects' && active > 0 && (
                        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-fog-300">{active}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ProfileCard({ collapsed }: { collapsed: boolean }) {
  const { settings } = useStore();
  return (
    <NavLink
      to="/settings"
      className={cn(
        'mx-3 mb-3 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-850 p-2.5 transition hover:border-white/[0.12]',
        collapsed && 'justify-center p-2',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/80 to-lime-600/60 text-xs font-bold text-ink-950">
        {settings.userName.slice(0, 1).toUpperCase() || 'M'}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fog-50">{settings.userName || 'Mohamed'}</p>
          <p className="truncate text-[11px] text-fog-500">{settings.role}</p>
        </div>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { settings, updateSettings } = useStore();
  const collapsed = settings.compactSidebar;
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/80 transition-[width] duration-300 lg:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center px-5', collapsed && 'justify-center px-0')}>
        <Logo collapsed={collapsed} />
      </div>
      <NavList collapsed={collapsed} />
      <button
        onClick={() => updateSettings({ compactSidebar: !collapsed })}
        className={cn(
          'mx-3 mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-fog-500 transition hover:bg-white/[0.03] hover:text-fog-200',
          collapsed && 'justify-center px-0',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && 'Collapse'}
      </button>
      <ProfileCard collapsed={collapsed} />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in-left flex-col border-r border-white/[0.06] bg-ink-950">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button onClick={onClose} className="rounded-lg p-2 text-fog-400 hover:bg-white/5 hover:text-fog-50" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavList collapsed={false} onNavigate={onClose} />
        <ProfileCard collapsed={false} />
      </aside>
    </div>
  );
}
