import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ImagePlus, Info, Layers3, LayoutTemplate, Loader2, Pencil, Square, X } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '../assets/assetStore';
import { brandFromKit, DEFAULT_BRAND } from '../model/brand';
import { createDesign, EMPTY_CONTENT, type DesignSetup } from '../model/document';
import { clampCanvas, CUSTOM_FORMAT_ID, FORMAT_PRESETS, MAX_CANVAS, MIN_CANVAS, PLATFORMS, presetsFor } from '../model/formats';
import { ensureDesignFonts, loadFonts } from '../model/fonts';
import type { DesignBrand, Platform } from '../model/types';
import { localConceptProvider, type LayoutConcept } from '../engine/concepts';
import { getTemplate, TEMPLATES } from '../templates/library';
import { BrandFields, BrandSummary } from '../components/BrandEditor';
import { DesignThumb, TemplatePreview } from '../components/DesignThumb';

interface Form {
  name: string;
  clientId: string;
  campaign: string;
  platform: Platform;
  formatId: string;
  customW: string;
  customH: string;
  brief: string;
  headline: string;
  subheadline: string;
  cta: string;
  visualDirection: string;
}

const card = 'rounded-2xl border border-white/[0.06] bg-ink-900 p-5 sm:p-6';
const sectionTitle = 'mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400';

