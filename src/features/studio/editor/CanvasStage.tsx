import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { DesignSvg } from '../render/DesignSvg';
import { fontStack } from '../model/fonts';
import { sortedByZ } from '../model/operations';
import { layoutElement } from '../model/textLayout';
import type { DesignElement, TextElement } from '../model/types';
import type { Editor } from './useEditor';

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLE_DIR: Record<Handle, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
const CURSOR: Record<Handle, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
const SNAP_PX = 6;
const PAD = 48;

interface Props {
  editor: Editor;
  mode: 'edit' | 'preview';
  zoom: number | 'fit';
  onFitChange: (fit: number) => void;
  resolveSrc: (src: string | null | undefined) => string | null;
}

type Gesture =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number; key: string; moved: boolean }
  | { kind: 'resize'; id: string; handle: Handle; sx: number; sy: number; el: DesignElement; key: string; keepRatio: boolean }
  | { kind: 'rotate'; id: string; cx: number; cy: number; key: string };

const rad = (d: number) => (d * Math.PI) / 180;
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** New geometry for a resize drag, keeping the opposite edge/corner fixed (works for rotated boxes). */
function resizeGeometry(el: DesignElement, handle: Handle, dx: number, dy: number, keepRatio: boolean) {
  const a = rad(el.rotation);
  const [lx, ly] = rot(dx, dy, -a);
  const [hx, hy] = HANDLE_DIR[handle];
  const min = 8;
  let w = Math.max(min, el.width + hx * lx);
  let h = Math.max(min, el.height + hy * ly);
  if (hx === 0) w = el.width;
  if (hy === 0) h = el.height;
  if (keepRatio && hx !== 0 && hy !== 0) {
    const ratio = el.width / el.height;
    if (Math.abs(lx) * el.height > Math.abs(ly) * el.width) h = w / ratio;
    else w = h * ratio;
  }
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const [ax, ay] = rot((-hx * el.width) / 2, (-hy * el.height) / 2, a);
  const anchorX = cx + ax;
  const anchorY = cy + ay;
  const [nax, nay] = rot((-hx * w) / 2, (-hy * h) / 2, a);
  const ncx = anchorX - nax;
  const ncy = anchorY - nay;
  return { x: ncx - w / 2, y: ncy - h / 2, width: w, height: h };
}

