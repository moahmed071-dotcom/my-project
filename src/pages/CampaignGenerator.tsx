import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clapperboard, Download, Megaphone, MousePointerClick, RotateCcw, Wand2 } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { useGeneration } from '@/store/useGeneration';
import { OUTPUT_LANGUAGES, OUTPUT_LANGUAGE_LABELS, type Campaign, type CampaignInput, type CampaignOutput, type OutputLanguage } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { GeneratingSkeleton } from '@/components/ui/Skeleton';
import { BulletList, OutputBlock } from '@/components/ui/OutputCard';
import { useToast } from '@/components/ui/Toast';
import { HistoryPanel } from '@/components/generator/HistoryPanel';
import { IdleState } from '@/components/generator/IdleState';
import { campaignToText } from '@/lib/serialize';
import { downloadText, slugify } from '@/lib/download';
import { formatDate } from '@/lib/format';

const EMPTY: CampaignInput = {
  brand: '',
  product: '',
  objective: '',
  targetAudience: '',
  market: '',
  occasion: '',
  tone: '',
  keyMessage: '',
  language: 'auto',
};

const EXAMPLE: CampaignInput = {
  brand: 'Harvest Kitchen',
  product: 'Riyadh flagship restaurant opening',
  objective: 'Drive reservations and footfall in the first month',
  targetAudience: 'Young professionals and families who love discovering new dining spots',
  market: 'Riyadh, KSA',
  occasion: 'Grand opening',
  tone: 'Warm, bold, inviting',
  keyMessage: 'Seasonal food made to be shared',
  language: 'en',
};

const OCCASIONS = ['Launch', 'Ramadan', 'Eid', 'National Day', 'Summer', 'White Friday', 'New Year', 'Always-on'];

