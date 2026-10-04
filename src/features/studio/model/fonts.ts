/** Curated Google Fonts available in the Design Studio. */
export interface FontOption {
  family: string;
  category: 'serif' | 'sans' | 'display' | 'arabic';
  weights: number[];
  italic?: boolean;
}

export const FONT_CATALOG: FontOption[] = [
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800], italic: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [400, 500, 600, 700], italic: true },
  { family: 'Bodoni Moda', category: 'serif', weights: [400, 500, 600, 700], italic: true },
  { family: 'DM Serif Display', category: 'serif', weights: [400], italic: true },
  { family: 'Instrument Serif', category: 'serif', weights: [400], italic: true },
  { family: 'Manrope', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'Inter', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'DM Sans', category: 'sans', weights: [400, 500, 600, 700] },
  { family: 'Montserrat', category: 'sans', weights: [400, 500, 600, 700, 800] },
  { family: 'Archivo', category: 'sans', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Syne', category: 'display', weights: [400, 500, 600, 700, 800] },
  { family: 'Tajawal', category: 'arabic', weights: [400, 500, 700, 800] },
  { family: 'IBM Plex Sans Arabic', category: 'arabic', weights: [400, 500, 600, 700] },
];

export const FONT_WEIGHTS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra bold' },
  { value: 900, label: 'Black' },
];

const FALLBACKS: Record<FontOption['category'], string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Helvetica, Arial, sans-serif',
  display: 'Helvetica, Arial, sans-serif',
  arabic: 'Tahoma, Arial, sans-serif',
};

export function fontStack(family: string): string {
  const f = FONT_CATALOG.find((x) => x.family === family);
  return `"${family}", ${FALLBACKS[f?.category ?? 'sans']}`;
}

/** Google Fonts CSS2 URL for the given families (all catalog weights). */
export function googleFontsUrl(families: string[]): string {
  const params = families
    .map((fam) => FONT_CATALOG.find((f) => f.family === fam))
    .filter((f): f is FontOption => !!f)
    .map((f) => {
      const name = f.family.replace(/ /g, '+');
      if (f.italic) {
        const pairs = [...f.weights.map((w) => `0,${w}`), ...f.weights.map((w) => `1,${w}`)];
        return `family=${name}:ital,wght@${pairs.join(';')}`;
      }
      return `family=${name}:wght@${f.weights.join(';')}`;
    });
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}

let injected = false;

/** Load the studio font catalog once, only when the Design Studio is used. */
export function ensureDesignFonts(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontsUrl(FONT_CATALOG.map((f) => f.family));
  link.dataset.studioFonts = 'true';
  document.head.appendChild(link);
}

/** Wait (bounded) until the given fonts are usable for measuring text. */
export async function loadFonts(specs: { family: string; weight: number; italic?: boolean }[], timeoutMs = 2500): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  ensureDesignFonts();
  const unique = Array.from(new Set(specs.map((s) => `${s.italic ? 'italic ' : ''}${s.weight} 40px "${s.family}"`)));
  const all = Promise.allSettled(unique.map((f) => document.fonts.load(f)));
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
}
