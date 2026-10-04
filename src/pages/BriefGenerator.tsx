import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileText, RotateCcw, Wand2 } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { useGeneration } from '@/store/useGeneration';
import type { Brief, BriefInput, BriefOutput } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { GeneratingSkeleton } from '@/components/ui/Skeleton';
import { BulletList, OutputBlock } from '@/components/ui/OutputCard';
import { useToast } from '@/components/ui/Toast';
import { HistoryPanel } from '@/components/generator/HistoryPanel';
import { IdleState } from '@/components/generator/IdleState';
import { briefToText } from '@/lib/serialize';
import { downloadText, slugify } from '@/lib/download';
import { formatDate } from '@/lib/format';

const EMPTY: BriefInput = {
  client: '',
  projectName: '',
  projectType: '',
  objective: '',
  targetAudience: '',
  market: '',
  platform: '',
  toneOfVoice: '',
  keyMessage: '',
  deliverables: '',
  additionalNotes: '',
};

const EXAMPLE: BriefInput = {
  client: 'Azure Shores Developments',
  projectName: 'The Palm Residences',
  projectType: 'Luxury real estate launch',
  objective: 'Generate qualified leads and sell out phase one within 90 days',
  targetAudience: 'High-net-worth families and international investors, 35–60',
  market: 'Dubai, UAE',
  platform: 'Instagram, YouTube, Meta Ads, OOH, Sales gallery',
  toneOfVoice: 'Premium, warm, confident',
  keyMessage: 'Beachfront living, designed for generations',
  deliverables: 'Key visual, Bilingual brochure, 45s launch film, Social suite, Hoardings',
  additionalNotes: 'Developer logo lock-up and RERA number on all assets.',
};

const PROJECT_TYPES = ['Brand identity', 'Real estate launch', 'Social media campaign', 'Advertising campaign', 'AI visual production', 'Video production', 'Packaging design', 'Website / digital'];
const TONES = ['Premium, confident', 'Bold, energetic', 'Warm, human', 'Minimal, calm', 'Playful, witty', 'Authoritative, trustworthy', 'Cinematic, inspirational'];
const PLATFORMS = ['Instagram, TikTok', 'Instagram, Meta Ads, YouTube', 'OOH, Print, Digital', 'LinkedIn, Website', 'Multi-channel'];

