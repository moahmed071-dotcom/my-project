import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { DesignEditor } from '../editor/DesignEditor';
import { MobileEditor } from '../editor/MobileEditor';
import { useEditor } from '../editor/useEditor';
import type { DesignDocument } from '../model/types';

function useIsDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

function EditorHost({ initial }: { initial: DesignDocument }) {
  const editor = useEditor(initial);
  const desktop = useIsDesktop();
  return desktop ? <DesignEditor editor={editor} /> : <MobileEditor editor={editor} />;
}

export default function DesignEditorPage() {
  const { id } = useParams();
  const { designs } = useStore();
  // Load once per id: the editor owns the working copy and autosaves it back.
  const [initial] = useState(() => designs.find((d) => d.id === id) ?? null);
  const found = initial && initial.id === id ? initial : designs.find((d) => d.id === id);

  if (!found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <FileQuestion className="h-8 w-8 text-fog-500" />
        <h1 className="mt-4 text-lg font-semibold text-fog-50">Design not found</h1>
        <p className="mt-1 text-sm text-fog-400">It may have been deleted, or it was created in another browser.</p>
        <Link to="/studio" className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-strong">
          Back to Design Studio
        </Link>
      </div>
    );
  }
  return <EditorHost key={found.id} initial={found} />;
}
