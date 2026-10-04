import { useRef, useState, type ReactNode } from 'react';
import { Cpu, Database, Download, Palette, RefreshCw, Trash2, Upload, User } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { ASPECT_RATIOS } from '@/services/ai/promptTypes';
import { downloadText } from '@/lib/download';
import { pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AIProviderId } from '@/types';

function Section({ icon: Icon, title, description, children }: { icon: typeof User; title: string; description: string; children: ReactNode }) {
  return (
    <section className="surface grid animate-fade-up gap-6 p-6 md:grid-cols-3 md:gap-10 sm:p-8">
      <div>
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-ink-800">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <h2 className="text-sm font-semibold text-fog-50">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-fog-500">{description}</p>
      </div>
      <div className="space-y-4 md:col-span-2">{children}</div>
    </section>
  );
}

const PROVIDERS: { id: AIProviderId; title: string; description: string; badge: string }[] = [
  { id: 'local', title: 'Local Creative Engine', description: 'Runs entirely in your browser. No API key, no data leaves your device.', badge: 'Active by default' },
  { id: 'remote', title: 'Remote AI Endpoint', description: 'Send requests to your own backend that calls an LLM (e.g. Claude). Keys stay on the server.', badge: 'Advanced' },
];

export default function SettingsPage() {
  const store = useStore();
  const { settings, updateSettings } = store;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  async function onImport(file: File) {
    try {
      store.importData(await file.text());
      toast('Workspace imported');
    } catch (err) {
      toast((err as Error).message || 'Import failed', 'error');
    }
  }

  return (
    <div>
      <PageHeader eyebrow="System" title="Settings" description="Tune your workspace, generation engine and data. Changes save automatically." />

      <div className="space-y-6">
        <Section icon={User} title="Profile" description="Used across the dashboard and in generated documents.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Display name" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} />
            <Input label="Studio / company" value={settings.studio} onChange={(e) => updateSettings({ studio: e.target.value })} />
            <Input label="Role" wrapperClassName="sm:col-span-2" value={settings.role} onChange={(e) => updateSettings({ role: e.target.value })} />
          </div>
        </Section>

        <Section icon={Palette} title="Creative defaults" description="Pre-fill generators so you start closer to done.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Default market" placeholder="e.g. UAE" value={settings.defaultMarket} onChange={(e) => updateSettings({ defaultMarket: e.target.value })} />
            <Select label="Default aspect ratio" value={settings.defaultAspectRatio} options={ASPECT_RATIOS} onChange={(e) => updateSettings({ defaultAspectRatio: e.target.value })} />
          </div>
          <div className="border-t border-white/[0.05] pt-4">
            <Toggle
              checked={settings.compactSidebar}
              onChange={(v) => updateSettings({ compactSidebar: v })}
              label="Compact sidebar"
              description="Collapse navigation to icons on desktop."
            />
          </div>
        </Section>

        <Section icon={Cpu} title="AI engine" description="Choose what powers the generators. The architecture is provider-agnostic, so a live model can be connected later.">
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => updateSettings({ aiProvider: p.id })}
                aria-pressed={settings.aiProvider === p.id}
                className={cn(
                  'rounded-xl border p-4 text-left transition',
                  settings.aiProvider === p.id ? 'border-accent/50 bg-accent/[0.05]' : 'border-white/[0.08] hover:border-white/[0.16]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-fog-50">{p.title}</span>
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full border-2',
                      settings.aiProvider === p.id ? 'border-accent bg-accent shadow-[inset_0_0_0_3px_#0E0E11]' : 'border-fog-500',
                    )}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-fog-400">{p.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-wider text-fog-500">{p.badge}</p>
              </button>
            ))}
          </div>

          {settings.aiProvider === 'remote' && (
            <div className="grid animate-fade-in gap-4 rounded-xl border border-white/[0.06] bg-ink-850/50 p-4 sm:grid-cols-2">
              <Input
                label="Endpoint URL"
                wrapperClassName="sm:col-span-2"
                placeholder="https://your-api.example.com/generate"
                value={settings.remoteEndpoint}
                onChange={(e) => updateSettings({ remoteEndpoint: e.target.value })}
                hint="POST { task, model, input } → returns the structured JSON output. See README for the contract."
              />
              <Input label="Model" value={settings.remoteModel} onChange={(e) => updateSettings({ remoteModel: e.target.value })} />
            </div>
          )}

          <div className="border-t border-white/[0.05] pt-4">
            <Toggle
              checked={settings.simulateLatency}
              onChange={(v) => updateSettings({ simulateLatency: v })}
              label="Simulate generation time"
              description="Adds a short realistic delay to the local engine so loading states feel natural."
            />
          </div>
        </Section>

        <Section icon={Database} title="Data" description="Everything is stored locally in this browser. Export regularly to keep a backup.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Projects', store.projects.length],
              ['Clients', store.clients.length],
              ['Briefs', store.briefs.length],
              ['Campaigns', store.campaigns.length],
            ].map(([label, n]) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-ink-850/50 p-3">
                <p className="text-2xl font-semibold tracking-tight text-fog-50">{n}</p>
                <p className="text-[11px] text-fog-500">{label}</p>
              </div>
            ))}
          </div>
          {store.storageError && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
              Local storage is unavailable or full — changes may not persist after refresh. Export your data to keep a copy.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                downloadText(`creative-os-backup-${new Date().toISOString().slice(0, 10)}.json`, store.exportData(), 'application/json');
                toast('Backup downloaded');
              }}
            >
              Export JSON
            </Button>
            <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = '';
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.05] pt-4">
            <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setConfirm('reset')}>
              Restore sample data
            </Button>
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('clear')}>
              Clear all data
            </Button>
          </div>
        </Section>

        <p className="pb-4 text-center text-xs text-fog-600">Mohamed Creative OS · v0.1.0 · {pluralize(store.promptSets.length, 'prompt set')} in library</p>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Restore sample data?"
        message="Your current projects, clients, briefs, campaigns and prompts will be replaced with the sample workspace. Settings are kept."
        confirmLabel="Restore"
        onConfirm={() => {
          store.resetToSample();
          toast('Sample data restored');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Clear all data?"
        message="This permanently deletes every project, client, brief, campaign and prompt from this browser. Export a backup first if you might need it."
        confirmLabel="Clear everything"
        onConfirm={() => {
          store.clearData();
          toast('All data cleared', 'info');
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