export default function CampaignGenerator() {
  const { campaigns, clients, settings, addCampaign, deleteCampaign } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState<CampaignInput>({ ...EMPTY, market: settings.defaultMarket });
  const [errors, setErrors] = useState<Partial<Record<keyof CampaignInput, string>>>({});
  const gen = useGeneration<CampaignOutput>();

  const activeId = params.get('id');
  const active = useMemo(() => campaigns.find((c) => c.id === activeId), [campaigns, activeId]);

  useEffect(() => {
    if (active) {
      setForm(active.input);
      setErrors({});
      gen.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const set = (k: Exclude<keyof CampaignInput, 'language'>, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const next: typeof errors = {};
    if (!form.brand.trim()) next.brand = 'Required';
    if (!form.product.trim()) next.product = 'Required';
    setErrors(next);
    if (Object.keys(next).length) return;

    const output = await gen.run((p, signal) => p.generateCampaign(form, signal));
    if (output) {
      const saved = addCampaign({ input: form, output });
      setParams({ id: saved.id }, { replace: true });
      toast('Campaign concept generated');
    }
  }

  function resetForm() {
    setForm({ ...EMPTY, market: settings.defaultMarket });
    setErrors({});
    gen.reset();
    setParams({}, { replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Create"
        title="Campaign Generator"
        description="From a single message to a full campaign platform — big idea, taglines, art direction and content."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-5">
          <form onSubmit={submit} className="surface animate-fade-up p-5 sm:p-6" noValidate>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fog-50">Campaign inputs</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setForm(EXAMPLE)}>
                  Use example
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Brand" required list="cp-brands" placeholder="e.g. Noor Oud" value={form.brand} error={errors.brand} onChange={(e) => set('brand', e.target.value)} />
              <Input label="Product / project" required placeholder="e.g. Summer collection" value={form.product} error={errors.product} onChange={(e) => set('product', e.target.value)} />
              <Textarea label="Campaign objective" wrapperClassName="sm:col-span-2" rows={2} placeholder="Awareness, leads, sales, bookings…" value={form.objective} onChange={(e) => set('objective', e.target.value)} />
              <Textarea label="Target audience" wrapperClassName="sm:col-span-2" rows={2} placeholder="Who are we talking to?" value={form.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} />
              <Input label="Market" placeholder="e.g. UAE" value={form.market} onChange={(e) => set('market', e.target.value)} />
              <Input label="Campaign occasion" list="cp-occasions" placeholder="e.g. Ramadan, Launch" value={form.occasion} onChange={(e) => set('occasion', e.target.value)} />
              <Input label="Tone" wrapperClassName="sm:col-span-2" placeholder="e.g. Luxury, warm, cinematic" value={form.tone} onChange={(e) => set('tone', e.target.value)} />
              <Textarea label="Key message" wrapperClassName="sm:col-span-2" rows={2} placeholder="The one idea the campaign must land" value={form.keyMessage} onChange={(e) => set('keyMessage', e.target.value)} />
              <Select
                label="Output language"
                wrapperClassName="sm:col-span-2"
                value={form.language ?? 'auto'}
                options={OUTPUT_LANGUAGES.map((l) => ({ value: l, label: OUTPUT_LANGUAGE_LABELS[l] }))}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as OutputLanguage }))}
              />
            </div>
            <datalist id="cp-brands">
              {clients.map((c) => (
                <option key={c.id} value={c.company} />
              ))}
            </datalist>
            <datalist id="cp-occasions">{OCCASIONS.map((o) => <option key={o} value={o} />)}</datalist>

            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" size="lg" className="flex-1" loading={gen.status === 'loading'} icon={<Wand2 className="h-4 w-4" />}>
                {gen.status === 'loading' ? 'Building campaign…' : 'Generate campaign'}
              </Button>
              {gen.status === 'loading' && (
                <Button size="lg" variant="ghost" onClick={gen.cancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <HistoryPanel
            title="Saved campaigns"
            items={campaigns.map((c) => ({ id: c.id, title: `${c.input.brand} — ${c.output.bigIdea}`, subtitle: c.input.product, createdAt: c.createdAt }))}
            activeId={activeId}
            onSelect={(id) => setParams({ id })}
            onDelete={(id) => {
              deleteCampaign(id);
              if (id === activeId) setParams({}, { replace: true });
              toast('Campaign deleted', 'info');
            }}
            emptyLabel="Generated campaigns are saved here automatically."
          />
        </div>

        <div className="lg:col-span-7">
          {gen.status === 'loading' ? (
            <GeneratingSkeleton label={`${gen.providerName} is developing the campaign…`} blocks={6} hint={gen.providerName === 'Claude' ? 'Claude is developing the idea and every touchpoint. This usually takes 30–90 seconds.' : undefined} />
          ) : gen.status === 'error' && gen.error ? (
            <ErrorState message={gen.error.message} hint={gen.error.hint} code={gen.error.code} onRetry={() => submit()} />
          ) : active ? (
            <CampaignView campaign={active} />
          ) : (
            <IdleState
              icon={Megaphone}
              title="One idea. Every touchpoint."
              description="Describe the brand and the moment — get a campaign platform you can present, refine and produce."
              points={['Big idea & concept', '5 taglines', 'Key visual & art direction', 'Social, video & content pillars']}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignView({ campaign }: { campaign: Campaign }) {
  const { input, output: o } = campaign;
  let n = 0;
  const idx = () => ++n;
  return (
    <article className="surface animate-fade-up overflow-hidden">
      <header className="relative overflow-hidden border-b border-white/[0.06] p-6 sm:p-10">
        <div className="grain pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label">
              {input.brand} · {input.product}
              {input.occasion ? ` · ${input.occasion}` : ''}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={() => downloadText(`campaign-${slugify(`${input.brand}-${o.bigIdea}`)}.txt`, campaignToText(campaign))}
              >
                Export
              </Button>
              <CopyButton text={() => campaignToText(campaign)} label="Copy campaign" variant="primary" toastMessage="Campaign copied to clipboard" />
            </div>
          </div>
          <p className="label mt-8 text-accent">The big idea</p>
          <h2 dir="auto" className="mt-3 text-balance font-display text-4xl italic leading-[1.05] text-fog-50 sm:text-6xl">“{o.bigIdea}”</h2>
          <p dir="auto" className="mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-fog-300">{o.bigIdeaRationale}</p>
          <p className="mt-4 text-xs text-fog-500">Generated {formatDate(campaign.createdAt)}</p>
        </div>
      </header>

      <div className="p-6 sm:p-8">
        <OutputBlock index={idx()} title="Campaign concept">
          <p>{o.concept}</p>
        </OutputBlock>

        <OutputBlock index={idx()} title="Taglines">
          <ol className="grid gap-2">
            {o.taglines.map((t, i) => (
              <li key={i} className="group/tag flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-ink-850/60 px-4 py-3">
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-fog-500">{i + 1}</span>
                  <span className="text-lg font-medium tracking-tight text-fog-50">{t}</span>
                </span>
                <CopyButton text={t} label="" variant="ghost" className="opacity-0 transition group-hover/tag:opacity-100 focus:opacity-100 max-sm:opacity-100" toastMessage="Tagline copied" />
              </li>
            ))}
          </ol>
        </OutputBlock>

        <OutputBlock index={idx()} title="Key visual direction">
          <BulletList items={o.keyVisual} />
        </OutputBlock>

        <OutputBlock index={idx()} title="Art direction">
          <BulletList items={o.artDirection} />
        </OutputBlock>

        <OutputBlock index={idx()} title="Social media ideas">
          <div className="grid gap-3 sm:grid-cols-2">
            {o.socialIdeas.map((s, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-ink-850/60 p-4">
                <p className="text-[11px] text-fog-500">{s.format}</p>
                <p className="mt-1 text-sm font-semibold text-fog-50">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-fog-400">{s.description}</p>
              </div>
            ))}
          </div>
        </OutputBlock>

        <OutputBlock index={idx()} title="Video concepts">
          <div className="space-y-3">
            {o.videoConcepts.map((v, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-ink-850/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-750">
                      <Clapperboard className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-sm font-semibold text-fog-50">{v.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-fog-400">{v.duration}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-fog-300">{v.logline}</p>
                <ol className="mt-3 space-y-1.5 border-l border-white/[0.08] pl-4">
                  {v.beats.map((b, j) => (
                    <li key={j} className="text-[13px] text-fog-400">
                      <span className="mr-2 font-mono text-[10px] text-fog-500">{String(j + 1).padStart(2, '0')}</span>
                      {b}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </OutputBlock>

        <OutputBlock index={idx()} title="Call to action">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink-950">
              <MousePointerClick className="h-4 w-4" />
              {o.cta.primary}
            </span>
            {o.cta.alternatives.map((a) => (
              <span key={a} className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-fog-300">
                {a}
              </span>
            ))}
          </div>
        </OutputBlock>

        <OutputBlock index={idx()} title="Suggested content pillars">
          <div className="grid gap-3 sm:grid-cols-2">
            {o.contentPillars.map((p, i) => (
              <div key={p.name} className="flex gap-4 rounded-xl border border-white/[0.05] bg-ink-850/60 p-4">
                <span className="font-display text-3xl italic leading-none text-accent/80">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-fog-50">{p.name}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-fog-400">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </OutputBlock>
      </div>
    </article>
  );
}
