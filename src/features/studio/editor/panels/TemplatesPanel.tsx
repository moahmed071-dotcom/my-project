import { useState } from 'react';
import { BookmarkPlus, Info, Layers3, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { applySavedTemplate, applyTemplate, setupFromDoc, toSavedTemplate } from '../../model/document';
import { localConceptProvider, type LayoutConcept } from '../../engine/concepts';
import { TEMPLATES } from '../../templates/library';
import { DesignThumb, TemplatePreview } from '../../components/DesignThumb';
import type { Editor } from '../useEditor';
import { PanelSection } from '../controls';

export function TemplatesPanel({ editor }: { editor: Editor }) {
  const { doc } = editor;
  const store = useStore();
  const toast = useToast();
  const [concepts, setConcepts] = useState<LayoutConcept[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [tplName, setTplName] = useState('');
  const setup = setupFromDoc(doc);

  async function generate() {
    setBusy(true);
    try {
      setConcepts(await localConceptProvider.generate(setupFromDoc(doc), 3));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelSection title="Layout Concepts">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-accent text-xs font-semibold text-ink-950 transition hover:bg-accent-strong disabled:opacity-60"
        >
          <Layers3 className="h-3.5 w-3.5" />
          {concepts ? 'Regenerate 3 concepts' : 'Generate Concepts'}
        </button>
        <p className="mt-2 flex gap-1.5 text-[11px] leading-relaxed text-fog-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Three compositions arranged locally from templates using your brief. Not AI-generated.
        </p>
        {concepts && (
          <div className="mt-3 space-y-2" data-testid="concepts">
            {concepts.map((c) => (
              <button
                key={c.templateId}
                type="button"
                onClick={() => {
                  editor.apply((d) => applyTemplate(d, c.templateId));
                  toast(`Applied Layout Concept ${String(c.index).padStart(2, '0')} · Undo to revert`);
                }}
                className="flex w-full gap-3 rounded-md border border-white/[0.06] bg-ink-850 p-2 text-left transition hover:border-accent/40"
              >
                <DesignThumb doc={c.design} className="w-16 shrink-0 rounded-[3px]" frame="aspect-square" />
                <span className="min-w-0 py-1">
                  <span className="block font-mono text-[10px] text-accent">LAYOUT CONCEPT {String(c.index).padStart(2, '0')}</span>
                  <span className="block truncate text-xs font-medium text-fog-50">{c.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-fog-500">{c.rationale}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Templates">
        <div className="grid grid-cols-2 gap-2" data-testid="template-list">
          {TEMPLATES.map((t) => {
            const fav = store.favoriteTemplates.includes(t.id);
            return (
              <div key={t.id} className={cn('group relative overflow-hidden rounded-md border bg-ink-850 transition', doc.templateId === t.id ? 'border-accent/60' : 'border-white/[0.06] hover:border-white/20')}>
                <button
                  type="button"
                  aria-label={`Apply template ${t.name}`}
                  className="block w-full text-left"
                  onClick={() => {
                    editor.apply((d) => applyTemplate(d, t.id));
                    toast(`Applied ${t.name} · Undo to revert`);
                  }}
                >
                  <TemplatePreview templateId={t.id} setup={setup} frame="aspect-square" />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-fog-200">{t.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={fav ? `Remove ${t.name} from favourites` : `Add ${t.name} to favourites`}
                  aria-pressed={fav}
                  onClick={() => store.toggleFavoriteTemplate(t.id)}
                  className={cn('absolute right-1 top-1 rounded p-1 transition', fav ? 'text-accent' : 'text-fog-400 opacity-0 hover:text-fog-50 group-hover:opacity-100 focus:opacity-100')}
                >
                  <Star className={cn('h-3.5 w-3.5', fav && 'fill-current')} />
                </button>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection
        title="Saved templates"
        actions={
          !naming && (
            <button type="button" onClick={() => { setTplName(`${doc.name} template`); setNaming(true); }} className="inline-flex items-center gap-1 text-[11px] text-fog-400 hover:text-accent">
              <BookmarkPlus className="h-3.5 w-3.5" /> Save current
            </button>
          )
        }
      >
        {naming && (
          <form
            className="mb-3 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              store.saveTemplate(toSavedTemplate(doc, tplName));
              setNaming(false);
              toast('Saved as a template');
            }}
          >
            <input autoFocus aria-label="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-white/[0.07] bg-ink-850 px-2 text-xs text-fog-50 focus:border-accent/50 focus:outline-none" />
            <button type="submit" className="h-8 rounded-md bg-white/[0.08] px-2.5 text-xs text-fog-50 hover:bg-white/[0.12]">Save</button>
          </form>
        )}
        {store.savedTemplates.length === 0 ? (
          !naming && <p className="text-[11px] leading-relaxed text-fog-500">Save any layout here to reuse it in other designs and sizes.</p>
        ) : (
          <div className="space-y-1">
            {store.savedTemplates.map((t) => (
              <div key={t.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04]">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-xs text-fog-200"
                  onClick={() => {
                    editor.apply((d) => applySavedTemplate(d, t));
                    toast(`Applied ${t.name} · Undo to revert`);
                  }}
                >
                  {t.name}
                  <span className="ml-1.5 text-[10px] text-fog-500">{t.width}×{t.height}</span>
                </button>
                <button type="button" aria-label={`Delete ${t.name}`} onClick={() => store.deleteSavedTemplate(t.id)} className="text-fog-500 opacity-0 hover:text-red-300 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}
