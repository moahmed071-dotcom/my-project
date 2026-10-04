import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  title?: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Generation failed', message, hint, onRetry }: Props) {
  return (
    <div role="alert" className="animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-200">{title}</h3>
          <p className="mt-1 text-sm text-fog-300">{message}</p>
          {hint && <p className="mt-1 text-xs text-fog-500">{hint}</p>}
          {onRetry && (
            <Button size="sm" variant="outline" className="mt-4" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
