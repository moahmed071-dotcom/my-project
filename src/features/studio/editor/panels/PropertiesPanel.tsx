import { useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Circle,
  Copy,
  Image as ImageIcon,
  Minus,
  Square,
  Stamp,
  SunDim,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '../../assets/assetStore';
import { resolveRole } from '../../model/color';
import { FONT_CATALOG, FONT_WEIGHTS } from '../../model/fonts';
import { formatLabel } from '../../model/formats';
import { sortedByZ } from '../../model/operations';
import type { ColorRole, DesignElement, ElementType, GradientElement, TextElement } from '../../model/types';
import type { Editor } from '../useEditor';
import { ColorField, FieldLabel, NumberField, PanelSection, Segmented, SelectField, SliderField, TextField, ToolButton, type Swatch } from '../controls';

export const TYPE_ICON: Record<ElementType, LucideIcon> = { text: Type, image: ImageIcon, logo: Stamp, rect: Square, circle: Circle, line: Minus, gradient: SunDim };
const TYPE_LABEL: Record<ElementType, string> = { text: 'Text', image: 'Image', logo: 'Logo', rect: 'Rectangle', circle: 'Circle', line: 'Line', gradient: 'Gradient overlay' };

const SWATCH_ROLES: { role: ColorRole; label: string }[] = [
  { role: 'primary', label: 'Brand primary' },
  { role: 'secondary', label: 'Brand secondary' },
  { role: 'accent', label: 'Brand accent' },
  { role: 'dark', label: 'Dark' },
  { role: 'light', label: 'Light' },
];

function useSwatches(editor: Editor): Swatch[] {
  return SWATCH_ROLES.map((s) => ({ key: s.role, label: s.label, color: resolveRole(s.role, editor.doc.brand.colors) }));
}

export function PropertiesPanel({ editor }: { editor: Editor }) {
  const el = editor.selected;
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">{el ? <ElementProps el={el} editor={editor} /> : <CanvasProps editor={editor} />}</div>
      <Layers editor={editor} />
    </div>
  );
}

function CanvasProps({ editor }: { editor: Editor }) {
  const { doc } = editor;
  const swatches = useSwatches(editor);
  return (
    <>
      <PanelSection title="Canvas">
        <p className="text-xs text-fog-200">{formatLabel(doc.formatId, doc.width, doc.height)}</p>
        <p className="mt-1 text-[11px] text-fog-500">Select an element to edit it, or press Esc to return here.</p>
      </PanelSection>
      <PanelSection title="Background">
        <ColorField
          label="Background colour"
          value={doc.background.color}
          swatches={swatches}
          activeSwatch={doc.background.colorRole}
          onChange={(hex, key) => editor.setDoc({ background: { color: hex === 'none' ? doc.background.color : hex, colorRole: key as ColorRole | undefined } }, 'bg')}
        />
      </PanelSection>
      <PanelSection title="Copy">
        <dl className="space-y-2 text-xs">
          {(['headline', 'subheadline', 'cta'] as const).map((k) => (
            <div key={k}>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-fog-500">{k === 'cta' ? 'CTA' : k}</dt>
              <dd className="mt-0.5 line-clamp-2 text-fog-300">{doc.content[k] || '—'}</dd>
            </div>
          ))}
        </dl>
      </PanelSection>
    </>
  );
}

