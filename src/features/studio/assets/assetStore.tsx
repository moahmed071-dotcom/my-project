import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { uid } from '@/lib/id';

/**
 * Uploaded images live in IndexedDB (localStorage is far too small for
 * photos). Designs reference them as `asset:<id>`; the editor displays them
 * through object URLs and exports embed them as data URLs.
 */

export interface Asset {
  id: string;
  name: string;
  kind: 'image' | 'logo';
  mime: string;
  width: number;
  height: number;
  dataUrl: string;
  createdAt: string;
}

const DB_NAME = 'mcos-studio';
const STORE = 'assets';
const MAX_DIMENSION = 2400;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const assetDb = {
  all: () => tx<Asset[]>('readonly', (s) => s.getAll() as IDBRequest<Asset[]>),
  put: (a: Asset) => tx('readwrite', (s) => s.put(a)),
  remove: (id: string) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

export const isAssetRef = (src: string | null | undefined): src is string => !!src && src.startsWith('asset:');
export const assetId = (src: string) => src.slice('asset:'.length);

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file couldn’t be read as an image.'));
    img.src = src;
  });
}

/** Read an image file, downscaling very large photos to keep storage reasonable. */
export async function fileToAsset(file: File, kind: Asset['kind']): Promise<Asset> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (PNG, JPG, SVG or WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('That image is larger than 25 MB.');
  let dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);
  let { naturalWidth: w, naturalHeight: h } = img;
  const isVector = file.type === 'image/svg+xml';
  if (!isVector && Math.max(w, h) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    dataUrl = canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.9);
  }
  return { id: uid('as'), name: file.name, kind, mime: file.type, width: w || 1, height: h || 1, dataUrl, createdAt: new Date().toISOString() };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = head.includes(';base64') ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ─── React context ──────────────────────────────────────────────────────────

interface AssetContextValue {
  assets: Asset[];
  ready: boolean;
  error: string | null;
  add(file: File, kind?: Asset['kind']): Promise<Asset>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
  /** Source usable in the editor (object URL for assets). */
  displaySrc(src: string | null | undefined): string | null;
  /** Self-contained source for export (data URL for assets). */
  exportSrc(src: string | null | undefined): string | null;
  get(id: string): Asset | undefined;
}

const AssetContext = createContext<AssetContextValue | null>(null);

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    assetDb
      .all()
      .then((list) => {
        if (!alive) return;
        setAssets(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setUrls(Object.fromEntries(list.map((a) => [a.id, URL.createObjectURL(dataUrlToBlob(a.dataUrl))])));
      })
      .catch(() => alive && setError('Uploads are unavailable in this browser (storage is blocked).'))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const add = useCallback(async (file: File, kind: Asset['kind'] = 'image') => {
    const asset = await fileToAsset(file, kind);
    try {
      await assetDb.put(asset);
    } catch {
      throw new Error('Couldn’t save the upload — browser storage may be full or blocked.');
    }
    setAssets((a) => [asset, ...a]);
    setUrls((u) => ({ ...u, [asset.id]: URL.createObjectURL(dataUrlToBlob(asset.dataUrl)) }));
    return asset;
  }, []);

  const remove = useCallback(async (id: string) => {
    await assetDb.remove(id).catch(() => undefined);
    setAssets((a) => a.filter((x) => x.id !== id));
    setUrls((u) => {
      if (u[id]) URL.revokeObjectURL(u[id]);
      const { [id]: _, ...rest } = u;
      return rest;
    });
  }, []);

  const clearAll = useCallback(async () => {
    await assetDb.clear().catch(() => undefined);
    setAssets([]);
    setUrls({});
  }, []);

  const value = useMemo<AssetContextValue>(() => {
    const byId = new Map(assets.map((a) => [a.id, a]));
    return {
      assets,
      ready,
      error,
      add,
      remove,
      clearAll,
      get: (id) => byId.get(id),
      displaySrc: (src) => (isAssetRef(src) ? (urls[assetId(src)] ?? null) : (src ?? null)),
      exportSrc: (src) => (isAssetRef(src) ? (byId.get(assetId(src))?.dataUrl ?? null) : (src ?? null)),
    };
  }, [assets, urls, ready, error, add, remove, clearAll]);

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets(): AssetContextValue {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error('useAssets must be used inside <AssetProvider>');
  return ctx;
}
