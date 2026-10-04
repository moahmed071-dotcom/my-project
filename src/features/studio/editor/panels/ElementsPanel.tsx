import { ImageIcon, Stamp } from 'lucide-react';
import { resolveRole } from '../../model/color';
import { defaultShape, makeImage, makeLogo, QUICK_TEXT, TEXT_PRESETS, textFromPreset } from '../../model/elements';
import { fontStack } from '../../model/fonts';
import type { Editor } from '../useEditor';
import { PanelSection } from '../controls';

const tile = 'flex flex-col items-center justify-center gap-2 rounded-md border border-white/[0.06] bg-ink-850 px-2 py-3 text-[11px] text-fog-300 transition hover:border-accent/40 hover:text-fog-50';

export function ElementsPanel({ editor }: { editor: Editor }) {
  const { doc } = editor;
  const canvas = { width: doc.width, height: doc.height };
  const short = Math.min(doc.width, doc.height);
  return (
    <div>
      <PanelSection title="Text">
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_TEXT.map((q) => (
            <button key={q.label} type="button" className={tile} onClick={() => editor.add(textFromPreset(q.preset, canvas, doc.brand))}>
              <span className="text-sm font-semibold text-fog-100">{q.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Text styles">
        <div className="space-y-1.5">
          {TEXT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Add ${p.label}`}
              onClick={() => editor.add(textFromPreset(p.id, canvas, doc.brand))}
              className="block w-full rounded-md border border-white/[0.06] bg-ink-850 px-3 py-2.5 text-left transition hover:border-accent/40"
            >
              <span className="block text-[10px] uppercase tracking-[0.14em] text-fog-500">{p.label}</span>
              <span
                className="mt-1 block truncate text-fog-50"
                style={{
                  fontFamily: fontStack(doc.brand.fonts[p.fontRole]),
                  fontWeight: p.weight,
                  fontStyle: p.italic ? 'italic' : 'normal',
                  letterSpacing: `${p.letterSpacing}em`,
                  textTransform: p.uppercase ? 'uppercase' : 'none',
                  fontSize: p.id === 'headline' || p.id === 'luxury' ? 20 : p.id === 'subheading' ? 15 : 12,
                  color: p.colorRole === 'accent' ? resolveRole('accent', doc.brand.colors) : undefined,
                }}
              >
                {p.sample}
              </span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Shapes">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ['rect', 'Rectangle', <rect key="r" x="5" y="7" width="22" height="18" fill="currentColor" />],
              ['circle', 'Circle', <circle key="c" cx="16" cy="16" r="10" fill="currentColor" />],
              ['line', 'Line', <line key="l" x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="2.5" />],
              [
                'gradient',
                'Gradient overlay',
                <g key="g">
                  <defs>
                    <linearGradient id="gpanel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                      <stop offset="1" stopColor="currentColor" />
                    </linearGradient>
                  </defs>
                  <rect x="5" y="5" width="22" height="22" fill="url(#gpanel)" />
                </g>,
              ],
            ] as const
          ).map(([kind, label, glyph]) => (
            <button key={kind} type="button" aria-label={`Add ${label}`} className={tile} onClick={() => editor.add(defaultShape(kind, canvas, doc.brand))}>
              <svg viewBox="0 0 32 32" className="h-7 w-7 text-accent/80">
                {glyph}
              </svg>
              {label}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Media">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={tile}
            aria-label="Add image"
            onClick={() => {
              const w = Math.round(doc.width * 0.6);
              const h = Math.round(w * 0.75);
              editor.add(makeImage({ x: (doc.width - w) / 2, y: (doc.height - h) / 2, width: w, height: h, placeholderHint: doc.content.visualDirection || 'Image' }));
            }}
          >
            <ImageIcon className="h-6 w-6 text-accent/80" />
            Image
          </button>
          <button
            type="button"
            className={tile}
            aria-label="Add logo"
            onClick={() => {
              const w = Math.round(short * 0.3);
              const h = Math.round(short * 0.06);
              editor.add(makeLogo({ x: (doc.width - w) / 2, y: Math.round(short * 0.06), width: w, height: h, src: doc.brand.logo, fallbackText: doc.brand.name || 'Logo', align: 'center', color: resolveRole('onLight', doc.brand.colors), colorRole: 'onLight' }));
            }}
          >
            <Stamp className="h-6 w-6 text-accent/80" />
            Logo
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-fog-500">Upload photos in Uploads, then click to place them. Double-click any text on the canvas to edit it.</p>
      </PanelSection>
    </div>
  );
}
