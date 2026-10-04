import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  FolderKanban,
  Megaphone,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { formatLongDate, greeting, pluralize, timeAgo } from '@/lib/format';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';

function Stat({ label, value, sub, to, delay }: { label: string; value: number; sub: string; to: string; delay: number }) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="surface group animate-fade-up p-5 transition hover:border-white/[0.12]"
    >
      <div className="flex items-center justify-between">
        <p className="label">{label}</p>
        <ArrowUpRight className="h-4 w-4 text-fog-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-4 text-4xl font-semibold tracking-tightest text-fog-50">{value}</p>
      <p className="mt-1 text-xs text-fog-500">{sub}</p>
    </Link>
  );
}

function SectionCard({
  title,
  to,
  linkLabel = 'View all',
  children,
  className,
}: {
  title: string;
  to: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('surface animate-fade-up p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fog-50">{title}</h2>
        <Link to={to} className="flex items-center gap-1 text-xs text-fog-400 transition hover:text-accent">
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

const QUICK_TOOLS: { to: string; title: string; description: string; icon: LucideIcon; tag: string }[] = [
  { to: '/brief', title: 'Creative Brief', description: 'Turn a client request into a structured, ready-to-share brief.', icon: FileText, tag: '9 sections' },
  { to: '/campaign', title: 'Campaign Generator', description: 'Big idea, taglines, art direction, social and video concepts.', icon: Megaphone, tag: 'Full concept' },
  { to: '/prompts', title: 'AI Prompt Generator', description: 'Production-grade prompts for image, video and archviz tools.', icon: Sparkles, tag: '6 formats' },
];

export default function Dashboard() {
  const { settings, projects, clients, briefs, campaigns, promptSets, clientById } = useStore();
  const navigate = useNavigate();

  const active = projects.filter((p) => p.status === 'In Progress' || p.status === 'Review');
  const recentProjects = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentBriefs = [...briefs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const recentCampaigns = [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  const quickActions = [
    { label: 'New project', icon: Plus, onClick: () => navigate('/projects?new=1'), primary: true },
    { label: 'Write a brief', icon: FileText, onClick: () => navigate('/brief') },
    { label: 'Build a campaign', icon: Megaphone, onClick: () => navigate('/campaign') },
    { label: 'Generate prompts', icon: Sparkles, onClick: () => navigate('/prompts') },
    { label: 'Add client', icon: UserPlus, onClick: () => navigate('/clients?new=1') },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Welcome */}
      <section className="relative animate-fade-up overflow-hidden rounded-3xl border border-white/[0.06] bg-ink-900 p-6 sm:p-10">
        <div className="grain pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 hidden select-none font-display text-[220px] italic leading-[0.7] text-white/[0.025] lg:block">
          os
        </div>
        <div className="relative">
          <p className="label">{formatLongDate()}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tightest text-fog-50 sm:text-5xl lg:text-6xl">
            {greeting()}, <span className="font-display font-normal italic text-accent">{settings.userName || 'Mohamed'}</span>.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fog-400">
            You have {pluralize(active.length, 'active project')} across {pluralize(clients.length, 'client')}. Pick up where you left off, or start
            something new.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {quickActions.map(({ label, icon: Icon, onClick, primary }) => (
              <button
                key={label}
                onClick={onClick}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                  primary
                    ? 'bg-accent text-ink-950 hover:bg-accent-strong hover:shadow-glow'
                    : 'border border-white/10 bg-white/[0.03] text-fog-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-fog-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Active projects" value={active.length} sub={`${projects.length} total`} to="/projects" delay={40} />
        <Stat label="Clients" value={clients.length} sub="In your roster" to="/clients" delay={80} />
        <Stat label="Briefs" value={briefs.length} sub="Generated & saved" to="/brief" delay={120} />
        <Stat label="Campaigns" value={campaigns.length} sub={`${promptSets.length} prompt sets`} to="/campaign" delay={160} />
      </section>

      {/* Quick tools */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-fog-50">Quick tools</h2>
          <p className="text-xs text-fog-500">Powered by {settings.aiProvider === 'claude' ? 'Claude' : settings.aiProvider === 'local' ? 'the local creative engine' : 'the remote AI endpoint'}</p>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {QUICK_TOOLS.map(({ to, title, description, icon: Icon, tag }, i) => (
            <Link
              key={to}
              to={to}
              style={{ animationDelay: `${i * 60}ms` }}
              className="surface group relative animate-fade-up overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/0 blur-2xl transition-all duration-500 group-hover:bg-accent/15" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-ink-800 transition group-hover:border-accent/40">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-fog-400">{tag}</span>
              </div>
              <h3 className="relative mt-6 text-base font-semibold text-fog-50">{title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-fog-400">{description}</p>
              <span className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-fog-300 transition group-hover:gap-2.5 group-hover:text-accent">
                Open tool <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 [&>*]:min-w-0">
        <SectionCard title="Recent projects" to="/projects" className="lg:col-span-3">
          {recentProjects.length === 0 ? (
            <EmptyState
              compact
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start tracking work."
              action={
                <Link to="/projects?new=1" className="text-sm font-medium text-accent hover:underline">
                  Create a project
                </Link>
              }
            />
          ) : (
            <ul className="-mx-2 divide-y divide-white/[0.04]">
              {recentProjects.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects?focus=${p.id}`} className="flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-white/[0.03]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-750">
                      <FolderKanban className="h-4 w-4 text-fog-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fog-50">{p.name}</p>
                      <p className="truncate text-xs text-fog-500">
                        {clientById(p.clientId)?.company ?? 'No client'} · {p.category}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <StatusBadge status={p.status} />
                    </div>
                    <span className="hidden w-16 text-right text-[11px] text-fog-500 md:block">{timeAgo(p.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent creative briefs" to="/brief" linkLabel="Open generator" className="lg:col-span-2">
          {recentBriefs.length === 0 ? (
            <EmptyState compact icon={FileText} title="No briefs yet" description="Generate a brief and it will appear here." />
          ) : (
            <ul className="space-y-2">
              {recentBriefs.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/brief?id=${b.id}`}
                    className="block rounded-xl border border-white/[0.04] bg-ink-850/60 p-3.5 transition hover:border-white/[0.1] hover:bg-ink-850"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-fog-50">{b.input.projectName}</p>
                      <span className="shrink-0 text-[11px] text-fog-500">{timeAgo(b.createdAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-fog-500">
                      {b.input.client} · {b.input.projectType || 'Brief'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent campaigns" to="/campaign" linkLabel="Open generator">
        {recentCampaigns.length === 0 ? (
          <EmptyState compact icon={Megaphone} title="No campaigns yet" description="Generate a campaign concept to see it here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {recentCampaigns.map((c) => (
              <Link
                key={c.id}
                to={`/campaign?id=${c.id}`}
                className="group flex flex-col rounded-2xl border border-white/[0.05] bg-ink-850/60 p-5 transition hover:border-accent/25"
              >
                <p className="label text-[10px]">
                  {c.input.brand}
                  {c.input.occasion ? ` · ${c.input.occasion}` : ''}
                </p>
                <p className="mt-3 font-display text-2xl italic leading-tight text-fog-50">“{c.output.bigIdea}”</p>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-fog-400">{c.output.taglines[0]}</p>
                <div className="mt-auto flex items-center justify-between pt-5 text-[11px] text-fog-500">
                  <span>{c.input.product}</span>
                  <span>{timeAgo(c.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      {clients.length === 0 && (
        <EmptyState
          icon={Users}
          title="Build your client roster"
          description="Clients connect your projects, briefs and campaigns."
          action={
            <Link to="/clients?new=1" className="text-sm font-medium text-accent hover:underline">
              Add a client
            </Link>
          }
        />
      )}
    </div>
  );
}
