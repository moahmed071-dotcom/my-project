import { Link } from 'react-router-dom';
import { AlertTriangle, KeyRound, RotateCcw, Settings } from 'lucide-react';
import { Button } from './Button';

interface Props {
  title?: string;
  message: string;
  hint?: string;
  /** Error code from the AI layer; setup-related codes get a link to Settings. */
  code?: string;
  onRetry?: () => void;
}

const SETUP_CODES = new Set(['not_configured', 'invalid_key', 'forbidden', 'model_not_found', 'server_unreachable']);

export function ErrorState({ title, message, hint, code, onRetry }: Props) {
  const isSetup = code ? SETUP_CODES.has(code) : false;
  const heading = title ?? (code === 'not_configured' ? 'Claude isn’t connected yet' : isSetup ? 'AI engine needs attention' : 'Generation failed');
  const Icon = isSetup ? KeyRound : AlertTriangle;

  return (
    <div
      role="alert"
      className={
        isSetup
          ? 'animate-fade-up rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6'
          : 'animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6'
      }
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSetup ? 'bg-amber-400/10' : 'bg-red-500/10'}`}>
          <Icon className={`h-5 w-5 ${isSetup ? 'text-amber-200' : 'text-red-300'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${isSetup ? 'text-amber-100' : 'text-red-200'}`}>{heading}</h3>
          <p className="mt-1 text-sm text-fog-300">{message}</p>
          {hint && <p className="mt-1 text-xs text-fog-500">{hint}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onRetry}>
                Try again
              </Button>
            )}
            {isSetup && (
              <Link
                to="/settings#ai-engine"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-fog-300 transition hover:bg-white/[0.05] hover:text-fog-50"
              >
                <Settings className="h-3.5 w-3.5" />
                Open AI settings
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
