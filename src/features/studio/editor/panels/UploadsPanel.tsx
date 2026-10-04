import { useRef, useState } from 'react';
import { Link2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/Toast';
import { useAssets, type Asset } from '../../assets/assetStore';
import { makeImage } from '../../model/elements';
import type { Editor } from '../useEditor';
import { PanelSection } from '../controls';

export function UploadsPanel({ editor }: { editor: Editor }) {
  const { assets, add, remove, displaySrc, error } = useAssets();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const { doc, selected } = editor;
  const replacing = selected?.type === 'image' || selected?.type === 'logo';

  function place(src: string, w: number, h: number) {
    if (selected && (selected.type === 'image' || selected.type === 'logo')) {
      editor.update(selected.id, { src });
      toast('Image replaced');
      return;
    }
    const maxW = doc.width * 0.6;
    const maxH = doc.height * 0.6;
    const s = Math.min(maxW / w, maxH / h);
    const width = Math.round(w * s);
    const height = Math.round(h * s);
    editor.add(makeImage({ x: Math.round((doc.width - width) / 2), y: Math.round((doc.height - height) / 2), width, height, src }));
  }

  async function upload(files: FileList | File[]) {
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const a = await add(f, 'image');
        toast(`Uploaded ${a.name}`);
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelSection title="Upload">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
          }}
          className={cn('flex flex-col items-center gap-2 rounded-md border border-dashed px-3 py-6 text-center transition', drag ? 'border-accent/70 bg-accent/[0.05]' : 'border-white/10')}
        >
          <Upload className="h-5 w-5 text-fog-400" />
          <p className="text-xs text-fog-300">Drop images here</p>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="mt-1 h-8 rounded-md bg-white/[0.08] px-3 text-xs font-medium text-fog-50 hover:bg-white/[0.12] disabled:opacity-50">
            {busy ? 'Uploading…' : 'Choose files'}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            data-testid="upload-input"
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {error && <p className="mt-2 text-[11px] text-amber-200">{error}</p>}
      </PanelSection>

      <PanelSection title="From URL">
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const u = url.trim();
            if (!/^https?:\/\/\S+$/i.test(u)) {
              toast('Enter a full image URL starting with https://', 'error');
              return;
            }
            const img = new Image();
            img.onload = () => place(u, img.naturalWidth || 1200, img.naturalHeight || 800);
            img.onerror = () => toast('That URL didn’t load as an image', 'error');
            img.src = u;
            setUrl('');
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog-500" />
            <input aria-label="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-8 w-full rounded-md border border-white/[0.07] bg-ink-850 pl-7 pr-2 text-xs text-fog-50 placeholder:text-fog-600 focus:border-accent/50 focus:outline-none" />
          </div>
          <button type="submit" className="h-8 rounded-md bg-white/[0.08] px-2.5 text-xs text-fog-50 hover:bg-white/[0.12]">
            {replacing ? 'Replace' : 'Add'}
          </button>
        </form>
      </PanelSection>

      <PanelSection title={`Your uploads${assets.length ? ` · ${assets.length}` : ''}`}>
        {replacing && <p className="mb-2 text-[11px] text-accent">Click an upload to replace the selected {selected?.type}.</p>}
        {assets.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-fog-500">Uploads are stored in this browser and can be reused in any design.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5" data-testid="uploads">
            {assets.map((a: Asset) => (
              <div key={a.id} className="group relative overflow-hidden rounded-md border border-white/[0.06] bg-ink-850">
                <button type="button" aria-label={`Place ${a.name}`} className="block aspect-square w-full" onClick={() => place(`asset:${a.id}`, a.width, a.height)}>
                  <img src={displaySrc(`asset:${a.id}`) ?? ''} alt={a.name} className="h-full w-full object-cover" />
                </button>
                <button type="button" aria-label={`Delete ${a.name}`} onClick={() => remove(a.id)} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-fog-300 opacity-0 transition hover:text-red-300 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}
