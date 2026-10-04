import { Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlobalSearch } from './GlobalSearch';
import { useStore } from '@/store/AppStore';

export function Header({ onMenu, onNewProject }: { onMenu: () => void; onNewProject: () => void }) {
  const { settings } = useStore();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-950/75 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <button onClick={onMenu} className="-ml-1 rounded-lg p-2 text-fog-300 hover:bg-white/5 hover:text-fog-50 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/settings"
          className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-ink-900 px-3 py-1.5 text-[11px] text-fog-400 transition hover:text-fog-100 md:flex"
          title="AI engine"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(198,244,50,0.8)]" />
          {settings.aiProvider === 'local' ? 'Local engine' : 'Remote AI'}
        </Link>
        <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />} onClick={onNewProject} className="px-3 sm:px-4">
          <span className="hidden sm:inline">New project</span>
        </Button>
      </div>
    </header>
  );
}
