import { memo, type ReactNode } from 'react';
import { derivePalette, mix } from '../model/color';
import { fontStack } from '../model/fonts';
import { sortedByZ } from '../model/operations';
import { layoutElement, measure } from '../model/textLayout';
import type { DesignDocument, DesignElement, GradientElement, ImageElement, LogoElement, TextElement } from '../model/types';
import { useFontsVersion } from './fontsVersion';

export interface DesignSvgProps {
  doc: Pick<DesignDocument, 'width' | 'height' | 'background' | 'elements' | 'brand'>;
  /** Unique per rendered instance so gradient/clip ids don't collide. */
  idPrefix: string;
  /** Maps a stored image source to something the renderer can load. */
  resolveSrc: (src: string | null | undefined) => string | null;
  /** Show editor-only placeholder hints on empty image boxes. */
  showHints?: boolean;
  /** Elements to skip (e.g. text being edited in place). */
  hiddenIds?: ReadonlySet<string>;
  /** CSS injected into the SVG (fonts for export). */
  fontCss?: string;
  /** Exact pixel size attributes (export); defaults to fluid 100%. */
  pixelSize?: boolean;
  className?: string;
}

const r = (n: number) => Math.round(n * 100) / 100;

function gradientCoords(angle: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  return { x1: r(0.5 - dx), y1: r(0.5 - dy), x2: r(0.5 + dx), y2: r(0.5 + dy) };
}

function TextNode({ el }: { el: TextElement }) {
  const layout = layoutElement(el);
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
  const ax = el.align === 'center' ? el.x + el.width / 2 : el.align === 'right' ? el.x + el.width : el.x;
  const lh = el.fontSize * el.lineHeight;
  return (
    <text
      fontFamily={fontStack(el.fontFamily)}
      fontSize={el.fontSize}
      fontWeight={el.fontWeight}
      fontStyle={el.fontStyle === 'italic' ? 'italic' : undefined}
      letterSpacing={el.letterSpacing ? r(el.letterSpacing * el.fontSize) : undefined}
      fill={el.color}
      textAnchor={anchor}
      xmlSpace="preserve"
    >
      {layout.lines.map((line, i) => (
        <tspan key={i} x={r(ax)} y={r(el.y + layout.baseline + i * lh)}>
          {line || ' '}
        </tspan>
      ))}
    </text>
  );
}

function ImageNode({ el, id, src, showHints, placeholderFill, hintColor }: { el: ImageElement; id: string; src: string | null; showHints?: boolean; placeholderFill: string; hintColor: string }) {
  const clip = el.radius > 0 ? `url(#${id}-clip)` : undefined;
  const defs = el.radius > 0 && (
    <defs>
      <clipPath id={`${id}-clip`}>
        <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.radius} />
      </clipPath>
    </defs>
  );
  if (src) {
    return (
      <>
        {defs}
        <image href={src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio={el.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={clip} />
      </>
    );
  }
  const s = Math.min(el.width, el.height);
  const icon = s * 0.12;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const hint = (el.placeholderHint ?? '').slice(0, 60);
  return (
    <>
      {defs}
      <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.radius || undefined} fill={placeholderFill} />
      {showHints && (
        <g opacity={0.55}>
          <path
            d={`M${r(cx - icon)} ${r(cy + icon * 0.55)} L${r(cx - icon * 0.25)} ${r(cy - icon * 0.35)} L${r(cx + icon * 0.2)} ${r(cy + icon * 0.15)} L${r(cx + icon * 0.5)} ${r(cy - icon * 0.1)} L${r(cx + icon)} ${r(cy + icon * 0.55)} Z`}
            fill="none"
            stroke={hintColor}
            strokeWidth={Math.max(1, s * 0.006)}
            strokeLinejoin="round"
          />
          <circle cx={r(cx + icon * 0.45)} cy={r(cy - icon * 0.6)} r={r(icon * 0.14)} fill={hintColor} />
          <text x={r(cx)} y={r(cy + icon * 1.35)} textAnchor="middle" fontFamily={fontStack('Inter')} fontSize={r(Math.max(10, s * 0.04))} fontWeight={600} fill={hintColor}>
            Add image
          </text>
          {hint && (
            <text x={r(cx)} y={r(cy + icon * 1.35 + Math.max(12, s * 0.05))} textAnchor="middle" fontFamily={fontStack('Inter')} fontSize={r(Math.max(9, s * 0.028))} fill={hintColor}>
              {hint}
            </text>
          )}
        </g>
      )}
    </>
  );
}

