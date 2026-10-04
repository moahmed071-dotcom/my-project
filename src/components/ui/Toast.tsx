import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: string;
  message: string;
  tone: Tone;
}

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {});

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = { success: 'text-accent', error: 'text-red-300', info: 'text-sky-300' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
          {toasts.map((t) => {
            const Icon = icons[t.tone];
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex animate-fade-up items-center gap-3 rounded-xl border border-white/10 bg-ink-800/95 px-4 py-3 text-sm text-fog-50 shadow-2xl backdrop-blur"
              >
                <Icon className={cn('h-4 w-4 shrink-0', colors[t.tone])} />
                {t.message}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
