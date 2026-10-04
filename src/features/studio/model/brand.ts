import { resolveRole } from './color';
import type { BrandKit, DesignBrand, DesignDocument, DesignElement } from './types';

export const DEFAULT_BRAND: DesignBrand = {
  name: '',
  logo: null,
  colors: { primary: '#15181D', secondary: '#E9E4DA', accent: '#C2A06A' },
  fonts: { heading: 'Playfair Display', body: 'Manrope' },
  toneOfVoice: '',
  kitId: null,
};

export function brandFromKit(kit: BrandKit): DesignBrand {
  return { name: kit.name, logo: kit.logo, colors: { ...kit.colors }, fonts: { ...kit.fonts }, toneOfVoice: kit.toneOfVoice, kitId: kit.id };
}

/** Re-resolve every brand-linked colour and font after the brand changes. */
export function applyBrandToElements(elements: DesignElement[], brand: DesignBrand): DesignElement[] {
  const c = (role: Parameters<typeof resolveRole>[0] | undefined, current: string) => (role ? resolveRole(role, brand.colors) : current);
  return elements.map((el): DesignElement => {
    switch (el.type) {
      case 'text':
        return {
          ...el,
          color: c(el.colorRole, el.color),
          fontFamily: el.fontRole ? brand.fonts[el.fontRole] : el.fontFamily,
        };
      case 'logo':
        return { ...el, color: c(el.colorRole, el.color), src: el.src ?? null };
      case 'rect':
      case 'circle':
        return { ...el, fill: el.fill === 'none' ? 'none' : c(el.fillRole, el.fill), stroke: el.stroke === 'none' ? 'none' : c(el.strokeRole, el.stroke) };
      case 'line':
        return { ...el, stroke: c(el.strokeRole, el.stroke) };
      case 'gradient':
        return { ...el, stops: el.stops.map((s) => ({ ...s, color: c(s.colorRole, s.color) })) };
      default:
        return el;
    }
  });
}

export function applyBrand(doc: DesignDocument, brand: DesignBrand): DesignDocument {
  return {
    ...doc,
    brand,
    background: { ...doc.background, color: doc.background.colorRole ? resolveRole(doc.background.colorRole, brand.colors) : doc.background.color },
    elements: applyBrandToElements(doc.elements, brand).map((el) =>
      el.type === 'logo' && el.slot === 'logo' ? { ...el, src: brand.logo, fallbackText: brand.name || el.fallbackText } : el,
    ),
  };
}