export default function NewDesign() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { add, displaySrc } = useAssets();
  const [params] = useSearchParams();
  const presetTemplate = getTemplate(params.get('template'));
  const presetFormat = FORMAT_PRESETS.find((f) => f.id === presetTemplate?.defaultFormat) ?? FORMAT_PRESETS[1];

  const [form, setForm] = useState<Form>({
    name: '',
    clientId: '',
    campaign: '',
    platform: presetFormat.platform,
    formatId: presetFormat.id,
    customW: '1080',
    customH: '1350',
    brief: '',
    headline: '',
    subheadline: '',
    cta: '',
    visualDirection: '',
  });
  const [brand, setBrand] = useState<DesignBrand>({ ...DEFAULT_BRAND });
  const [brandMode, setBrandMode] = useState<'kit' | 'manual'>('manual');
  const [saveKit, setSaveKit] = useState(true);
  const [hero, setHero] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'size', string>>>({});
  const [concepts, setConcepts] = useState<LayoutConcept[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const heroFile = useRef<HTMLInputElement>(null);

  useEffect(() => ensureDesignFonts(), []);

  const client = store.clientById(form.clientId || null);
  const kit = store.brandKitFor(form.clientId || null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function chooseClient(id: string) {
    set('clientId', id);
    const c = store.clientById(id || null);
    const k = store.brandKitFor(id || null);
    if (k) {
      setBrand(brandFromKit(k));
      setBrandMode('kit');
    } else {
      setBrand((b) => ({ ...b, name: c?.company ?? '', kitId: null, toneOfVoice: '' }));
      setBrandMode('manual');
      setSaveKit(true);
    }
    setConcepts(null);
  }

  const size = useMemo(() => {
    if (form.formatId === CUSTOM_FORMAT_ID) return { width: Number(form.customW), height: Number(form.customH) };
    const p = FORMAT_PRESETS.find((f) => f.id === form.formatId)!;
    return { width: p.width, height: p.height };
  }, [form.formatId, form.customW, form.customH]);

  const setup: DesignSetup = useMemo(
    () => ({
      name: form.name,
      clientId: form.clientId || null,
      campaign: form.campaign,
      platform: form.platform,
      formatId: form.formatId,
      width: clampCanvas(size.width),
      height: clampCanvas(size.height),
      brand: { ...brand, name: brand.name || client?.company || '' },
      content: { ...EMPTY_CONTENT, brief: form.brief, headline: form.headline, subheadline: form.subheadline, cta: form.cta, visualDirection: form.visualDirection, label: '' },
      heroImage: hero,
    }),
    [form, size, brand, client, hero],
  );

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Give the design a name.';
    if (form.formatId === CUSTOM_FORMAT_ID) {
      const ok = (n: number) => Number.isFinite(n) && n >= MIN_CANVAS && n <= MAX_CANVAS;
      if (!ok(size.width) || !ok(size.height)) e.size = `Width and height must be between ${MIN_CANVAS} and ${MAX_CANVAS} px.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function generateConcepts() {
    if (!validate()) return;
    setBusy(true);
    setPicking(false);
    try {
      const weights = [400, 500, 600, 700, 800];
      await loadFonts([...weights.map((w) => ({ family: setup.brand.fonts.heading, weight: w })), ...weights.map((w) => ({ family: setup.brand.fonts.body, weight: w }))]);
      setConcepts(await localConceptProvider.generate(setup, 3));
      setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } finally {
      setBusy(false);
    }
  }

  function create(design: ReturnType<typeof createDesign>) {
    if (client && brandMode === 'manual' && saveKit) {
      store.saveBrandKit({ id: uid('bk'), clientId: client.id, name: setup.brand.name || client.company, logo: brand.logo, colors: brand.colors, fonts: brand.fonts, toneOfVoice: brand.toneOfVoice, updatedAt: new Date().toISOString() });
    }
    store.saveDesign(design);
    toast(`Created “${design.name}”`);
    navigate(`/studio/${design.id}`);
  }

  async function createFromTemplate(templateId: string | null) {
    if (!validate()) return;
    setBusy(true);
    try {
      await loadFonts([400, 500, 600, 700, 800].flatMap((w) => [{ family: setup.brand.fonts.heading, weight: w }, { family: setup.brand.fonts.body, weight: w }]));
      create(createDesign(setup, templateId));
    } finally {
      setBusy(false);
    }
  }

  const aspect = setup.width / setup.height;

  return (
    <div>
      <PageHeader eyebrow="Design Studio" title="New design" description="Set the brief, format and brand. Then generate three layout concepts, or start from a template you choose." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-7">
          <section className={card}>
            <h2 className={sectionTitle}>Design</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Design name" required wrapperClassName="sm:col-span-2" placeholder="e.g. Marina Crest — Launch post" value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
              <Select label="Client" value={form.clientId} placeholder="No client" options={store.clients.map((c) => ({ value: c.id, label: c.company }))} onChange={(e) => chooseClient(e.target.value)} />
              <Input label="Campaign" placeholder="e.g. Summer launch" value={form.campaign} onChange={(e) => set('campaign', e.target.value)} />
            </div>
          </section>

          <section className={card}>
            <h2 className={sectionTitle}>Platform & format</h2>
            <div role="radiogroup" aria-label="Platform" className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={form.platform === p.id}
                  onClick={() => setForm((f) => ({ ...f, platform: p.id, formatId: f.formatId === CUSTOM_FORMAT_ID ? f.formatId : presetsFor(p.id)[0].id }))}
                  className={cn('h-9 rounded-full border px-4 text-sm transition', form.platform === p.id ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/[0.08] text-fog-300 hover:border-white/20')}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Format" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...presetsFor(form.platform), { id: CUSTOM_FORMAT_ID, label: 'Custom size', width: 0, height: 0 }].map((f) => {
                const on = form.formatId === f.id;
                const r = f.width ? f.width / f.height : 1;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('formatId', f.id)}
                    className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', on ? 'border-accent/50 bg-accent/[0.05]' : 'border-white/[0.07] hover:border-white/20')}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      {f.width ? <span className={cn('block border', on ? 'border-accent' : 'border-fog-500')} style={{ width: r >= 1 ? 32 : 32 * r, height: r >= 1 ? 32 / r : 32 }} /> : <Square className="h-6 w-6 text-fog-500" strokeDasharray="3 3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-fog-100">{f.label.replace(/^(Instagram|Facebook|LinkedIn)\s+/, '')}</span>
                      <span className="block text-[11px] tabular-nums text-fog-500">{f.width ? `${f.width} × ${f.height}` : 'Any size'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {form.formatId === CUSTOM_FORMAT_ID && (
              <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
                <Input label="Custom width (px)" inputMode="numeric" value={form.customW} onChange={(e) => set('customW', e.target.value.replace(/\D/g, ''))} />
                <Input label="Custom height (px)" inputMode="numeric" value={form.customH} onChange={(e) => set('customH', e.target.value.replace(/\D/g, ''))} />
              </div>
            )}
            {errors.size && <p className="mt-2 text-xs text-red-300">{errors.size}</p>}
          </section>

          <section className={card}>
            <h2 className={sectionTitle}>Brief & copy</h2>
            <div className="grid gap-4">
              <Textarea label="Brief" rows={3} placeholder="What is this post for, and who is it for?" value={form.brief} onChange={(e) => set('brief', e.target.value)} hint="Used to choose the three layout concepts. Real estate, luxury, corporate and product briefs get different compositions." />
              <Input label="Headline" placeholder="Defaults to the design name" value={form.headline} onChange={(e) => set('headline', e.target.value)} />
              <Input label="Subheadline" placeholder="One supporting line" value={form.subheadline} onChange={(e) => set('subheadline', e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="CTA" placeholder="e.g. Register your interest" value={form.cta} onChange={(e) => set('cta', e.target.value)} />
                <Input label="Visual direction" placeholder="e.g. Golden-hour façade, warm stone" value={form.visualDirection} onChange={(e) => set('visualDirection', e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-fog-200">Hero image (optional)</p>
                <div className="flex flex-wrap items-center gap-2">
                  {hero ? (
                    <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] p-1.5 pr-2">
                      <img src={displaySrc(hero) ?? ''} alt="Hero" className="h-10 w-14 rounded object-cover" />
                      <span className="text-xs text-fog-300">Image added</span>
                      <button type="button" aria-label="Remove hero image" onClick={() => setHero(null)} className="rounded p-1 text-fog-500 hover:text-red-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" icon={<ImagePlus className="h-3.5 w-3.5" />} onClick={() => heroFile.current?.click()}>
                        Upload
                      </Button>
                      <input
                        aria-label="Hero image URL"
                        value={heroUrl}
                        onChange={(e) => setHeroUrl(e.target.value)}
                        onBlur={() => {
                          const u = heroUrl.trim();
                          if (/^https?:\/\/\S+$/i.test(u)) {
                            setHero(u);
                            setHeroUrl('');
                          }
                        }}
                        placeholder="or paste an image URL"
                        className="field h-8 max-w-xs py-0 text-xs"
                      />
                    </>
                  )}
                  <input
                    ref={heroFile}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    data-testid="hero-input"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      try {
                        const a = await add(f, 'image');
                        setHero(`asset:${a.id}`);
                      } catch (err) {
                        toast((err as Error).message, 'error');
                      }
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-fog-500">Without an image, templates show a placeholder you can fill in the editor.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="space-y-6 lg:sticky lg:top-24">
            <section className={card} aria-label="Brand">
              <div className="mb-4 flex items-center justify-between">
                <h2 className={cn(sectionTitle, 'mb-0')}>Brand</h2>
                {kit && (
                  <button type="button" onClick={() => setBrandMode((m) => (m === 'kit' ? 'manual' : 'kit'))} className="inline-flex items-center gap-1 text-xs text-fog-400 hover:text-accent">
                    <Pencil className="h-3 w-3" />
                    {brandMode === 'kit' ? 'Customise for this design' : 'Use saved kit'}
                  </button>
                )}
              </div>
              {brandMode === 'kit' && kit ? (
                <>
                  <p className="mb-4 text-xs text-fog-400">
                    Using the <span className="text-fog-100">{kit.name}</span> brand kit.
                  </p>
                  <BrandSummary brand={brand} />
                </>
              ) : (
                <>
                  <p className="mb-4 text-xs leading-relaxed text-fog-400">
                    {client ? `${client.company} has no saved brand yet. Define it here.` : 'No client selected. Define colours and fonts for this design.'}
                  </p>
                  <BrandFields brand={brand} onChange={(b) => setBrand(b)} onError={(m) => toast(m, 'error')} />
                  {client && !kit && (
                    <label className="mt-4 flex items-center gap-2 text-xs text-fog-300">
                      <input type="checkbox" checked={saveKit} onChange={(e) => setSaveKit(e.target.checked)} className="accent-[#C6F432]" />
                      Save as {client.company}’s brand kit
                    </label>
                  )}
                </>
              )}
            </section>

            <section className={card}>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-ink-850">
                  <div className="border border-accent/70 bg-accent/10" style={{ width: aspect >= 1 ? 56 : 56 * aspect, height: aspect >= 1 ? 56 / aspect : 56 }} />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-fog-50">{form.formatId === CUSTOM_FORMAT_ID ? 'Custom size' : FORMAT_PRESETS.find((f) => f.id === form.formatId)?.label}</p>
                  <p className="tabular-nums text-fog-400">
                    {setup.width} × {setup.height} px
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {presetTemplate && (
                  <Button variant="primary" size="lg" loading={busy} icon={<ArrowRight className="h-4 w-4" />} onClick={() => createFromTemplate(presetTemplate.id)}>
                    Create with {presetTemplate.name}
                  </Button>
                )}
                <Button variant={presetTemplate ? 'outline' : 'primary'} size="lg" loading={busy && !presetTemplate} icon={<Layers3 className="h-4 w-4" />} onClick={generateConcepts}>
                  Generate Concepts
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    icon={<LayoutTemplate className="h-4 w-4" />}
                    onClick={() => {
                      if (!validate()) return;
                      setConcepts(null);
                      setPicking(true);
                      setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }}
                  >
                    Choose template
                  </Button>
                  <Button variant="ghost" onClick={() => createFromTemplate(null)}>
                    Start blank
                  </Button>
                </div>
                <p className="mt-1 flex gap-1.5 text-[11px] leading-relaxed text-fog-500">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Layout concepts are arranged locally from the template library using your brief. No AI is used.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div ref={results} className="scroll-mt-24">
        {busy && !concepts && (
          <div className="mt-10 flex items-center gap-2 text-sm text-fog-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Arranging layouts…
          </div>
        )}
        {concepts && (
          <section className="mt-12 animate-fade-up" data-testid="layout-concepts">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Layout Concepts</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fog-50">Three compositions for this brief</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={generateConcepts}>
                Regenerate
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 [&>*]:min-w-0">
              {concepts.map((c) => (
                <article key={c.templateId} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900" data-testid="concept-card">
                  <DesignThumb doc={c.design} />
                  <div className="p-5">
                    <p className="font-mono text-[11px] text-accent">LAYOUT CONCEPT {String(c.index).padStart(2, '0')}</p>
                    <h3 className="mt-1 text-lg font-semibold text-fog-50">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fog-400">{c.rationale}</p>
                    <Button className="mt-4 w-full" variant="primary" onClick={() => create({ ...c.design, name: setup.name.trim() || c.design.name })}>
                      Use concept {String(c.index).padStart(2, '0')}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {picking && (
          <section className="mt-12 animate-fade-up" data-testid="template-picker">
            <p className="label">Templates</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fog-50">Choose a starting layout</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 [&>*]:min-w-0">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" aria-label={`Start with ${t.name}`} onClick={() => createFromTemplate(t.id)} className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900 text-left transition hover:border-accent/40">
                  <TemplatePreview templateId={t.id} setup={setup} />
                  <span className="block p-3">
                    <span className="block text-sm text-fog-50">{t.name}</span>
                    <span className="mt-0.5 block text-[11px] text-fog-500">{t.bestFor.join(' · ')}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
