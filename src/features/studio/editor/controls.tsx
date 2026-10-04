import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { isHex, normalizeHex } from '../model/color';

/** Compact controls for the editor panels. */

export function PanelSection({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn('border-b border-white/[0.06] px-4 py-4', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-500">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const inputBase =
  'h-8 w-full rounded-md border border-white/[0.07] bg-ink-850 px-2 text-xs text-fog-50 transition-colors placeholder:text-fog-600 hover:border-white/[0.14] focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-fog-500">
      {children}
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Short inline prefix such as X or W. */
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/** Numeric input: commits on Enter/blur; arrow keys nudge (Shift ×10). */
export function NumberField({ label, value, onCommit, min = -Infinity, max = Infinity, step = 1, prefix, suffix, decimals = 0 }: NumberFieldProps) {
  const id = useId();
  const fmt = (v: number) => (Number.isFinite(v) ? String(Number(v.toFixed(decimals))) : '');
  // While not focused the field always shows the live value (no stale frame after undo/reorder).
  const [draft, setDraft] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : fmt(value);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (Number.isFinite(v)) onCommit(clamp(v));
    else setDraft(fmt(value));
  };
  return (
    <div className="min-w-0">
      {!prefix && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-fog-500">{prefix}</span>}
        <input
          id={id}
          aria-label={label}
          inputMode="decimal"
          className={cn(inputBase, 'tabular-nums', prefix && 'pl-6', suffix && 'pr-6')}
          value={shown}
          onFocus={() => {
            setDraft(fmt(value));
            setFocused(true);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
              const v = clamp((parseFloat(shown) || 0) + delta);
              setDraft(fmt(v));
              onCommit(v);
            }
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fog-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function TextField({ label, value, onCommit, placeholder }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        className={inputBase}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

export function SelectField<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        className={cn(inputBase, 'cursor-pointer appearance-none bg-[length:10px] bg-[right_8px_center] bg-no-repeat pr-6')}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A7A75' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")" }}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange((typeof value === 'number' ? Number(raw) : raw) as T);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value} className="bg-ink-850">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'sm' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label?: string; size?: 'sm' | 'md' }) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div role="radiogroup" aria-label={label} className="flex rounded-md border border-white/[0.07] bg-ink-850 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center rounded-[5px] font-medium transition-colors',
              size === 'sm' ? 'h-7 text-[11px]' : 'h-8 text-xs',
              value === o.value ? 'bg-white/[0.09] text-fog-50' : 'text-fog-500 hover:text-fog-200',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SliderField({ label, value, onChange, min = 0, max = 1, step = 0.01, format }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="font-mono text-[10px] tabular-nums text-fog-400">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="studio-range w-full" />
    </div>
  );
}

export interface Swatch {
  key: string;
  color: string;
  label: string;
}

export function ColorField({ label, value, onChange, swatches = [], activeSwatch }: { label: string; value: string; onChange: (hex: string, swatchKey?: string) => void; swatches?: Swatch[]; activeSwatch?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const isNone = value === 'none';
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/[0.12]" style={{ background: isNone ? 'transparent' : value }}>
          {isNone && <span className="absolute inset-0 m-auto h-px w-10 -rotate-45 bg-red-400/70" />}
          <input type="color" aria-label={`${label} picker`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={isNone ? '#000000' : normalizeHex(value)} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
        <input
          id={id}
          aria-label={label}
          className={cn(inputBase, 'font-mono uppercase')}
          value={focused ? draft : value}
          onFocus={() => {
            setDraft(value);
            setFocused(true);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim().toLowerCase() === 'none') onChange('none');
            else if (isHex(draft)) onChange(normalizeHex(draft));
            else setDraft(value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      {swatches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {swatches.map((s) => (
            <button
              key={s.key}
              type="button"
              title={s.label}
              aria-label={`Use ${s.label}`}
              onClick={() => onChange(s.color, s.key)}
              className={cn('h-5 w-5 rounded-[4px] border transition-transform hover:scale-110', activeSwatch === s.key ? 'border-accent ring-1 ring-accent/60' : 'border-white/15')}
              style={{ background: s.color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ToolButton({ label, onClick, children, disabled, active, className, shortcut }: { label: string; onClick?: () => void; children: ReactNode; disabled?: boolean; active?: boolean; className?: string; shortcut?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-fog-50 disabled:pointer-events-none disabled:opacity-35',
        active && 'bg-white/[0.08] text-fog-50',
        className,
      )}
    >
      {children}
    </button>
  );
}
