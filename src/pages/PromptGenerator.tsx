import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Building2, Camera, Check, Clapperboard, Film, ImageIcon, LayoutTemplate, RotateCcw, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { useGeneration } from '@/store/useGeneration';
import { PROMPT_TYPES, type GeneratedPrompt, type PromptFields, type PromptInput, type PromptSet, type PromptType } from '@/types';
import { PROMPT_TYPE_META, ASPECT_RATIOS, PROMPT_STYLES } from '@/services/ai/promptTypes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { GeneratingSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { HistoryPanel } from '@/components/generator/HistoryPanel';
import { IdleState } from '@/components/generator/IdleState';
import { promptToText } from '@/lib/serialize';
import { cn } from '@/lib/cn';

const TYPE_ICONS: Record<PromptType, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  product: Box,
  realEstate: Building2,
  social: LayoutTemplate,
  cinematic: Clapperboard,
};

const FIELD_LABELS: [keyof PromptFields, string][] = [
  ['subject', 'Subject'],
  ['environment', 'Environment'],
  ['composition', 'Composition'],
  ['camera', 'Camera'],
  ['lighting', 'Lighting'],
  ['materials', 'Materials'],
  ['colorDirection', 'Color Direction'],
  ['mood', 'Mood'],
  ['style', 'Style'],
  ['aspectRatio', 'Aspect Ratio'],
  ['negativePrompt', 'Negative Prompt'],
];

const IDEA_STARTERS = [
  'A minimalist oud perfume bottle on black volcanic stone with soft smoke curling around it',
  'Golden-hour aerial of a waterfront villa community with private beaches and palm-lined streets',
  'A young woman laughing on a rooftop café in Riyadh at sunset, holding a specialty iced coffee',
  'A matte black electric SUV driving through a desert canyon at dawn',
];

