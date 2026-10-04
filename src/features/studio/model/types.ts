/**
 * Design document schema (v1).
 *
 * Platform-independent and fully structured: every element is a separate,
 * editable object with absolute pixel geometry on a W×H canvas. Nothing is
 * flattened, so the same document can be rendered to SVG/PNG today and mapped
 * to other editors (e.g. a future Canva integration) later.
 */

export const DESIGN_SCHEMA = 'mcos.design' as const;
export const DESIGN_SCHEMA_VERSION = 1 as const;

// ─── Platforms & formats ────────────────────────────────────────────────────

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok';

export interface FormatPreset {
  id: string;
  platform: Platform;
  label: string;
  width: number;
  height: number;
}

// ─── Brand ──────────────────────────────────────────────────────────────────

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

/**
 * A brand kit. Stored per client today; shaped so full Brand Profiles
 * (multiple logos, palettes, guidelines) can extend it later.
 */
export interface BrandKit {
  id: string;
  clientId: string | null;
  name: string;
  /** Image source: `asset:<id>`, `data:` URL or https URL. */
  logo: string | null;
  colors: BrandColors;
  fonts: BrandFonts;
  toneOfVoice: string;
  updatedAt: string;
}

/** Brand values snapshotted into a design so the document is self-contained. */
export interface DesignBrand {
  name: string;
  logo: string | null;
  colors: BrandColors;
  fonts: BrandFonts;
  toneOfVoice: string;
  /** Brand kit this snapshot came from, if any. */
  kitId: string | null;
}

/**
 * Colour roles let elements stay linked to the brand: when brand colours
 * change, linked elements update. Setting an explicit colour unlinks.
 */
export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'dark'
  | 'light'
  | 'onPrimary'
  | 'onSecondary'
  | 'onAccent'
  | 'onDark'
  | 'onLight';

export type FontRole = 'heading' | 'body';

// ─── Content ────────────────────────────────────────────────────────────────

/** The copy and direction a design is built from (local input or, later, an AI provider). */
export interface DesignContent {
  brief: string;
  headline: string;
  subheadline: string;
  cta: string;
  visualDirection: string;
  /** Optional short label, e.g. campaign or launch name. */
  label: string;
}

/** Semantic slot an element fills; used to re-flow content into templates. */
export type ContentSlot = 'headline' | 'subheadline' | 'cta' | 'label' | 'body' | 'image' | 'logo';

// ─── Elements ───────────────────────────────────────────────────────────────

export type ElementType = 'text' | 'image' | 'logo' | 'rect' | 'circle' | 'line' | 'gradient';

interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  /** Top-left corner in canvas pixels (before rotation). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the element centre. */
  rotation: number;
  /** 0–1 */
  opacity: number;
  /** Stacking order; higher draws on top. Kept contiguous (0..n-1). */
  zIndex: number;
  slot?: ContentSlot;
}

export type TextAlign = 'left' | 'center' | 'right';
export type TextTransform = 'none' | 'uppercase';

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontRole?: FontRole;
  /** px */
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  /** Multiplier of font size. */
  lineHeight: number;
  /** em */
  letterSpacing: number;
  align: TextAlign;
  textTransform: TextTransform;
  color: string;
  colorRole?: ColorRole;
}

export type ImageFit = 'cover' | 'contain';

export interface ImageElement extends BaseElement {
  type: 'image';
  /** `asset:<id>`, `data:` URL or https URL; null shows a placeholder. */
  src: string | null;
  fit: ImageFit;
  radius: number;
  /** Shown on the placeholder to guide image choice. */
  placeholderHint?: string;
}

export interface LogoElement extends BaseElement {
  type: 'logo';
  src: string | null;
  /** Wordmark text used when no logo image exists. */
  fallbackText: string;
  /** Horizontal alignment of the logo inside its box. */
  align: TextAlign;
  color: string;
  colorRole?: ColorRole;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string;
  fillRole?: ColorRole;
  /** Set fill to 'none' for outline-only shapes. */
  stroke: string;
  strokeRole?: ColorRole;
  strokeWidth: number;
  radius: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  fill: string;
  fillRole?: ColorRole;
  stroke: string;
  strokeRole?: ColorRole;
  strokeWidth: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  /** Drawn horizontally through the vertical centre of the box; rotate for other angles. */
  stroke: string;
  strokeRole?: ColorRole;
  strokeWidth: number;
}

export interface GradientStop {
  /** 0–1 */
  offset: number;
  color: string;
  colorRole?: ColorRole;
  /** 0–1 */
  opacity: number;
}

export interface GradientElement extends BaseElement {
  type: 'gradient';
  /** Degrees: 0 = left→right, 90 = top→bottom. */
  angle: number;
  stops: GradientStop[];
}

export type DesignElement = TextElement | ImageElement | LogoElement | RectElement | CircleElement | LineElement | GradientElement;

// ─── Document ───────────────────────────────────────────────────────────────

export interface DesignBackground {
  color: string;
  colorRole?: ColorRole;
}

export interface DesignDocument {
  schema: typeof DESIGN_SCHEMA;
  schemaVersion: typeof DESIGN_SCHEMA_VERSION;
  id: string;
  name: string;
  clientId: string | null;
  campaign: string;
  platform: Platform;
  formatId: string;
  width: number;
  height: number;
  background: DesignBackground;
  elements: DesignElement[];
  brand: DesignBrand;
  content: DesignContent;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Templates ──────────────────────────────────────────────────────────────

/** A design the user saved for reuse. Geometry is stored at its source size and scaled on apply. */
export interface SavedTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  background: DesignBackground;
  elements: DesignElement[];
  createdAt: string;
}
