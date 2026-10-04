import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, MobileSidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Pages with a #section link handle their own scrolling.
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMobileOpen(true)} onNewProject={() => navigate('/projects?new=1')} />
        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(198,244,50,0.07),transparent_70%)]" />
          <div key={location.pathname} className="relative mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
