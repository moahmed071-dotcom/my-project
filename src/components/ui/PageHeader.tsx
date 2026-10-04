import type { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="mb-8 flex animate-fade-up flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-tightest text-fog-50 sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-fog-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