export function CanvasStage({ editor, mode, zoom, onFitChange, resolveSrc }: Props) {
  const { doc, selectedId } = editor;
  const viewport = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const gestureSeq = useRef(0);

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const ro = new ResizeObserver(([e]) => setVp({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const fit = useMemo(() => {
    if (!vp.w || !vp.h) return 0.25;
    return Math.max(0.05, Math.min((vp.w - PAD * 2) / doc.width, (vp.h - PAD * 2) / doc.height));
  }, [vp, doc.width, doc.height]);
  useEffect(() => onFitChange(fit), [fit, onFitChange]);
  const z = zoom === 'fit' ? fit : zoom;

  // Leave text editing when selection changes or in preview.
  useEffect(() => {
    if (editingId && (editingId !== selectedId || mode === 'preview')) setEditingId(null);
  }, [selectedId, editingId, mode]);

  const hidden = useMemo(() => new Set(editingId ? [editingId] : []), [editingId]);
  const elements = useMemo(() => sortedByZ(doc.elements), [doc.elements]);
  const selected = editor.selected;

  // ─── Pointer gestures ─────────────────────────────────────────────────
  function onPointerMove(e: RPointerEvent) {
    if (!gesture) return;
    if (gesture.kind === 'move') {
      const el = doc.elements.find((x) => x.id === gesture.id);
      if (!el) return;
      let nx = gesture.ox + (e.clientX - gesture.sx) / z;
      let ny = gesture.oy + (e.clientY - gesture.sy) / z;
      if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) < 3) return;
      // Snap the element's centre to the canvas centre lines.
      const snap = SNAP_PX / z;
      const cx = nx + el.width / 2;
      const cy = ny + el.height / 2;
      const v = !e.altKey && Math.abs(cx - doc.width / 2) < snap;
      const h = !e.altKey && Math.abs(cy - doc.height / 2) < snap;
      if (v) nx = doc.width / 2 - el.width / 2;
      if (h) ny = doc.height / 2 - el.height / 2;
      setGuides({ v, h });
      if (!gesture.moved) setGesture({ ...gesture, moved: true });
      editor.update(gesture.id, { x: Math.round(nx), y: Math.round(ny) }, gesture.key);
    } else if (gesture.kind === 'resize') {
      const dx = (e.clientX - gesture.sx) / z;
      const dy = (e.clientY - gesture.sy) / z;
      const el = gesture.el;
      const keep = gesture.keepRatio || e.shiftKey;
      const g = resizeGeometry(el, gesture.handle, dx, dy, keep && !(el.type === 'text' && (gesture.handle === 'e' || gesture.handle === 'w')));
      if (el.type === 'text') {
        const corner = gesture.handle.length === 2;
        const scale = g.width / el.width;
        const patch: Partial<TextElement> = corner
          ? { x: Math.round(g.x), y: Math.round(g.y), width: Math.round(g.width), fontSize: Math.max(4, Math.round(el.fontSize * scale * 10) / 10) }
          : { x: Math.round(g.x), width: Math.round(g.width) };
        editor.update(el.id, patch, gesture.key);
      } else {
        editor.update(el.id, { x: Math.round(g.x), y: Math.round(g.y), width: Math.round(g.width), height: Math.round(g.height) }, gesture.key);
      }
    } else if (gesture.kind === 'rotate') {
      const rect = viewport.current?.querySelector('[data-stage]')?.getBoundingClientRect();
      if (!rect) return;
      const px = (e.clientX - rect.left) / z;
      const py = (e.clientY - rect.top) / z;
      let deg = (Math.atan2(py - gesture.cy, px - gesture.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      deg = ((Math.round(deg) % 360) + 360) % 360;
      editor.update(gesture.id, { rotation: deg > 180 ? deg - 360 : deg }, gesture.key);
    }
  }

  function endGesture() {
    if (!gesture) return;
    setGesture(null);
    setGuides({ v: false, h: false });
    editor.endGesture();
  }

  const startMove = (e: RPointerEvent, el: DesignElement) => {
    if (e.button !== 0 || editingId === el.id) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    editor.select(el.id);
    setGesture({ kind: 'move', id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, key: `move-${++gestureSeq.current}`, moved: false });
  };

  const startResize = (e: RPointerEvent, el: DesignElement, handle: Handle) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const keepRatio = el.type === 'image' || el.type === 'logo' || el.type === 'text';
    setGesture({ kind: 'resize', id: el.id, handle, sx: e.clientX, sy: e.clientY, el, key: `resize-${++gestureSeq.current}`, keepRatio });
  };

  const startRotate = (e: RPointerEvent, el: DesignElement) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setGesture({ kind: 'rotate', id: el.id, cx: el.x + el.width / 2, cy: el.y + el.height / 2, key: `rotate-${++gestureSeq.current}` });
  };

  const handlesFor = (el: DesignElement): Handle[] =>
    el.type === 'text' ? ['e', 'w', 'ne', 'nw', 'se', 'sw'] : el.type === 'line' ? ['e', 'w'] : ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  const boxStyle = (el: DesignElement, minPx = 0) => {
    const h = Math.max(el.height * z, minPx);
    return {
      left: el.x * z,
      top: el.y * z + (el.height * z - h) / 2,
      width: Math.max(el.width * z, minPx),
      height: h,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    };
  };

  const editingEl = editingId ? doc.elements.find((x): x is TextElement => x.id === editingId && x.type === 'text') : undefined;

  return (
    <div
      ref={viewport}
      className={cn('studio-viewport relative min-h-0 flex-1 overflow-auto', mode === 'preview' ? 'bg-ink-950' : 'studio-dots bg-[#0B0B0D]')}
      onPointerDown={() => mode === 'edit' && editor.select(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      data-testid="canvas-viewport"
    >
      <div className="flex items-center justify-center" style={{ width: Math.max(vp.w, doc.width * z + PAD * 2), height: Math.max(vp.h, doc.height * z + PAD * 2) }}>
        <div data-stage className={cn('relative shrink-0', mode === 'preview' ? 'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_60px_-24px_rgba(0,0,0,0.9)]')} style={{ width: doc.width * z, height: doc.height * z }}>
          <DesignSvg doc={doc} idPrefix="stage" resolveSrc={resolveSrc} showHints={mode === 'edit'} hiddenIds={hidden} />

          {mode === 'edit' && (
            <div className="absolute inset-0" aria-label="Design canvas">
              {/* Hit boxes, top-most last so they win clicks. */}
              {elements.map((el) => (
                <div
                  key={el.id}
                  data-testid={`el-${el.id}`}
                  data-element-type={el.type}
                  aria-label={el.name}
                  className={cn('absolute', gesture?.kind === 'move' ? 'cursor-grabbing' : 'cursor-move', selectedId !== el.id && 'hover:outline hover:outline-1 hover:outline-accent/50')}
                  style={boxStyle(el, el.type === 'line' ? 14 : 0)}
                  onPointerDown={(e) => startMove(e, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (el.type === 'text') setEditingId(el.id);
                  }}
                />
              ))}

              {guides.v && <div className="pointer-events-none absolute inset-y-0 w-px bg-fuchsia-400/80" style={{ left: (doc.width / 2) * z }} />}
              {guides.h && <div className="pointer-events-none absolute inset-x-0 h-px bg-fuchsia-400/80" style={{ top: (doc.height / 2) * z }} />}

              {selected && !editingEl && (
                <div className="pointer-events-none absolute outline outline-[1.5px] outline-accent" style={boxStyle(selected, selected.type === 'line' ? 14 : 0)} data-testid="selection">
                  {handlesFor(selected).map((h) => {
                    const [hx, hy] = HANDLE_DIR[h];
                    return (
                      <div
                        key={h}
                        data-handle={h}
                        className="pointer-events-auto absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border border-accent bg-ink-950"
                        style={{ left: `${((hx + 1) / 2) * 100}%`, top: `${((hy + 1) / 2) * 100}%`, cursor: CURSOR[h] }}
                        onPointerDown={(e) => startResize(e, selected, h)}
                      />
                    );
                  })}
                  {selected.type !== 'line' && (
                    <div
                      data-handle="rotate"
                      title="Rotate (Shift snaps 15°)"
                      className="pointer-events-auto absolute left-1/2 -top-7 h-3 w-3 -translate-x-1/2 cursor-grab rounded-full border border-accent bg-ink-950"
                      onPointerDown={(e) => startRotate(e, selected)}
                    />
                  )}
                </div>
              )}

              {editingEl && <InlineTextEditor el={editingEl} z={z} editor={editor} onDone={() => setEditingId(null)} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineTextEditor({ el, z, editor, onDone }: { el: TextElement; z: number; editor: Editor; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const session = useRef(`text-${el.id}-${Date.now()}`);
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus();
    t.select();
  }, []);
  const height = layoutElement(el).height;
  return (
    <textarea
      ref={ref}
      aria-label="Edit text"
      data-testid="inline-text-editor"
      value={el.text}
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => editor.update(el.id, { text: e.target.value }, session.current)}
      onBlur={() => {
        editor.endGesture();
        onDone();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
      }}
      className="absolute resize-none overflow-hidden border-0 bg-transparent p-0 outline outline-[1.5px] outline-accent focus:ring-0"
      style={{
        left: el.x * z,
        top: el.y * z,
        width: el.width * z,
        height: height * z + 2,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center',
        fontFamily: fontStack(el.fontFamily),
        fontSize: el.fontSize * z,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        lineHeight: el.lineHeight,
        letterSpacing: `${el.letterSpacing}em`,
        textAlign: el.align,
        textTransform: el.textTransform === 'uppercase' ? 'uppercase' : 'none',
        color: el.color,
        opacity: el.opacity,
        caretColor: el.color,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    />
  );
}
