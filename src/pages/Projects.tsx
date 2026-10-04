import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, FolderKanban, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { PROJECT_CATEGORIES, PROJECT_STATUSES, type Project, type ProjectStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { loadJSON, saveJSON } from '@/lib/storage';

type View = 'grid' | 'list';
type Sort = 'updated' | 'created' | 'name';

export default function Projects() {
  const { projects, clientById, deleteProject } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [view, setView] = useState<View>(() => loadJSON<View>('projectsView', 'grid'));
  const focusId = params.get('focus');

  useEffect(() => {
    saveJSON('projectsView', view);
  }, [view]);

  // Deep links: ?new=1 opens the form, ?focus=id highlights a project.
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`project-${focusId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => {
      params.delete('focus');
      setParams(params, { replace: true });
    }, 2400);
    return () => clearTimeout(t);
  }, [focusId, params, setParams]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: projects.length };
    for (const s of PROJECT_STATUSES) c[s] = projects.filter((p) => p.status === s).length;
    return c;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => status === 'All' || p.status === status)
      .filter((p) => !category || p.category === category)
      .filter(
        (p) =>
          !q ||
          [p.name, p.description, p.category, clientById(p.clientId)?.company ?? ''].join(' ').toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [projects, status, category, query, sort, clientById]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Every brand, launch and production you’re running — in one place."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
            New project
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to track status, clients and deliverables."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
              Create project
            </Button>
          }
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-6 space-y-4">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
              {(['All', ...PROJECT_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                    status === s
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-white/[0.06] text-fog-400 hover:border-white/[0.12] hover:text-fog-100',
                  )}
                >
                  {s}
                  <span className="font-mono text-[10px] opacity-70">{counts[s]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter projects…"
                  className="field pl-10"
                  aria-label="Filter projects"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  wrapperClassName="flex-1 sm:w-44"
                  value={category}
                  placeholder="All categories"
                  options={PROJECT_CATEGORIES}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Category"
                />
                <Select
                  wrapperClassName="flex-1 sm:w-40"
                  value={sort}
                  options={[
                    { value: 'updated', label: 'Last updated' },
                    { value: 'created', label: 'Newest' },
                    { value: 'name', label: 'Name A–Z' },
                  ]}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label="Sort"
                />
                <div className="hidden rounded-xl border border-white/[0.08] bg-ink-850 p-1 sm:flex">
                  {([
                    ['grid', LayoutGrid],
                    ['list', List],
                  ] as const).map(([v, Icon]) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn('rounded-lg p-1.5 transition', view === v ? 'bg-white/[0.08] text-fog-50' : 'text-fog-500 hover:text-fog-200')}
                      aria-label={`${v} view`}
                      aria-pressed={view === v}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="No projects match these filters"
              description="Try a different status, category or search term."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatus('All');
                    setCategory('');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {filtered.map((p, i) => (
                <article
                  key={p.id}
                  id={`project-${p.id}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  className={cn(
                    'surface group flex animate-fade-up flex-col p-5 transition-all duration-300 hover:border-white/[0.12]',
                    focusId === p.id && 'border-accent/50 shadow-glow',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge>{p.category}</Badge>
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-fog-50">{p.name}</h3>
                  <p className="mt-1 text-sm text-fog-400">{clientById(p.clientId)?.company ?? 'No client'}</p>
                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-fog-400">{p.description || 'No description yet.'}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-4">
                    <span className="flex items-center gap-1.5 text-[11px] text-fog-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(p.createdAt)}
                    </span>
                    <div className="flex gap-1 opacity-100 transition sm:opacity-60 sm:group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:text-red-300" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <div className="hidden grid-cols-12 gap-4 border-b border-white/[0.06] px-5 py-3 md:grid">
                {['Project', 'Client', 'Category', 'Status', 'Created', ''].map((h, i) => (
                  <span key={i} className={cn('label text-[10px]', ['col-span-4', 'col-span-2', 'col-span-2', 'col-span-2', 'col-span-1', 'col-span-1'][i])}>
                    {h}
                  </span>
                ))}
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {filtered.map((p) => (
                  <li
                    key={p.id}
                    id={`project-${p.id}`}
                    className={cn('grid grid-cols-12 items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]', focusId === p.id && 'bg-accent/[0.06]')}
                  >
                    <div className="col-span-9 min-w-0 md:col-span-4">
                      <p className="truncate text-sm font-medium text-fog-50">{p.name}</p>
                      <p className="truncate text-xs text-fog-500 md:hidden">
                        {clientById(p.clientId)?.company ?? 'No client'} · {p.status}
                      </p>
                    </div>
                    <span className="col-span-2 hidden truncate text-sm text-fog-300 md:block">{clientById(p.clientId)?.company ?? '—'}</span>
                    <span className="col-span-2 hidden text-sm text-fog-400 md:block">{p.category}</span>
                    <span className="col-span-2 hidden md:block">
                      <StatusBadge status={p.status} />
                    </span>
                    <span className="col-span-1 hidden text-xs text-fog-500 md:block">{formatDate(p.createdAt)}</span>
                    <div className="col-span-3 flex justify-end gap-1 md:col-span-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:text-red-300" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ProjectFormModal
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(p) => toast(editing ? `Saved “${p.name}”` : `Created “${p.name}”`)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete project?"
        message={`“${deleting?.name}” will be permanently removed. This can’t be undone.`}
        onConfirm={() => {
          if (deleting) {
            deleteProject(deleting.id);
            toast(`Deleted “${deleting.name}”`, 'info');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
