import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FolderKanban, Mail, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import type { Client } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function Clients() {
  const { clients, projects, projectCountFor, deleteClient } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const focusId = params.get('focus');

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
    document.getElementById(`client-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => {
      params.delete('focus');
      setParams(params, { replace: true });
    }, 2400);
    return () => clearTimeout(t);
  }, [focusId, params, setParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...clients]
      .filter((c) => !q || [c.name, c.company, c.industry, c.notes, c.email].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [clients, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Clients"
        description="The people and brands you build for — with context that makes every brief sharper."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
            New client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add a client to link projects and keep notes on preferences and approvals."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
              Add client
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter clients…" className="field pl-10" aria-label="Filter clients" />
            </div>
            <p className="text-xs text-fog-500">
              {pluralize(clients.length, 'client')} · {pluralize(projects.filter((p) => p.clientId).length, 'linked project')}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState compact icon={Search} title="No clients match" description="Try a different name, company or industry." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {filtered.map((c, i) => {
                const count = projectCountFor(c.id);
                return (
                  <article
                    key={c.id}
                    id={`client-${c.id}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    className={cn(
                      'surface group flex animate-fade-up flex-col p-5 transition-all duration-300 hover:border-white/[0.12]',
                      focusId === c.id && 'border-accent/50 shadow-glow',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar name={c.company} className="h-12 w-12 text-sm" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-fog-50">{c.company}</h3>
                        <p className="truncate text-sm text-fog-400">{c.name}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.industry && <Badge>{c.industry}</Badge>}
                      <Link to={`/search?q=${encodeURIComponent(c.company)}`}>
                        <Badge className="transition hover:border-accent/30 hover:text-accent">
                          <FolderKanban className="h-3 w-3" />
                          {pluralize(count, 'project')}
                        </Badge>
                      </Link>
                    </div>
                    <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-fog-400">{c.notes || 'No notes yet.'}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-1.5 truncate text-xs text-fog-500 transition hover:text-accent">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-fog-600">No email</span>
                      )}
                      <div className="flex shrink-0 gap-1 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${c.company}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="hover:text-red-300" onClick={() => setDeleting(c)} aria-label={`Delete ${c.company}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <ClientFormModal
        open={formOpen}
        client={editing}
        onClose={() => {
          setFormOpen(false);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete client?"
        message={
          deleting && projectCountFor(deleting.id) > 0
            ? `“${deleting.company}” will be removed. Its ${pluralize(projectCountFor(deleting.id), 'project')} will be kept but unlinked.`
            : `“${deleting?.company}” will be permanently removed.`
        }
        onConfirm={() => {
          if (deleting) {
            deleteClient(deleting.id);
            toast(`Deleted “${deleting.company}”`, 'info');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
