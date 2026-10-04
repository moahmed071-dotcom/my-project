import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, LayoutTemplate, Palette, Shapes, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAssets } from '../assets/assetStore';
import { ensureDesignFonts, loadFonts } from '../model/fonts';
import { relayoutText } from '../model/operations';
import { fontsUsed } from '../render/exporters';
import { onFontsChange } from '../render/fontsVersion';
import { formatLabel, platformLabel } from '../model/formats';
import { CanvasStage } from './CanvasStage';
import { BrandPanel } from './panels/BrandPanel';
import { ElementsPanel } from './panels/ElementsPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { UploadsPanel } from './panels/UploadsPanel';
import { TopBar } from './TopBar';
import { useDesignActions } from './useDesignActions';
import type { Editor } from './useEditor';

type Tab = 'elements' | 'templates' | 'uploads' | 'brand';
const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'elements', label: 'Elements', Icon: Shapes },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'uploads', label: 'Uploads', Icon: ImageIcon },
  { id: 'brand', label: 'Brand', Icon: Palette },
];

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/** Re-measure text once the design's web fonts are available. */
export function useFontRelayout(editor: Editor) {
  const { apply } = editor;
  useEffect(() => {
    ensureDesignFonts();
    let alive = true;
    loadFonts(fontsUsed(editor.doc)).then(() => alive && apply(relayoutText, { silent: true }));
    const off = onFontsChange(() => apply(relayoutText, { silent: true }));
    return () => {
      alive = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply]);
}

export function DesignEditor({ editor }: { editor: Editor }) {
  const { displaySrc } = useAssets();
  const actions = useDesignActions(editor);
  const [tab, setTab] = useState<Tab>('elements');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [fit, setFit] = useState(0.5);
  const onFit = useCallback((f: number) => setFit(f), []);
  useFontRelayout(editor);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (isTyping(e.target) && (e.target as HTMLElement).tagName !== 'SELECT') return;
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        if (isTyping(e.target)) return;
        e.preventDefault();
        editor.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        actions.save(true);
        return;
      }
      if (isTyping(e.target) || mode !== 'edit') return;
      const sel = editor.selected;
      if (e.key === 'Escape') editor.select(null);
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        editor.remove(sel.id);
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        editor.duplicate(sel.id);
      } else if (e.key === ']') editor.reorder(sel.id, 'forward');
      else if (e.key === '[') editor.reorder(sel.id, 'backward');
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        editor.update(sel.id, { x: sel.x + dx, y: sel.y + dy }, `nudge-${sel.id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, mode, actions]);

  return (
    <div className="flex h-screen flex-col bg-ink-950 text-fog-100" data-testid="design-editor">
      <TopBar
        editor={editor}
        mode={mode}
        onMode={setMode}
        zoom={zoom}
        fit={fit}
        onZoom={setZoom}
        status={actions.status}
        onSave={() => actions.save(true)}
        onExport={actions.runExport}
        exporting={actions.exporting}
        onDuplicate={actions.duplicate}
      />
      <div className="flex min-h-0 flex-1">
        {mode === 'edit' && (
          <aside className="flex shrink-0 border-r border-white/[0.07] bg-ink-900">
            <nav className="flex w-[68px] flex-col gap-1 border-r border-white/[0.05] py-2" aria-label="Editor tools">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={cn('mx-1.5 flex flex-col items-center gap-1 rounded-md py-2.5 text-[10px] transition', tab === id ? 'bg-white/[0.07] text-fog-50' : 'text-fog-500 hover:bg-white/[0.03] hover:text-fog-200')}
                >
                  <Icon className={cn('h-[18px] w-[18px]', tab === id && 'text-accent')} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="w-[272px] overflow-y-auto" data-testid={`panel-${tab}`}>
              {tab === 'elements' && <ElementsPanel editor={editor} />}
              {tab === 'templates' && <TemplatesPanel editor={editor} />}
              {tab === 'uploads' && <UploadsPanel editor={editor} />}
              {tab === 'brand' && <BrandPanel editor={editor} />}
            </div>
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <CanvasStage editor={editor} mode={mode} zoom={zoom} onFitChange={onFit} resolveSrc={displaySrc} />
          {mode === 'preview' && (
            <div className="flex h-10 shrink-0 items-center justify-center gap-3 border-t border-white/[0.06] text-[11px] text-fog-500" data-testid="preview-caption">
              <span className="text-fog-200">{editor.doc.name}</span>
              <span>·</span>
              <span>{platformLabel(editor.doc.platform)}</span>
              <span>·</span>
              <span>{formatLabel(editor.doc.formatId, editor.doc.width, editor.doc.height)}</span>
            </div>
          )}
        </main>

        {mode === 'edit' && (
          <aside className="w-[284px] shrink-0 border-l border-white/[0.07] bg-ink-900" aria-label="Properties" data-testid="properties">
            <PropertiesPanel editor={editor} />
          </aside>
        )}
      </div>
    </div>
  );
}
