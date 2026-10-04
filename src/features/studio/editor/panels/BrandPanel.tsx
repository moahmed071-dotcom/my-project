import { Save, Stamp } from 'lucide-react';
import { uid } from '@/lib/id';
import { useStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { brandFromKit, DEFAULT_BRAND } from '../../model/brand';
import { resolveRole } from '../../model/color';
import { makeLogo } from '../../model/elements';
import { setBrand } from '../../model/operations';
import { BrandFields } from '../../components/BrandEditor';
import type { Editor } from '../useEditor';
import { PanelSection, SelectField } from '../controls';

export function BrandPanel({ editor }: { editor: Editor }) {
  const store = useStore();
  const toast = useToast();
  const { doc } = editor;
  const client = store.clientById(doc.clientId);
  const kit = store.brandKitFor(doc.clientId);

  return (
    <div>
      <PanelSection title="Client">
        <SelectField
          label="Brand from client"
          value={doc.clientId ?? ''}
          options={[{ value: '', label: 'No client' }, ...store.clients.map((c) => ({ value: c.id, label: c.company }))]}
          onChange={(id) => {
            const nextKit = id ? store.brandKitFor(id) : undefined;
            const c = store.clientById(id || null);
            const brand = nextKit ? brandFromKit(nextKit) : { ...doc.brand, name: c?.company ?? doc.brand.name, kitId: null };
            editor.apply((d) => setBrand({ ...d, clientId: id || null }, brand));
            toast(nextKit ? `Applied ${nextKit.name} brand` : 'Client changed: this client has no brand kit yet');
          }}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-fog-500">
          {kit ? `Using the ${kit.name} brand kit. Edits below apply to this design.` : client ? `${client.company} has no brand kit yet. Define one below and save it.` : 'Define colours and fonts for this design.'}
        </p>
      </PanelSection>

      <PanelSection title="Brand">
        <BrandFields brand={doc.brand} onChange={(b, coalesce) => editor.apply((d) => setBrand(d, b), { coalesce })} onError={(m) => toast(m, 'error')} />
        <div className="mt-4 grid gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/10 text-xs text-fog-200 transition hover:border-white/20 hover:text-fog-50"
            onClick={() => {
              const short = Math.min(doc.width, doc.height);
              const w = Math.round(short * 0.3);
              editor.add(makeLogo({ x: Math.round((doc.width - w) / 2), y: Math.round(short * 0.06), width: w, height: Math.round(short * 0.06), src: doc.brand.logo, fallbackText: doc.brand.name || 'Logo', align: 'center', color: resolveRole('onLight', doc.brand.colors), colorRole: 'onLight' }));
            }}
          >
            <Stamp className="h-3.5 w-3.5" /> Add logo to canvas
          </button>
          {client && (
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/[0.08] text-xs font-medium text-fog-50 transition hover:bg-white/[0.12]"
              onClick={() => {
                store.saveBrandKit({
                  id: kit?.id ?? uid('bk'),
                  clientId: client.id,
                  name: doc.brand.name || client.company,
                  logo: doc.brand.logo,
                  colors: doc.brand.colors,
                  fonts: doc.brand.fonts,
                  toneOfVoice: doc.brand.toneOfVoice || kit?.toneOfVoice || '',
                  updatedAt: new Date().toISOString(),
                });
                toast(`Saved ${client.company} brand kit`);
              }}
            >
              <Save className="h-3.5 w-3.5" /> {kit ? 'Update' : 'Save'} {client.company} brand kit
            </button>
          )}
          <button
            type="button"
            className="h-8 text-[11px] text-fog-500 transition hover:text-fog-200"
            onClick={() => editor.apply((d) => setBrand(d, kit ? brandFromKit(kit) : { ...DEFAULT_BRAND, name: doc.brand.name }))}
          >
            Reset to {kit ? 'saved kit' : 'default'} brand
          </button>
        </div>
      </PanelSection>
    </div>
  );
}
