import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface WrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string) => ReactNode;
}

export function FieldWrapper({ label, hint, error, required, className, children }: WrapperProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-center gap-1 text-xs font-medium text-fog-200">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fog-500">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label?: string; hint?: string; error?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function Input(
  { label, hint, error, wrapperClassName, className, required, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id) => (
        <input
          ref={ref}
          id={id}
          dir="auto"
          required={required}
          aria-invalid={!!error}
          className={cn('field', error && 'border-red-500/50', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea(
  { label, hint, error, wrapperClassName, className, required, rows = 3, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id) => (
        <textarea
          ref={ref}
          id={id}
          dir="auto"
          rows={rows}
          required={required}
          aria-invalid={!!error}
          className={cn('field resize-y leading-relaxed', error && 'border-red-500/50', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, Common {
  options: ReadonlyArray<string | { value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, options, placeholder, required, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            className={cn('field cursor-pointer appearance-none pr-9', className)}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => {
              const opt = typeof o === 'string' ? { value: o, label: o } : o;
              return (
                <option key={opt.value} value={opt.value} className="bg-ink-850">
                  {opt.label}
                </option>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-400" />
        </div>
      )}
    </FieldWrapper>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl py-1 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-fog-50">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-fog-400">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-accent/60 bg-accent' : 'border-white/10 bg-ink-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-[18px] w-[18px] rounded-full shadow transition-all duration-200',
            checked ? 'left-[22px] bg-ink-950' : 'left-0.5 bg-fog-300',
          )}
        />
      </span>
    </button>
  );
}
