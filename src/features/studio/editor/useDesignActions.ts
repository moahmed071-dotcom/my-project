import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { downloadBlob, downloadText, slugify } from '@/lib/download';
import { useAssets } from '../assets/assetStore';
import { duplicateDesign } from '../model/document';
import type { DesignDocument } from '../model/types';
import { exportJson, exportPng, exportSvg } from '../render/exporters';
import type { Editor } from './useEditor';

export type SaveStatus = 'saved' | 'unsaved' | 'saving';
export type ExportFormat = 'png' | 'svg' | 'json';

/** Autosave, explicit save, export and duplicate for an open design. */
export function useDesignActions(editor: Editor) {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { exportSrc } = useAssets();
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const latest = useRef<DesignDocument>(editor.doc);
  const dirty = useRef(false);
  latest.current = editor.doc;

  const save = useCallback(
    (announce = false) => {
      store.saveDesign(latest.current);
      dirty.current = false;
      setStatus('saved');
      if (announce) toast('Design saved');
    },
    [store, toast],
  );

  // Debounced autosave after every change.
  useEffect(() => {
    if (editor.revision === 0) return;
    dirty.current = true;
    setStatus('unsaved');
    const t = setTimeout(() => save(false), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.revision]);

  // Flush on leave.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(
    () => () => {
      if (dirty.current) saveRef.current(false);
    },
    [],
  );
  useEffect(() => {
    const onUnload = () => dirty.current && saveRef.current(false);
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const runExport = useCallback(
    async (format: ExportFormat) => {
      const doc = latest.current;
      const base = `${slugify(doc.name)}-${doc.width}x${doc.height}`;
      setExporting(format);
      try {
        if (format === 'png') {
          const r = await exportPng(doc, exportSrc);
          downloadBlob(`${base}.png`, r.data);
          r.warnings.forEach((w) => toast(w, 'info'));
        } else if (format === 'svg') {
          const r = await exportSvg(doc, exportSrc);
          downloadText(`${base}.svg`, r.data, 'image/svg+xml');
          r.warnings.forEach((w) => toast(w, 'info'));
        } else {
          const r = await exportJson(doc, exportSrc);
          downloadText(`${base}.design.json`, r.data, 'application/json');
        }
        toast(`Exported ${format.toUpperCase()}`);
      } catch (e) {
        toast(`Export failed: ${(e as Error).message}`, 'error');
      } finally {
        setExporting(null);
      }
    },
    [exportSrc, toast],
  );

  const duplicate = useCallback(() => {
    save(false);
    const copy = duplicateDesign(latest.current);
    store.saveDesign(copy);
    toast(`Duplicated as “${copy.name}”`);
    navigate(`/studio/${copy.id}`);
  }, [save, store, toast, navigate]);

  return { status, save, runExport, exporting, duplicate };
}
