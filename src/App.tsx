import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import BriefGenerator from './pages/BriefGenerator';
import CampaignGenerator from './pages/CampaignGenerator';
import PromptGenerator from './pages/PromptGenerator';
import SettingsPage from './pages/Settings';
import SearchPage from './pages/Search';
import NotFound from './pages/NotFound';

// Design Studio is loaded on demand so the rest of the app stays light.
const StudioHome = lazy(() => import('./features/studio/pages/StudioHome'));
const NewDesign = lazy(() => import('./features/studio/pages/NewDesign'));
const DesignEditorPage = lazy(() => import('./features/studio/pages/DesignEditorPage'));

function Loading({ children, full }: { children: ReactNode; full?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className={full ? 'flex h-screen items-center justify-center bg-ink-950' : 'flex min-h-[40vh] items-center justify-center'} role="status" aria-label="Loading">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      {/* The design editor is a full-screen workspace with its own top bar. */}
      <Route path="studio/:id" element={<Loading full><DesignEditorPage /></Loading>} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="clients" element={<Clients />} />
        <Route path="brief" element={<BriefGenerator />} />
        <Route path="campaign" element={<CampaignGenerator />} />
        <Route path="prompts" element={<PromptGenerator />} />
        <Route path="studio" element={<Loading><StudioHome /></Loading>} />
        <Route path="studio/new" element={<Loading><NewDesign /></Loading>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