function LogoNode({ el, src, headingFont }: { el: LogoElement; src: string | null; headingFont: string }) {
  const pa = el.align === 'left' ? 'xMinYMid meet' : el.align === 'right' ? 'xMaxYMid meet' : 'xMidYMid meet';
  if (src) return <image href={src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio={pa} />;
  const text = (el.fallbackText || 'Logo').toUpperCase();
  const style = { fontFamily: headingFont, fontWeight: 600, fontStyle: 'normal' as const, letterSpacing: 0.18, lineHeight: 1, textTransform: 'none' as const };
  const base = 100;
  const w100 = measure(text, { ...style, fontSize: base });
  const size = Math.max(6, Math.min(el.height * 0.62, (el.width / Math.max(1, w100)) * base));
  const anchor = el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle';
  const ax = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.width : el.x + el.width / 2;
  return (
    <text x={r(ax)} y={r(el.y + el.height / 2 + size * 0.35)} textAnchor={anchor} fontFamily={fontStack(headingFont)} fontSize={r(size)} fontWeight={600} letterSpacing={r(0.18 * size)} fill={el.color}>
      {text}
    </text>
  );
}

function GradientNode({ el, id }: { el: GradientElement; id: string }) {
  const c = gradientCoords(el.angle);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-grad`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}>
          {el.stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect x={el.x} y={el.y} width={el.width} height={el.height} fill={`url(#${id}-grad)`} />
    </>
  );
}

function renderElement(el: DesignElement, id: string, p: DesignSvgProps, placeholderFill: string, hintColor: string): ReactNode {
  switch (el.type) {
    case 'text':
      return <TextNode el={el} />;
    case 'image':
      return <ImageNode el={el} id={id} src={p.resolveSrc(el.src)} showHints={p.showHints} placeholderFill={placeholderFill} hintColor={hintColor} />;
    case 'logo':
      return <LogoNode el={el} src={p.resolveSrc(el.src)} headingFont={p.doc.brand.fonts.heading} />;
    case 'rect':
      return <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.radius || undefined} fill={el.fill} stroke={el.stroke !== 'none' && el.strokeWidth > 0 ? el.stroke : undefined} strokeWidth={el.stroke !== 'none' && el.strokeWidth > 0 ? el.strokeWidth : undefined} />;
    case 'circle':
      return <ellipse cx={r(el.x + el.width / 2)} cy={r(el.y + el.height / 2)} rx={r(el.width / 2)} ry={r(el.height / 2)} fill={el.fill} stroke={el.stroke !== 'none' && el.strokeWidth > 0 ? el.stroke : undefined} strokeWidth={el.stroke !== 'none' && el.strokeWidth > 0 ? el.strokeWidth : undefined} />;
    case 'line':
      return <line x1={el.x} y1={r(el.y + el.height / 2)} x2={el.x + el.width} y2={r(el.y + el.height / 2)} stroke={el.stroke} strokeWidth={el.strokeWidth} />;
    case 'gradient':
      return <GradientNode el={el} id={id} />;
  }
}

function DesignSvgImpl(p: DesignSvgProps) {
  useFontsVersion(); // re-measure text once web fonts arrive
  const { doc, idPrefix } = p;
  const pal = derivePalette(doc.brand.colors);
  const placeholderFill = mix(pal.light, pal.dark, 0.16);
  const hintColor = mix(pal.light, pal.dark, 0.6);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${doc.width} ${doc.height}`}
      width={p.pixelSize ? doc.width : '100%'}
      height={p.pixelSize ? doc.height : '100%'}
      className={p.className}
      style={p.pixelSize ? undefined : { display: 'block' }}
    >
      {p.fontCss ? (
        <defs>
          <style>{p.fontCss}</style>
        </defs>
      ) : null}
      <rect x={0} y={0} width={doc.width} height={doc.height} fill={doc.background.color} />
      {sortedByZ(doc.elements).map((el) => {
        if (p.hiddenIds?.has(el.id)) return null;
        const id = `${idPrefix}-${el.id}`;
        const transform = el.rotation ? `rotate(${r(el.rotation)} ${r(el.x + el.width / 2)} ${r(el.y + el.height / 2)})` : undefined;
        return (
          <g key={el.id} data-el={el.id} transform={transform} opacity={el.opacity < 1 ? r(el.opacity) : undefined}>
            {renderElement(el, id, p, placeholderFill, hintColor)}
          </g>
        );
      })}
    </svg>
  );
}

export const DesignSvg = memo(DesignSvgImpl);
