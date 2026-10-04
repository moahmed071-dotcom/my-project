import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Monitor, Redo2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAssets } from '../assets/assetStore';
import { applyTemplate, setupFromDoc } from '../model/document';
import { formatLabel } from '../model/formats';
import { sortedByZ } from '../model/operations';
import type { TextElement } from '../model/types';
import { TEMPLATES } from '../templates/library';
import { DesignSvg } from '../render/DesignSvg';
import { TemplatePreview } from '../components/DesignThumb';
import { useFontRelayout } from './DesignEditor';
import { ExportMenu } from './TopBar';
import { useDesignActions } from './useDesignActions';
import type { Editor } from './useEditor';
import { ToolButton } from './controls';

/** Phone layout: preview plus basic edits (copy, layout, export). The full editor is desktop-only. */
export function MobileEditor({ editor }: { editor: Editor }) {
  const { displaySrc } = useAssets();
  const actions = useDesignActions(editor);
  const [tab, setTab] = useState<'text' | 'layout'>('text');
  useFontRelayout(editor);
  const { doc } = editor;
  const texts = useMemo(() => sortedByZ(doc.elements).filter((e): e is TextElement => e.type === 'text').sort((a, b) => a.y - b.y), [doc.elements]);
  const setup = useMemo(() => setupFromDoc(doc), [doc]);

  return (
    <div className="min-h-screen bg-ink-950 text-fog-100" data-testid="mobile-editor">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-white/[0.07] bg-ink-950/95 px-2 backdrop-blur">
        <Link to="/studio" aria-label="Back to Design Studio" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fog-300 hover:bg-white/[0.06]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fog-50">{doc.name}</p>
          <p className="truncate text-[10px] text-fog-500">
            {formatLabel(doc.formatId, doc.width, doc.height)} · <span data-testid="save-status">{actions.status === 'saved' ? 'Saved' : 'Unsaved changes'}</span>
          </p>
        </div>
        <ToolButton label="Undo" onClick={editor.undo} disabled={!editor.canUndo}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" onClick={editor.redo} disabled={!editor.canRedo}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <ExportMenu onExport={actions.runExport} exporting={actions.exporting} onDuplicate={actions.duplicate} compact />
      </header>

      <div className="px-4 pt-4">
        <div className="mx-auto max-h-[58vh]" style={{ aspectRatio: `${doc.width} / ${doc.height}`, maxWidth: `min(100%, calc(58vh * ${doc.width / doc.height}))` }}>
          <div className="h-full w-full shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]" data-testid="mobile-preview">
            <DesignSvg doc={doc} idPrefix="m" resolveSrc={displaySrc} />
          </div>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-fog-500">
          <Monitor className="h-3.5 w-3.5" /> Open on a desktop for the full canvas editor.
        </p>
      </div>

      <div className="sticky top-14 z-10 mt-4 border-y border-white/[0.06] bg-ink-950/95 px-4 py-2 backdrop-blur">
        <div role="tablist" className="flex rounded-md border border-white/[0.07] bg-ink-900 p-0.5">
          {(
            [
              ['text', 'Edit text'],
              ['layout', 'Layout'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('h-8 flex-1 rounded-[5px] text-xs font-medium', tab === id ? 'bg-white/[0.09] text-fog-50' : 'text-fog-500')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 pb-10">
        {tab === 'text' &&
          (texts.length ? (
            texts.map((t) => (
              <label key={t.id} className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-fog-500">{t.name}</span>
                <textarea
                  dir="auto"
                  aria-label={`Edit ${t.name}`}
                  value={t.text}
                  rows={Math.min(4, Math.max(1, Math.ceil(t.text.length / 36)))}
                  onChange={(e) => editor.update(t.id, { text: e.target.value }, `m-text-${t.id}`)}
                  onBlur={editor.endGesture}
                  className="w-full resize-none rounded-md border border-white/[0.08] bg-ink-850 px-3 py-2 text-sm text-fog-50 focus:border-accent/50 focus:outline-none"
                />
              </label>
            ))
          ) : (
            <p className="text-sm text-fog-500">This design has no text yet.</p>
          ))}
        {tab === 'layout' && (
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={`Apply template ${t.name}`}
                onClick={() => editor.apply((d) => applyTemplate(d, t.id))}
                className={cn('overflow-hidden rounded-md border text-left', doc.templateId === t.id ? 'border-accent/60' : 'border-white/[0.07]')}
              >
                <TemplatePreview templateId={t.id} setup={setup} frame="aspect-square" />
                <span className="block truncate px-2 py-1.5 text-[11px] text-fog-200">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
