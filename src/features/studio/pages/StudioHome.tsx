import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, LayoutTemplate, MoreHorizontal, PenTool, Plus, Star, Trash2 } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { DEFAULT_BRAND } from '../model/brand';
import { duplicateDesign, type DesignSetup } from '../model/document';
import { formatLabel } from '../model/formats';
import type { DesignDocument, SavedTemplate } from '../model/types';
import { TEMPLATES, type TemplateDefinition } from '../templates/library';
import { DesignThumb, SAMPLE_CONTENT, TemplatePreview } from '../components/DesignThumb';
import { FORMAT_PRESETS } from '../model/formats';
import { ensureDesignFonts } from '../model/fonts';

function previewSetup(t: TemplateDefinition): DesignSetup {
  const f = FORMAT_PRESETS.find((p) => p.id === t.defaultFormat) ?? FORMAT_PRESETS[0];
  return {
    name: t.name,
    clientId: null,
    campaign: '',
    platform: f.platform,
    formatId: f.id,
    width: f.width,
    height: f.height,
    brand: { ...DEFAULT_BRAND, name: 'Studio' },
    content: SAMPLE_CONTENT,
    heroImage: null,
  };
}

function SectionTitle({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-sm font-semibold text-fog-50">
        {title}
        {count !== undefined && <span className="font-mono text-[11px] font-normal text-fog-500">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

function DesignCard({ doc, onDuplicate, onDelete }: { doc: DesignDocument; onDuplicate: () => void; onDelete: () => void }) {
  const { clientById } = useStore();
  const [menu, setMenu] = useState(false);
  return (
    <article className="group relative animate-fade-up overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900 transition hover:border-white/[0.14]" data-testid="design-card">
      <Link to={`/studio/${doc.id}`} aria-label={`Open ${doc.name}`} tabIndex={-1}>
        <DesignThumb doc={doc} />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fog-50">{doc.name}</h3>
            <p className="mt-0.5 truncate text-xs text-fog-500">{clientById(doc.clientId)?.company ?? 'No client'}</p>
          </div>
          <div className="relative">
            <button type="button" aria-label={`More actions for ${doc.name}`} onClick={() => setMenu((m) => !m)} onBlur={() => setTimeout(() => setMenu(false), 150)} className="rounded-md p-1 text-fog-500 transition hover:bg-white/[0.06] hover:text-fog-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-7 z-10 w-40 animate-scale-in rounded-lg border border-white/[0.08] bg-ink-850 p-1 shadow-2xl">
                <button role="menuitem" type="button" onMouseDown={onDuplicate} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-fog-100 hover:bg-white/[0.05]">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button role="menuitem" type="button" onMouseDown={onDelete} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <dl className="mt-3 flex items-center justify-between gap-2 text-[11px] text-fog-500">
          <dd className="truncate">{formatLabel(doc.formatId, doc.width, doc.height)}</dd>
          <dd className="shrink-0">Edited {timeAgo(doc.updatedAt)}</dd>
        </dl>
        <Link to={`/studio/${doc.id}`} className="mt-4 flex h-8 items-center justify-center rounded-md border border-white/10 text-xs font-medium text-fog-100 transition hover:border-accent/50 hover:text-accent">
          Open
        </Link>
      </div>
    </article>
  );
}

function TemplateCard({ t, compact }: { t: TemplateDefinition; compact?: boolean }) {
  const { favoriteTemplates, toggleFavoriteTemplate } = useStore();
  const fav = favoriteTemplates.includes(t.id);
  const setup = useMemo(() => previewSetup(t), [t]);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900 transition hover:border-white/[0.14]" data-testid="template-card">
      <Link to={`/studio/new?template=${t.id}`} aria-label={`Use template ${t.name}`} className="block">
        <TemplatePreview templateId={t.id} setup={setup} frame={compact ? 'aspect-square' : 'aspect-[4/5]'} />
        <div className="p-3.5">
          <h3 className="text-sm font-medium text-fog-50">{t.name}</h3>
          {!compact && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fog-500">{t.description}</p>}
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-fog-500">{t.bestFor.join(' · ')}</p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={fav ? `Remove ${t.name} from favourites` : `Add ${t.name} to favourites`}
        aria-pressed={fav}
        onClick={() => toggleFavoriteTemplate(t.id)}
        className={cn('absolute right-2 top-2 rounded-md bg-ink-950/70 p-1.5 backdrop-blur transition', fav ? 'text-accent' : 'text-fog-400 opacity-0 hover:text-fog-50 focus:opacity-100 group-hover:opacity-100')}
      >
        <Star className={cn('h-4 w-4', fav && 'fill-current')} />
      </button>
    </div>
  );
}

function SavedTemplateCard({ t, onDelete }: { t: SavedTemplate; onDelete: () => void }) {
  const doc = useMemo(() => ({ id: t.id, width: t.width, height: t.height, background: t.background, elements: t.elements, brand: { ...DEFAULT_BRAND } }), [t]);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900">
      <DesignThumb doc={doc} frame="aspect-square" />
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-fog-100">{t.name}</p>
          <p className="text-[11px] text-fog-500">
            {t.width} × {t.height}
          </p>
        </div>
        <button type="button" aria-label={`Delete ${t.name}`} onClick={onDelete} className="rounded p-1 text-fog-500 opacity-0 transition hover:text-red-300 group-hover:opacity-100">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function StudioHome() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<DesignDocument | null>(null);
  useEffect(() => ensureDesignFonts(), []);
  const designs = useMemo(() => [...store.designs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [store.designs]);
  const favorites = TEMPLATES.filter((t) => store.favoriteTemplates.includes(t.id));

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Create"
        title="Design Studio"
        description="Build on-brand social posts from a brief. Pick a template or generate layout concepts, then refine every element on the canvas."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/studio/new')}>
            New Design
          </Button>
        }
      />

      <section>
        <SectionTitle title="Recent designs" count={designs.length} />
        {designs.length === 0 ? (
          <EmptyState
            icon={PenTool}
            title="No designs yet"
            description="Start from a brief: choose a format, pick your brand, then generate three layout concepts or start from a template."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/studio/new')}>
                  Create your first design
                </Button>
                <Button variant="outline" icon={<LayoutTemplate className="h-4 w-4" />} onClick={() => document.getElementById('template-library')?.scrollIntoView({ behavior: 'smooth' })}>
                  Browse templates
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
            {designs.map((d) => (
              <DesignCard
                key={d.id}
                doc={d}
                onDuplicate={() => {
                  const copy = duplicateDesign(d);
                  store.saveDesign(copy);
                  toast(`Duplicated as “${copy.name}”`);
                }}
                onDelete={() => setDeleting(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Favorite templates" count={favorites.length} />
        {favorites.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] px-5 py-6 text-sm text-fog-500">Star a template below to keep it here.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 [&>*]:min-w-0">
            {favorites.map((t) => (
              <TemplateCard key={t.id} t={t} compact />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Saved templates" count={store.savedTemplates.length} />
        {store.savedTemplates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] px-5 py-6 text-sm text-fog-500">In the editor, open Templates → Save current to reuse a layout across designs and sizes.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 [&>*]:min-w-0">
            {store.savedTemplates.map((t) => (
              <SavedTemplateCard key={t.id} t={t} onDelete={() => store.deleteSavedTemplate(t.id)} />
            ))}
          </div>
        )}
      </section>

      <section id="template-library" className="scroll-mt-24">
        <SectionTitle title="Template library" count={TEMPLATES.length} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={!!deleting}
        title="Delete design?"
        message={`“${deleting?.name}” will be permanently removed from this browser.`}
        onConfirm={() => {
          if (deleting) {
            store.deleteDesign(deleting.id);
            toast(`Deleted “${deleting.name}”`, 'info');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
