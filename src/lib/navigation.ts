import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  PenTool,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: 'Workspace' | 'Create' | 'System';
  keywords?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace', keywords: 'home overview' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, group: 'Workspace', keywords: 'work jobs' },
  { to: '/clients', label: 'Clients', icon: Users, group: 'Workspace', keywords: 'customers accounts' },
  { to: '/brief', label: 'Creative Brief', icon: FileText, group: 'Create', keywords: 'brief generator' },
  { to: '/campaign', label: 'Campaign Generator', icon: Megaphone, group: 'Create', keywords: 'campaign idea tagline' },
  { to: '/prompts', label: 'Prompt Generator', icon: Sparkles, group: 'Create', keywords: 'ai prompt image video midjourney' },
  { to: '/studio', label: 'Design Studio', icon: PenTool, group: 'Create', keywords: 'design editor canvas social post template layout' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'System', keywords: 'preferences profile data' },
];