export default function PromptGenerator() {
  const { promptSets, briefs, campaigns, settings, addPromptSet, deletePromptSet } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState<PromptInput>({
    idea: '',
    style: 'Auto',
    aspectRatio: settings.defaultAspectRatio,
    types: [...PROMPT_TYPES],
  });
  const [ideaError, setIdeaError] = useState<string>();
  const [tab, setTab] = useState<PromptType | null>(null);
  const gen = useGeneration<GeneratedPrompt[]>();

  const activeId = params.get('id');
  const active = useMemo(() => promptSets.find((p) => p.id === activeId), [promptSets, activeId]);

  useEffect(() => {
    if (active) {
      setForm(active.input);
      setTab(active.prompts[0]?.type ?? null);
      gen.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const sources = useMemo(
    () => [
      ...campaigns.slice(0, 6).map((c) => ({
        value: `cp:${c.id}`,
        label: `Campaign · ${c.input.brand} — ${c.output.bigIdea}`,
        idea: `${c.input.product} for ${c.input.brand}: ${c.output.keyVisual[0]?.replace(/^Hero frame:\s*/i, '') ?? c.output.bigIdea}`,
      })),
      ...briefs.slice(0, 6).map((b) => ({
        value: `br:${b.id}`,
        label: `Brief · ${b.input.projectName}`,
        idea: `${b.input.projectName} for ${b.input.client} — ${b.input.keyMessage || b.input.objective}. ${b.output.sections.find((s) => s.id === 'visual')?.items?.[0]?.replace(/^Setting — /, '') ?? ''}`.trim(),
      })),
    ],
    [briefs, campaigns],
  );

  function toggleType(t: PromptType) {
    setForm((f) => ({ ...f, types: f.types.includes(t) ? f.types.filter((x) => x !== t) : PROMPT_TYPES.filter((x) => x === t || f.types.includes(x)) }));
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (form.idea.trim().length < 8) {
      setIdeaError('Describe your idea in at least a few words.');
      return;
    }
    if (!form.types.length) {
      toast('Select at least one prompt type', 'error');
      return;
    }
    setIdeaError(undefined);
    const prompts = await gen.run((p, signal) => p.generatePrompts(form, signal));
    if (prompts) {
      const saved = addPromptSet({ input: form, prompts });
      setParams({ id: saved.id }, { replace: true });
      toast(`${prompts.length} prompts generated`);
    }
  }

  function resetForm() {
    setForm({ idea: '', style: 'Auto', aspectRatio: settings.defaultAspectRatio, types: [...PROMPT_TYPES] });
    setIdeaError(undefined);
    gen.reset();
    setParams({}, { replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Create"
        title="AI Prompt Generator"
        description="Translate a creative idea into production-grade prompts for image, video and visualization tools."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-5">
          <form onSubmit={submit} className="surface animate-fade-up p-5 sm:p-6" noValidate>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fog-50">Your idea</h2>
              <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={resetForm}>
                Reset
              </Button>
            </div>

            {sources.length > 0 && (
              <Select
                label="Start from a saved brief or campaign"
                wrapperClassName="mb-4"
                value=""
                placeholder="Choose a source (optional)…"
                options={sources}
                onChange={(e) => {
                  const src = sources.find((s) => s.value === e.target.value);
                  if (src) {
                    setForm((f) => ({ ...f, idea: src.idea }));
                    setIdeaError(undefined);
                  }
                }}
              />
            )}

            <Textarea
              label="Creative idea or brief"
              required
              rows={5}
              placeholder="Describe the subject, setting and feeling. e.g. A sunset penthouse terrace overlooking the marina…"
              value={form.idea}
              error={ideaError}
              onChange={(e) => {
                setForm((f) => ({ ...f, idea: e.target.value }));
                if (ideaError) setIdeaError(undefined);
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEA_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, idea: s }))}
                  className="max-w-full truncate rounded-full border border-white/[0.06] px-2.5 py-1 text-[11px] text-fog-400 transition hover:border-white/[0.14] hover:text-fog-100"
                  title={s}
                >
                  {s.split(' ').slice(0, 5).join(' ')}…
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Select label="Style" value={form.style} options={PROMPT_STYLES} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))} />
              <Select label="Aspect ratio" value={form.aspectRatio} options={ASPECT_RATIOS} onChange={(e) => setForm((f) => ({ ...f, aspectRatio: e.target.value }))} />
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 flex w-full items-center justify-between text-xs font-medium text-fog-200">
                Prompt types
                <button
                  type="button"
                  className="text-[11px] font-normal text-fog-500 hover:text-accent"
                  onClick={() => setForm((f) => ({ ...f, types: f.types.length === PROMPT_TYPES.length ? [] : [...PROMPT_TYPES] }))}
                >
                  {form.types.length === PROMPT_TYPES.length ? 'Clear all' : 'Select all'}
                </button>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_TYPES.map((t) => {
                  const Icon = TYPE_ICONS[t];
                  const on = form.types.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      aria-pressed={on}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                        on ? 'border-accent/40 bg-accent/[0.06]' : 'border-white/[0.06] hover:border-white/[0.14]',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', on ? 'text-accent' : 'text-fog-500')} />
                      <span className={cn('flex-1 truncate text-xs', on ? 'text-fog-50' : 'text-fog-400')}>{PROMPT_TYPE_META[t].short}</span>
                      {on && <Check className="h-3.5 w-3.5 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" size="lg" className="flex-1" loading={gen.status === 'loading'} icon={<Wand2 className="h-4 w-4" />}>
                {gen.status === 'loading' ? 'Crafting prompts…' : `Generate ${form.types.length || ''} prompt${form.types.length === 1 ? '' : 's'}`}
              </Button>
              {gen.status === 'loading' && (
                <Button size="lg" variant="ghost" onClick={gen.cancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <HistoryPanel
            title="Prompt library"
            items={promptSets.map((p) => ({ id: p.id, title: p.input.idea, subtitle: `${p.prompts.length} prompts`, createdAt: p.createdAt }))}
            activeId={activeId}
            onSelect={(id) => setParams({ id })}
            onDelete={(id) => {
              deletePromptSet(id);
              if (id === activeId) setParams({}, { replace: true });
              toast('Prompt set deleted', 'info');
            }}
            emptyLabel="Generated prompt sets are saved here automatically."
          />
        </div>

        <div className="lg:col-span-7">
          {gen.status === 'loading' ? (
            <GeneratingSkeleton label={`${gen.providerName} is crafting your prompts…`} blocks={4} />
          ) : gen.status === 'error' && gen.error ? (
            <ErrorState message={gen.error.message} hint={gen.error.hint} onRetry={() => submit()} />
          ) : active ? (
            <PromptSetView set={active} tab={tab} onTab={setTab} />
          ) : (
            <IdleState
              icon={Sparkles}
              title="From idea to render-ready."
              description="Every prompt is broken into the eleven controls art directors actually use — and compiled into one paste-ready line."
              points={['Image & video generation', 'Product photography', 'Real estate visualization', 'Social & cinematic advertising']}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PromptSetView({ set, tab, onTab }: { set: PromptSet; tab: PromptType | null; onTab: (t: PromptType) => void }) {
  const current = set.prompts.find((p) => p.type === tab) ?? set.prompts[0];
  if (!current) return null;
  const Icon = TYPE_ICONS[current.type];
  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
          {set.prompts.map((p) => {
            const TIcon = TYPE_ICONS[p.type];
            const on = p.type === current.type;
            return (
              <button
                key={p.type}
                onClick={() => onTab(p.type)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  on ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/[0.06] text-fog-400 hover:text-fog-100',
                )}
              >
                <TIcon className="h-3.5 w-3.5" />
                {PROMPT_TYPE_META[p.type].short}
              </button>
            );
          })}
        </div>
        <CopyButton
          className="shrink-0"
          text={() => set.prompts.map(promptToText).join('\n\n———\n\n')}
          label="Copy all"
          toastMessage={`${set.prompts.length} prompts copied`}
        />
      </div>

      <article key={current.type} className="surface animate-fade-in overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-white/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-ink-800">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fog-50">{PROMPT_TYPE_META[current.type].label}</h2>
              <p className="text-xs text-fog-500">{PROMPT_TYPE_META[current.type].description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <CopyButton text={() => promptToText(current)} label="Copy structured" variant="outline" toastMessage="Structured prompt copied" />
            <CopyButton text={current.compiled} label="Copy prompt" variant="primary" toastMessage="Prompt copied" />
          </div>
        </header>

        <div className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <Camera className="h-3.5 w-3.5 text-fog-500" />
            <p className="label">Compiled prompt</p>
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-ink-950 p-4 font-mono text-[12.5px] leading-relaxed text-fog-200">
            {current.compiled}
          </pre>

          <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2">
            {FIELD_LABELS.map(([key, label]) => (
              <div
                key={key}
                className={cn('bg-ink-900 p-4', (key === 'subject' || key === 'negativePrompt') && 'sm:col-span-2')}
              >
                <dt className="label text-[10px]">{label}</dt>
                <dd className={cn('mt-1.5 text-sm leading-relaxed', key === 'negativePrompt' ? 'text-red-200/70' : 'text-fog-200')}>
                  {current.fields[key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    </div>
  );
}
