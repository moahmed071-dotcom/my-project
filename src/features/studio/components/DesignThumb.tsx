import { memo, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useAssets } from '../assets/assetStore';
import { buildElements, type DesignSetup } from '../model/document';
import type { DesignDocument } from '../model/types';
import { DesignSvg } from '../render/DesignSvg';
import { useFontsVersion } from '../render/fontsVersion';

/** Live, scaled render of a design. The frame keeps a fixed aspect; the design is contained inside. */
export const DesignThumb = memo(function DesignThumb({ doc, className, frame = 'aspect-[4/5]' }: { doc: Pick<DesignDocument, 'id' | 'width' | 'height' | 'background' | 'elements' | 'brand'>; className?: string; frame?: string }) {
  const { displaySrc } = useAssets();
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-ink-850', frame, className)}>
      <div className="h-full w-full p-[8%]">
        <div className="h-full w-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
          <DesignSvg doc={doc} idPrefix={`th-${doc.id}`} resolveSrc={displaySrc} />
        </div>
      </div>
    </div>
  );
});

export const SAMPLE_CONTENT = {
  brief: 'Launch of a waterfront residential tower',
  headline: 'Live above the ordinary',
  subheadline: 'Waterfront residences with private terraces and a 60/40 payment plan.',
  cta: 'Register your interest',
  visualDirection: 'Golden-hour façade',
  label: 'New launch',
};

/** Renders a built-in template for a given setup (used for previews and pickers). */
export function TemplatePreview({ templateId, setup, className, frame }: { templateId: string; setup: DesignSetup; className?: string; frame?: string }) {
  const fontsVersion = useFontsVersion();
  const doc = useMemo(() => {
    const body = buildElements(templateId, setup);
    return { id: `tp-${templateId}`, width: setup.width, height: setup.height, brand: setup.brand, ...body };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, setup, fontsVersion]);
  return <DesignThumb doc={doc} className={className} frame={frame} />;
}