export default function BriefGenerator() {
  const { briefs, clients, settings, addBrief, deleteBrief } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState<BriefInput>({ ...EMPTY, market: settings.defaultMarket });
  const [errors, setErrors] = useState<Partial<Record<keyof BriefInput, string>>>({});
  const gen = useGeneration<BriefOutput>();

  const activeId = params.get('id');
  const active: Brief | undefined = useMemo(() => briefs.find((b) => b.id === activeId), [briefs, activeId]);

  // Load a saved brief into the form when selected from history / search.
  useEffect(() => {
    if (active) {
      setForm(active.input);
      setErrors({});
      gen.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const set = (k: keyof BriefInput, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const next: typeof errors = {};
    if (!form.client.trim()) next.client = 'Required';
    if (!form.projectName.trim()) next.projectName = 'Required';
    if (!form.objective.trim()) next.objective = 'What should this work achieve?';
    setErrors(next);
    if (Object.keys(next).length) return;

    const output = await gen.run((p, signal) => p.generateBrief(form, signal));
    if (output) {
      const saved = addBrief({ input: form, output });
      setParams({ id: saved.id }, { replace: true });
      toast('Creative brief generated');
    }
  }

  function resetForm() {
    setForm({ ...EMPTY, market: settings.defaultMarket });
    setErrors({});
    gen.reset();
    setParams({}, { replace: true });
  }

  const historyItems = briefs.map((b) => ({ id: b.id, title: b.input.projectName, subtitle: b.input.client, createdAt: b.createdAt }));

  return (
    <div>
      <PageHeader
        eyebrow="Create"
        title="Creative Brief Generator"
        description="Turn a client conversation into a sharp, structured brief your team can execute from."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-5">
          <form onSubmit={submit} className="surface animate-fade-up p-5 sm:p-6" noValidate>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fog-50">Brief inputs</h2>
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
              <Input label="Client" required list="brief-clients" placeholder="Client or company" value={form.client} error={errors.client} onChange={(e) => set('client', e.target.value)} />
              <Input label="Project name" required placeholder="e.g. Marina Crest Launch" value={form.projectName} error={errors.projectName} onChange={(e) => set('projectName', e.target.value)} />
              <Input label="Project type" list="brief-types" placeholder="e.g. Real estate launch" value={form.projectType} onChange={(e) => set('projectType', e.target.value)} />
              <Input label="Market" placeholder="e.g. UAE, KSA" value={form.market} onChange={(e) => set('market', e.target.value)} />
              <Textarea label="Objective" required wrapperClassName="sm:col-span-2" rows={2} placeholder="What does success look like?" value={form.objective} error={errors.objective} onChange={(e) => set('objective', e.target.value)} />
              <Textarea label="Target audience" wrapperClassName="sm:col-span-2" rows={2} placeholder="Who are we talking to?" value={form.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} />
              <Input label="Platform" list="brief-platforms" placeholder="Instagram, OOH…" value={form.platform} onChange={(e) => set('platform', e.target.value)} />
              <Input label="Tone of voice" list="brief-tones" placeholder="Premium, warm…" value={form.toneOfVoice} onChange={(e) => set('toneOfVoice', e.target.value)} />
              <Textarea label="Key message" wrapperClassName="sm:col-span-2" rows={2} placeholder="The one thing they must remember" value={form.keyMessage} onChange={(e) => set('keyMessage', e.target.value)} />
              <Textarea label="Deliverables" wrapperClassName="sm:col-span-2" rows={2} placeholder="Comma-separated: Key visual, Social suite, 30s film…" value={form.deliverables} onChange={(e) => set('deliverables', e.target.value)} />
              <Textarea label="Additional notes" wrapperClassName="sm:col-span-2" rows={2} placeholder="Mandatories, references, budget, timing…" value={form.additionalNotes} onChange={(e) => set('additionalNotes', e.target.value)} />
            </div>
            <datalist id="brief-clients">
              {clients.map((c) => (
                <option key={c.id} value={c.company} />
              ))}
            </datalist>
            <datalist id="brief-types">{PROJECT_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            <datalist id="brief-tones">{TONES.map((t) => <option key={t} value={t} />)}</datalist>
            <datalist id="brief-platforms">{PLATFORMS.map((t) => <option key={t} value={t} />)}</datalist>

            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" size="lg" className="flex-1" loading={gen.status === 'loading'} icon={<Wand2 className="h-4 w-4" />}>
                {gen.status === 'loading' ? 'Generating brief…' : 'Generate brief'}
              </Button>
              {gen.status === 'loading' && (
                <Button size="lg" variant="ghost" onClick={gen.cancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <HistoryPanel
            title="Saved briefs"
            items={historyItems}
            activeId={activeId}
            onSelect={(id) => setParams({ id })}
            onDelete={(id) => {
              deleteBrief(id);
              if (id === activeId) setParams({}, { replace: true });
              toast('Brief deleted', 'info');
            }}
            emptyLabel="Generated briefs are saved here automatically."
          />
        </div>

        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            {gen.status === 'loading' ? (
              <GeneratingSkeleton label={`${gen.providerName} is writing your brief…`} blocks={5} />
            ) : gen.status === 'error' && gen.error ? (
              <ErrorState message={gen.error.message} hint={gen.error.hint} onRetry={() => submit()} />
            ) : active ? (
              <BriefView brief={active} />
            ) : (
              <IdleState
                icon={FileText}
                title="Your brief will appear here."
                description="Fill in what you know — the engine structures it into a complete brief with creative and visual direction."
                points={['Project overview', 'Objective & audience', 'Creative & visual direction', 'Deliverables & success criteria']}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefView({ brief }: { brief: Brief }) {
  const { input, output } = brief;
  return (
    <article className="surface animate-fade-up overflow-hidden">
      <header className="relative border-b border-white/[0.06] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="label">Creative Brief · {formatDate(brief.createdAt)}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fog-50 sm:text-3xl">{input.projectName}</h2>
            <p className="mt-1 font-display text-xl italic text-fog-300">{output.headline.split(' — ')[1] ?? output.headline}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fog-500">
              <span>Client · <span className="text-fog-300">{input.client}</span></span>
              {input.market && <span>Market · <span className="text-fog-300">{input.market}</span></span>}
              {input.platform && <span>Platform · <span className="text-fog-300">{input.platform}</span></span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => downloadText(`brief-${slugify(input.projectName)}.txt`, briefToText(brief))}
            >
              Export
            </Button>
            <CopyButton text={() => briefToText(brief)} label="Copy brief" variant="primary" toastMessage="Brief copied to clipboard" />
          </div>
        </div>
      </header>
      <div className="p-6 sm:p-8">
        {output.sections.map((s, i) => (
          <OutputBlock
            key={s.id}
            index={i + 1}
            title={s.title}
            actions={
              <CopyButton
                text={[s.body, ...(s.items ?? []).map((x) => `• ${x}`)].filter(Boolean).join('\n')}
                label=""
                variant="ghost"
                className="opacity-0 transition group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100"
                toastMessage={`${s.title} copied`}
              />
            }
          >
            {s.body && <p className={s.id === 'message' ? 'font-display text-2xl italic leading-snug text-fog-50' : ''}>{s.body}</p>}
            {s.items && <div className={s.body ? 'mt-4' : ''}><BulletList items={s.items} /></div>}
          </OutputBlock>
        ))}
      </div>
    </article>
  );
}
