import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAssets } from '../assets/assetStore';
import { resolveRole } from '../model/color';
import { FONT_CATALOG } from '../model/fonts';
import type { DesignBrand } from '../model/types';
import { ColorField, SelectField } from '../editor/controls';

const FONT_OPTIONS = FONT_CATALOG.map((f) => ({ value: f.family, label: f.family }));

/** Read-only summary of a brand: logo, colours, fonts and tone. */
export function BrandSummary({ brand, className }: { brand: DesignBrand; className?: string }) {
  const { displaySrc } = useAssets();
  const logo = displaySrc(brand.logo);
  const swatches = [
    { label: 'Primary', color: brand.colors.primary },
    { label: 'Secondary', color: brand.colors.secondary },
    { label: 'Accent', color: brand.colors.accent },
  ];
  return (
    <div className={cn('space-y-4', className)} data-testid="brand-summary">
      <div className="flex h-16 items-center justify-center rounded-md border border-white/[0.06] px-4" style={{ background: resolveRole('dark', brand.colors) }}>
        {logo ? <img src={logo} alt={`${brand.name} logo`} className="max-h-10 max-w-full object-contain" /> : <span className="text-xs uppercase tracking-[0.2em] text-fog-400">{brand.name || 'No logo'}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {swatches.map((s) => (
          <div key={s.label}>
            <div className="h-10 rounded-md border border-white/10" style={{ background: s.color }} />
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-fog-500">{s.label}</p>
            <p className="font-mono text-[11px] text-fog-300">{s.color}</p>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-fog-500">Heading font</dt>
          <dd className="mt-1 truncate text-fog-100">{brand.fonts.heading}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-fog-500">Body font</dt>
          <dd className="mt-1 truncate text-fog-100">{brand.fonts.body}</dd>
        </div>
        {brand.toneOfVoice && (
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-fog-500">Tone of voice</dt>
            <dd className="mt-1 text-fog-100">{brand.toneOfVoice}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Manual brand fields: three colours, two fonts and an optional logo upload. */
export function BrandFields({ brand, onChange, onError }: { brand: DesignBrand; onChange: (b: DesignBrand, coalesce?: string) => void; onError?: (msg: string) => void }) {
  const { add, displaySrc } = useAssets();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<DesignBrand>, coalesce?: string) => onChange({ ...brand, ...patch }, coalesce);
  const color = (key: keyof DesignBrand['colors'], label: string) => (
    <ColorField label={label} value={brand.colors[key]} onChange={(hex) => set({ colors: { ...brand.colors, [key]: hex === 'none' ? brand.colors[key] : hex } }, `brand-${key}`)} />
  );
  const logo = displaySrc(brand.logo);
  return (
    <div className="space-y-3" data-testid="brand-fields">
      {color('primary', 'Primary colour')}
      {color('secondary', 'Secondary colour')}
      {color('accent', 'Accent colour')}
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Heading font" value={brand.fonts.heading} options={FONT_OPTIONS} onChange={(v) => set({ fonts: { ...brand.fonts, heading: v } })} />
        <SelectField label="Body font" value={brand.fonts.body} options={FONT_OPTIONS} onChange={(v) => set({ fonts: { ...brand.fonts, body: v } })} />
      </div>
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-fog-500">Logo</p>
        <div className="flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center justify-center overflow-hidden rounded-md border border-dashed border-white/10 bg-ink-850 px-2">
            {logo ? <img src={logo} alt="Logo" className="max-h-7 max-w-full object-contain" /> : <span className="text-[11px] text-fog-500">No logo</span>}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => file.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs text-fog-200 transition hover:border-white/20 hover:text-fog-50 disabled:opacity-50"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {logo ? 'Replace' : 'Upload'}
          </button>
          {logo && (
            <button type="button" aria-label="Remove logo" onClick={() => set({ logo: null })} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fog-500 transition hover:bg-red-500/10 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="brand-logo-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setBusy(true);
              try {
                const a = await add(f, 'logo');
                set({ logo: `asset:${a.id}` });
              } catch (err) {
                onError?.((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
