import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { googleFontsUrl, loadFonts } from '../model/fonts';
import { DESIGN_SCHEMA, DESIGN_SCHEMA_VERSION, type DesignDocument } from '../model/types';
import { DesignSvg } from './DesignSvg';

/**
 * Export pipeline. SVG, PNG and JSON are all produced from the same document;
 * SVG/PNG use the same renderer as the editor so output matches the canvas.
 */

export interface ExportResult<T> {
  data: T;
  warnings: string[];
}

type SrcResolver = (src: string | null | undefined) => string | null;

interface FontSpec {
  family: string;
  weight: number;
  italic: boolean;
}

export function fontsUsed(doc: DesignDocument): FontSpec[] {
  const specs = new Map<string, FontSpec>();
  const add = (family: string, weight: number, italic = false) => specs.set(`${family}|${weight}|${italic}`, { family, weight, italic });
  for (const el of doc.elements) {
    if (el.type === 'text') add(el.fontFamily, el.fontWeight, el.fontStyle === 'italic');
    if (el.type === 'logo' && !el.src) add(doc.brand.fonts.heading, 600);
  }
  return [...specs.values()];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function fetchDataUrl(url: string, timeoutMs = 8000): Promise<string> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', signal: ac.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await blobToDataUrl(await res.blob());
  } finally {
    clearTimeout(t);
  }
}

/** Replace every image source with a self-contained data URL where possible. */
async function inlineImages(doc: DesignDocument, exportSrc: SrcResolver, keepRemote: boolean): Promise<{ doc: DesignDocument; warnings: string[] }> {
  const warnings: string[] = [];
  const cache = new Map<string, string | null>();
  const resolve = async (src: string | null): Promise<string | null> => {
    if (!src) return null;
    if (cache.has(src)) return cache.get(src)!;
    let out: string | null = exportSrc(src);
    if (out && /^https?:/i.test(out)) {
      try {
        out = await fetchDataUrl(out);
      } catch {
        warnings.push(keepRemote ? `An image from ${new URL(out).host} is linked, not embedded (the host blocks downloads).` : `An image from ${new URL(out).host} was left out: the host doesn’t allow it to be exported. Upload the file instead.`);
        out = keepRemote ? out : null;
      }
    } else if (!out) {
      warnings.push('An uploaded image is missing from this browser and was left out.');
    }
    cache.set(src, out);
    return out;
  };
  const elements = await Promise.all(
    doc.elements.map(async (el) => (el.type === 'image' || el.type === 'logo' ? { ...el, src: await resolve(el.src) } : el)),
  );
  return { doc: { ...doc, elements, brand: { ...doc.brand, logo: await resolve(doc.brand.logo) } }, warnings };
}

/** Download the Google Fonts actually used and inline them as @font-face data URLs. */
async function embeddedFontCss(specs: FontSpec[]): Promise<string | null> {
  if (!specs.length) return '';
  try {
    const families = [...new Set(specs.map((s) => s.family))];
    const css = await (await fetch(googleFontsUrl(families))).text();
    const blocks = css.split('@font-face').slice(1);
    const wanted = blocks.filter((b, i) => {
      const subset = /\/\*\s*([\w-]+)\s*\*\/\s*$/.exec(css.split('@font-face')[i] ?? '')?.[1] ?? 'latin';
      const fam = /font-family:\s*'([^']+)'/.exec(b)?.[1];
      const weight = Number(/font-weight:\s*(\d+)/.exec(b)?.[1]);
      const italic = /font-style:\s*italic/.test(b);
      return (subset === 'latin' || subset === 'arabic') && specs.some((s) => s.family === fam && s.weight === weight && s.italic === italic);
    });
    const out = await Promise.all(
      wanted.map(async (b) => {
        const url = /url\(([^)]+)\)/.exec(b)?.[1];
        if (!url) return '';
        const data = await fetchDataUrl(url.replace(/['"]/g, ''));
        return `@font-face${b.replace(/url\([^)]+\)/, `url(${data})`).trim()}`;
      }),
    );
    return out.join('\n');
  } catch {
    return null;
  }
}

function svgMarkup(doc: DesignDocument, fontCss: string | undefined): string {
  const markup = renderToStaticMarkup(
    createElement(DesignSvg, { doc, idPrefix: 'd', resolveSrc: (s: string | null | undefined) => s ?? null, fontCss, pixelSize: true }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * SVG keeps text as live <text> elements and shapes as vectors. Images are
 * embedded; fonts are referenced from Google Fonts so the file stays light.
 */
export async function exportSvg(doc: DesignDocument, exportSrc: SrcResolver): Promise<ExportResult<string>> {
  await loadFonts(fontsUsed(doc));
  const { doc: inlined, warnings } = await inlineImages(doc, exportSrc, true);
  const families = [...new Set(fontsUsed(doc).map((f) => f.family))];
  const css = families.length ? `@import url('${googleFontsUrl(families)}');` : undefined;
  return { data: svgMarkup(inlined, css), warnings };
}

/** PNG at the design's exact pixel size, rendered from the same SVG. */
export async function exportPng(doc: DesignDocument, exportSrc: SrcResolver): Promise<ExportResult<Blob>> {
  const specs = fontsUsed(doc);
  await loadFonts(specs);
  const { doc: inlined, warnings } = await inlineImages(doc, exportSrc, false);
  const fontCss = await embeddedFontCss(specs);
  if (fontCss === null && specs.length) warnings.push('Fonts couldn’t be downloaded for embedding, so the PNG may use fallback fonts. Check your connection and export again.');
  const svg = svgMarkup(inlined, fontCss ?? undefined);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The design couldn’t be rasterised.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = doc.width;
    canvas.height = doc.height;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas is unavailable in this browser.');
    c.drawImage(img, 0, 0, doc.width, doc.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The PNG couldn’t be created.');
    return { data: blob, warnings };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Complete, portable design structure with images embedded. */
export async function exportJson(doc: DesignDocument, exportSrc: SrcResolver): Promise<ExportResult<string>> {
  const { doc: inlined, warnings } = await inlineImages(doc, exportSrc, true);
  const payload = {
    format: DESIGN_SCHEMA,
    version: DESIGN_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    generator: 'Mohamed Creative OS · Design Studio',
    design: inlined,
  };
  return { data: JSON.stringify(payload, null, 2), warnings };
}
