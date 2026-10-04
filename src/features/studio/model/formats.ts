import type { FormatPreset, Platform } from './types';

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
];

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: 'ig-square', platform: 'instagram', label: 'Instagram Square', width: 1080, height: 1080 },
  { id: 'ig-portrait', platform: 'instagram', label: 'Instagram Portrait', width: 1080, height: 1350 },
  { id: 'ig-story', platform: 'instagram', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'fb-landscape', platform: 'facebook', label: 'Facebook Landscape', width: 1200, height: 628 },
  { id: 'li-square', platform: 'linkedin', label: 'LinkedIn Square', width: 1200, height: 1200 },
  { id: 'tiktok', platform: 'tiktok', label: 'TikTok', width: 1080, height: 1920 },
];

export const CUSTOM_FORMAT_ID = 'custom';
export const MIN_CANVAS = 100;
export const MAX_CANVAS = 4000;

export function presetsFor(platform: Platform): FormatPreset[] {
  return FORMAT_PRESETS.filter((f) => f.platform === platform);
}

export function formatLabel(formatId: string, width: number, height: number): string {
  const preset = FORMAT_PRESETS.find((f) => f.id === formatId);
  return `${preset ? preset.label : 'Custom'} · ${width} × ${height}`;
}

export function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.id === p)?.label ?? p;
}

export function clampCanvas(n: number): number {
  if (!Number.isFinite(n)) return 1080;
  return Math.round(Math.min(MAX_CANVAS, Math.max(MIN_CANVAS, n)));
}