function ElementProps({ el, editor }: { el: DesignElement; editor: Editor }) {
  const Icon = TYPE_ICON[el.type];
  const up = (patch: Partial<DesignElement>, coalesce?: string) => editor.update(el.id, patch, coalesce);
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Icon className="h-4 w-4 shrink-0 text-accent" />
        <input
          aria-label="Element name"
          key={el.id}
          defaultValue={el.name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== el.name && up({ name: e.target.value.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-medium text-fog-50 hover:bg-white/[0.04] focus:bg-ink-850 focus:outline-none"
        />
        <span className="text-[10px] uppercase tracking-wider text-fog-500">{TYPE_LABEL[el.type]}</span>
      </div>

      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="flex">
          <ToolButton label="Bring to front" onClick={() => editor.reorder(el.id, 'front')}>
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label="Bring forward" onClick={() => editor.reorder(el.id, 'forward')} shortcut="]">
            <ArrowUp className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label="Send backward" onClick={() => editor.reorder(el.id, 'backward')} shortcut="[">
            <ArrowDown className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label="Send to back" onClick={() => editor.reorder(el.id, 'back')}>
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
        <div className="flex">
          <ToolButton label="Duplicate element" onClick={() => editor.duplicate(el.id)} shortcut="Ctrl+D">
            <Copy className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label="Delete element" onClick={() => editor.remove(el.id)} shortcut="Del" className="hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
      </div>

      {el.type === 'text' && <TextProps el={el} editor={editor} />}
      {(el.type === 'image' || el.type === 'logo') && <ImageProps el={el} editor={editor} />}
      {(el.type === 'rect' || el.type === 'circle') && <ShapeProps el={el} editor={editor} />}
      {el.type === 'line' && <LineProps el={el} editor={editor} />}
      {el.type === 'gradient' && <GradientProps el={el} editor={editor} />}

      <PanelSection title="Position & size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" prefix="X" value={el.x} onCommit={(v) => up({ x: v })} />
          <NumberField label="Y" prefix="Y" value={el.y} onCommit={(v) => up({ y: v })} />
          <NumberField label="Width" prefix="W" value={el.width} min={4} onCommit={(v) => up({ width: v })} />
          {el.type === 'text' ? (
            <div className="flex h-8 items-center rounded-md border border-white/[0.04] px-2 text-[11px] text-fog-500" title="Text height follows its content">
              <span className="mr-2 font-semibold">H</span>
              <span className="tabular-nums">{el.height}</span>
              <span className="ml-auto">auto</span>
            </div>
          ) : (
            <NumberField label="Height" prefix="H" value={el.height} min={2} onCommit={(v) => up({ height: v })} />
          )}
          <NumberField label="Rotation" prefix="°" value={el.rotation} min={-180} max={180} onCommit={(v) => up({ rotation: v })} />
          <NumberField label="Layer (z-index)" prefix="Z" value={el.zIndex} min={0} max={editor.doc.elements.length - 1} onCommit={(v) => editor.apply((d) => moveToZ(d, el.id, v))} />
        </div>
        <div className="mt-3">
          <SliderField label="Opacity" value={el.opacity} onChange={(v) => up({ opacity: v }, `opacity-${el.id}`)} format={(v) => `${Math.round(v * 100)}%`} />
        </div>
      </PanelSection>
    </>
  );
}

function moveToZ(d: Editor['doc'], id: string, z: number): Editor['doc'] {
  const els = sortedByZ(d.elements);
  const i = els.findIndex((e) => e.id === id);
  if (i < 0) return d;
  const [el] = els.splice(i, 1);
  els.splice(Math.max(0, Math.min(els.length, Math.round(z))), 0, el);
  return { ...d, elements: els.map((e, idx) => ({ ...e, zIndex: idx })), updatedAt: new Date().toISOString() };
}

function TextProps({ el, editor }: { el: TextElement; editor: Editor }) {
  const swatches = useSwatches(editor);
  const up = (patch: Partial<TextElement>, coalesce?: string) => editor.update(el.id, patch, coalesce);
  const font = FONT_CATALOG.find((f) => f.family === el.fontFamily);
  const weights = FONT_WEIGHTS.filter((w) => !font || font.weights.includes(w.value));
  return (
    <>
      <PanelSection title="Text">
        <FieldLabel htmlFor={`text-${el.id}`}>Content</FieldLabel>
        <textarea
          id={`text-${el.id}`}
          aria-label="Text content"
          dir="auto"
          value={el.text}
          rows={3}
          onChange={(e) => up({ text: e.target.value }, `text-${el.id}`)}
          onBlur={() => editor.endGesture()}
          className="w-full resize-y rounded-md border border-white/[0.07] bg-ink-850 px-2 py-1.5 text-xs leading-relaxed text-fog-50 focus:border-accent/50 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-fog-600">Tip: double-click text on the canvas to edit in place.</p>
      </PanelSection>
      <PanelSection title="Typography">
        <div className="space-y-2">
          <SelectField
            label="Font"
            value={el.fontFamily}
            options={FONT_CATALOG.map((f) => ({ value: f.family, label: f.family }))}
            onChange={(v) => {
              const f = FONT_CATALOG.find((x) => x.family === v);
              const weight = f && !f.weights.includes(el.fontWeight) ? f.weights.reduce((a, b) => (Math.abs(b - el.fontWeight) < Math.abs(a - el.fontWeight) ? b : a)) : el.fontWeight;
              up({ fontFamily: v, fontRole: undefined, fontWeight: weight });
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Font size" value={el.fontSize} min={4} max={1000} step={1} suffix="px" decimals={1} onCommit={(v) => up({ fontSize: v })} />
            <SelectField label="Weight" value={el.fontWeight} options={weights.map((w) => ({ value: w.value, label: w.label }))} onChange={(v) => up({ fontWeight: v })} />
            <NumberField label="Line height" value={el.lineHeight} min={0.6} max={3} step={0.05} decimals={2} onCommit={(v) => up({ lineHeight: v })} />
            <NumberField label="Letter spacing" value={el.letterSpacing} min={-0.2} max={1} step={0.01} decimals={2} suffix="em" onCommit={(v) => up({ letterSpacing: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              label="Align"
              value={el.align}
              onChange={(v) => up({ align: v })}
              options={[
                { value: 'left', label: <AlignLeft className="h-3.5 w-3.5" />, title: 'Align left' },
                { value: 'center', label: <AlignCenter className="h-3.5 w-3.5" />, title: 'Align centre' },
                { value: 'right', label: <AlignRight className="h-3.5 w-3.5" />, title: 'Align right' },
              ]}
            />
            <Segmented
              label="Case & style"
              value={`${el.textTransform}-${el.fontStyle}` as string}
              onChange={(v) => {
                const [t, s] = v.split('-') as [TextElement['textTransform'], TextElement['fontStyle']];
                up({ textTransform: t, fontStyle: s });
              }}
              options={[
                { value: 'none-normal', label: 'Aa', title: 'Sentence case' },
                { value: 'uppercase-normal', label: 'AA', title: 'Uppercase' },
                { value: 'none-italic', label: <span className="italic">Aa</span>, title: 'Italic' },
              ]}
            />
          </div>
          <ColorField label="Text colour" value={el.color} swatches={swatches} activeSwatch={el.colorRole} onChange={(hex, key) => hex !== 'none' && up({ color: hex, colorRole: key as ColorRole | undefined }, `color-${el.id}`)} />
        </div>
      </PanelSection>
    </>
  );
}

function ImageProps({ el, editor }: { el: Extract<DesignElement, { type: 'image' | 'logo' }>; editor: Editor }) {
  const { add } = useAssets();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const up = (patch: Partial<DesignElement>) => editor.update(el.id, patch);
  const isRemote = el.src && /^https?:/i.test(el.src);
  return (
    <PanelSection title={el.type === 'logo' ? 'Logo' : 'Image'}>
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => file.current?.click()} className="h-8 flex-1 rounded-md bg-white/[0.08] text-xs font-medium text-fog-50 hover:bg-white/[0.12]">
            {el.src ? 'Replace…' : 'Upload…'}
          </button>
          {el.type === 'logo' && editor.doc.brand.logo && el.src !== editor.doc.brand.logo && (
            <button type="button" onClick={() => up({ src: editor.doc.brand.logo })} className="h-8 flex-1 rounded-md border border-white/10 text-xs text-fog-200 hover:border-white/20">
              Use brand logo
            </button>
          )}
          {el.src && (
            <button type="button" onClick={() => up({ src: null })} className="h-8 rounded-md px-2 text-xs text-fog-500 hover:text-red-300">
              Remove
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="element-image-input"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const a = await add(f, el.type === 'logo' ? 'logo' : 'image');
              up({ src: `asset:${a.id}` });
            } catch (err) {
              toast((err as Error).message, 'error');
            }
          }}
        />
        <TextField label="Image URL" value={isRemote ? (el.src as string) : ''} placeholder="https://…" onCommit={(v) => up({ src: v.trim() || null })} />
        {el.type === 'image' && (
          <div className="grid grid-cols-2 gap-2">
            <Segmented label="Fit" value={el.fit} onChange={(v) => up({ fit: v })} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} />
            <NumberField label="Corner radius" value={el.radius} min={0} max={2000} onCommit={(v) => up({ radius: v })} />
          </div>
        )}
        {el.type === 'logo' && (
          <>
            <Segmented
              label="Align in box"
              value={el.align}
              onChange={(v) => up({ align: v })}
              options={[
                { value: 'left', label: <AlignLeft className="h-3.5 w-3.5" /> },
                { value: 'center', label: <AlignCenter className="h-3.5 w-3.5" /> },
                { value: 'right', label: <AlignRight className="h-3.5 w-3.5" /> },
              ]}
            />
            {!el.src && <TextField label="Wordmark text" value={el.fallbackText} onCommit={(v) => up({ fallbackText: v })} />}
          </>
        )}
      </div>
    </PanelSection>
  );
}

function ShapeProps({ el, editor }: { el: Extract<DesignElement, { type: 'rect' | 'circle' }>; editor: Editor }) {
  const swatches = useSwatches(editor);
  const up = (patch: Partial<DesignElement>, c?: string) => editor.update(el.id, patch, c);
  return (
    <PanelSection title="Fill & stroke">
      <div className="space-y-3">
        <ColorField label="Fill" value={el.fill} swatches={swatches} activeSwatch={el.fillRole} onChange={(hex, key) => up({ fill: hex, fillRole: key as ColorRole | undefined }, `fill-${el.id}`)} />
        <ColorField label="Stroke" value={el.stroke} swatches={swatches} activeSwatch={el.strokeRole} onChange={(hex, key) => up({ stroke: hex, strokeRole: key as ColorRole | undefined, strokeWidth: el.strokeWidth || 2 }, `stroke-${el.id}`)} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Stroke width" value={el.strokeWidth} min={0} max={200} onCommit={(v) => up({ strokeWidth: v })} />
          {el.type === 'rect' && <NumberField label="Corner radius" value={el.radius} min={0} max={2000} onCommit={(v) => up({ radius: v })} />}
        </div>
        <p className="text-[10px] text-fog-600">Type “none” in a colour field for no fill or no stroke.</p>
      </div>
    </PanelSection>
  );
}

function LineProps({ el, editor }: { el: Extract<DesignElement, { type: 'line' }>; editor: Editor }) {
  const swatches = useSwatches(editor);
  return (
    <PanelSection title="Line">
      <div className="space-y-3">
        <ColorField label="Colour" value={el.stroke} swatches={swatches} activeSwatch={el.strokeRole} onChange={(hex, key) => hex !== 'none' && editor.update(el.id, { stroke: hex, strokeRole: key as ColorRole | undefined }, `stroke-${el.id}`)} />
        <NumberField label="Thickness" value={el.strokeWidth} min={1} max={200} onCommit={(v) => editor.update(el.id, { strokeWidth: v, height: Math.max(el.height, v) })} />
      </div>
    </PanelSection>
  );
}

function GradientProps({ el, editor }: { el: GradientElement; editor: Editor }) {
  const swatches = useSwatches(editor);
  const setStop = (i: number, patch: Partial<GradientElement['stops'][number]>, c?: string) =>
    editor.update(el.id, { stops: el.stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) } as Partial<DesignElement>, c);
  return (
    <PanelSection title="Gradient">
      <div className="space-y-3">
        <Segmented
          label="Direction"
          value={String(el.angle)}
          onChange={(v) => editor.update(el.id, { angle: Number(v) } as Partial<DesignElement>)}
          options={[
            { value: '90', label: '↓', title: 'Top to bottom' },
            { value: '270', label: '↑', title: 'Bottom to top' },
            { value: '0', label: '→', title: 'Left to right' },
            { value: '180', label: '←', title: 'Right to left' },
          ]}
        />
        {[0, el.stops.length - 1].map((i) => (
          <div key={i} className={cn('space-y-2 rounded-md border border-white/[0.05] p-2')}>
            <ColorField label={i === 0 ? 'Start colour' : 'End colour'} value={el.stops[i].color} swatches={swatches} activeSwatch={el.stops[i].colorRole} onChange={(hex, key) => hex !== 'none' && setStop(i, { color: hex, colorRole: key as ColorRole | undefined }, `stop-${el.id}-${i}`)} />
            <SliderField label={i === 0 ? 'Start opacity' : 'End opacity'} value={el.stops[i].opacity} onChange={(v) => setStop(i, { opacity: v }, `stopop-${el.id}-${i}`)} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

function Layers({ editor }: { editor: Editor }) {
  const layers = [...sortedByZ(editor.doc.elements)].reverse();
  return (
    <div className="max-h-[38%] shrink-0 overflow-y-auto border-t border-white/[0.08] bg-ink-950/40">
      <div className="sticky top-0 flex items-center justify-between bg-ink-900/95 px-4 py-2 backdrop-blur">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-500">Layers</h3>
        <span className="font-mono text-[10px] text-fog-600">{layers.length}</span>
      </div>
      <ul className="px-2 pb-2" data-testid="layers">
        {layers.map((el) => {
          const Icon = TYPE_ICON[el.type];
          const active = el.id === editor.selectedId;
          return (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => editor.select(el.id)}
                className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition', active ? 'bg-accent/10 text-fog-50' : 'text-fog-400 hover:bg-white/[0.04] hover:text-fog-100')}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-accent' : 'text-fog-500')} />
                <span className="min-w-0 flex-1 truncate">{el.type === 'text' ? el.text.split('\n')[0] || el.name : el.name}</span>
                <span className="font-mono text-[10px] text-fog-600">{el.zIndex}</span>
              </button>
            </li>
          );
        })}
        {layers.length === 0 && <li className="px-2 py-3 text-[11px] text-fog-500">No elements yet. Add one from the Elements tab.</li>}
      </ul>
    </div>
  );
}
