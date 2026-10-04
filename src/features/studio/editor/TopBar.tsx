import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Copy, Download, Eye, FileCode2, FileJson, ImageDown, Loader2, Minus, PenTool, Plus, Redo2, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatLabel } from '../model/formats';
import type { Editor } from './useEditor';
import type { ExportFormat, SaveStatus } from './useDesignActions';
import { ToolButton } from './controls';

export const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3];

interface Props {
  editor: Editor;
  mode: 'edit' | 'preview';
  onMode: (m: 'edit' | 'preview') => void;
  zoom: number | 'fit';
  fit: number;
  onZoom: (z: number | 'fit') => void;
  status: SaveStatus;
  onSave: () => void;
  onExport: (f: ExportFormat) => void;
  exporting: ExportFormat | null;
  onDuplicate: () => void;
}

export function TopBar({ editor, mode, onMode, zoom, fit, onZoom, status, onSave, onExport, exporting, onDuplicate }: Props) {
  const { doc } = editor;
  const current = zoom === 'fit' ? fit : zoom;
  const stepZoom = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((s) => s > current + 0.001) : [...ZOOM_STEPS].reverse().find((s) => s < current - 0.001);
    if (next) onZoom(next);
  };
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-ink-950 px-3">
      <Link to="/studio" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-fog-400 transition hover:bg-white/[0.06] hover:text-fog-50" aria-label="Back to Design Studio">
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden xl:inline">Studio</span>
      </Link>
      <div className="mx-1 h-5 w-px bg-white/[0.08]" />
      <div className="min-w-0">
        <input
          aria-label="Design name"
          key={doc.id}
          defaultValue={doc.name}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== doc.name) editor.setDoc({ name: v });
            else e.target.value = doc.name;
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-56 max-w-full truncate rounded bg-transparent px-1.5 py-0.5 text-sm font-semibold text-fog-50 hover:bg-white/[0.04] focus:bg-ink-850 focus:outline-none"
        />
        <p className="truncate px-1.5 text-[10px] text-fog-500">
          {formatLabel(doc.formatId, doc.width, doc.height)} ·{' '}
          <span data-testid="save-status" className={cn(status === 'saved' ? 'text-fog-500' : 'text-amber-200/80')}>
            {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Unsaved changes'}
          </span>
        </p>
      </div>

      <div className="ml-2 flex items-center">
        <ToolButton label="Undo" shortcut="Ctrl+Z" onClick={editor.undo} disabled={!editor.canUndo}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" shortcut="Ctrl+Shift+Z" onClick={editor.redo} disabled={!editor.canRedo}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div className="flex items-center rounded-md border border-white/[0.07] bg-ink-900">
          <ToolButton label="Zoom out" onClick={() => stepZoom(-1)}>
            <Minus className="h-3.5 w-3.5" />
          </ToolButton>
          <select
            aria-label="Zoom"
            value={zoom === 'fit' ? 'fit' : String(zoom)}
            onChange={(e) => onZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}
            className="h-8 w-[72px] cursor-pointer appearance-none bg-transparent text-center font-mono text-[11px] tabular-nums text-fog-200 focus:outline-none"
          >
            <option value="fit" className="bg-ink-850">
              Fit {Math.round(fit * 100)}%
            </option>
            {zoom !== 'fit' && !ZOOM_STEPS.includes(zoom) && (
              <option value={String(zoom)} className="bg-ink-850">
                {Math.round(zoom * 100)}%
              </option>
            )}
            {ZOOM_STEPS.map((s) => (
              <option key={s} value={String(s)} className="bg-ink-850">
                {Math.round(s * 100)}%
              </option>
            ))}
          </select>
          <ToolButton label="Zoom in" onClick={() => stepZoom(1)}>
            <Plus className="h-3.5 w-3.5" />
          </ToolButton>
        </div>

        <div role="radiogroup" aria-label="View mode" className="ml-1 flex rounded-md border border-white/[0.07] bg-ink-900 p-0.5">
          {(
            [
              ['edit', 'Editor', PenTool],
              ['preview', 'Preview', Eye],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onMode(m)}
              className={cn('inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition', mode === m ? 'bg-white/[0.09] text-fog-50' : 'text-fog-500 hover:text-fog-200')}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSave}
          className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-medium text-fog-100 transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          {status === 'saved' ? <Check className="h-3.5 w-3.5 text-accent" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
        <ExportMenu onExport={onExport} exporting={exporting} onDuplicate={onDuplicate} />
      </div>
    </header>
  );
}

export function ExportMenu({ onExport, exporting, onDuplicate, compact }: { onExport: (f: ExportFormat) => void; exporting: ExportFormat | null; onDuplicate: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const items: { f: ExportFormat; label: string; detail: string; Icon: typeof ImageDown }[] = [
    { f: 'png', label: 'PNG', detail: 'Image at full size', Icon: ImageDown },
    { f: 'svg', label: 'SVG', detail: 'Editable vectors & text', Icon: FileCode2 },
    { f: 'json', label: 'JSON', detail: 'Complete design structure', Icon: FileJson },
  ];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-ink-950 transition hover:bg-accent-strong"
      >
        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {!compact && 'Export'}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-40 w-60 animate-scale-in rounded-lg border border-white/[0.08] bg-ink-850 p-1 shadow-2xl">
          {items.map(({ f, label, detail, Icon }) => (
            <button
              key={f}
              type="button"
              role="menuitem"
              disabled={!!exporting}
              onClick={() => {
                setOpen(false);
                onExport(f);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/[0.05] disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-fog-400" />
              <span>
                <span className="block text-xs font-medium text-fog-50">Export {label}</span>
                <span className="block text-[11px] text-fog-500">{detail}</span>
              </span>
            </button>
          ))}
          <div className="my-1 h-px bg-white/[0.06]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/[0.05]"
          >
            <Copy className="h-4 w-4 text-fog-400" />
            <span className="text-xs font-medium text-fog-50">Duplicate Design</span>
          </button>
        </div>
      )}
    </div>
  );
}
