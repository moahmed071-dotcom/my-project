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

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="clients" element={<Clients />} />
        <Route path="brief" element={<BriefGenerator />} />
        <Route path="campaign" element={<CampaignGenerator />} />
        <Route path="prompts" element={<PromptGenerator />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
