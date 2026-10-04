import { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface HistoryItem {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
}

interface Props {
  title: string;
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
}

export function HistoryPanel({ title, items, activeId, onSelect, onDelete, emptyLabel }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center gap-2 px-1">
        <History className="h-3.5 w-3.5 text-fog-500" />
        <h2 className="label">{title}</h2>
        <span className="ml-auto font-mono text-[10px] text-fog-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-4 text-xs leading-relaxed text-fog-500">{emptyLabel}</p>
      ) : (
        <ul className="-mx-1 max-h-[340px] space-y-0.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="group relative">
              <button
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 pr-9 text-left transition',
                  activeId === item.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                )}
              >
                <p className={cn('truncate text-sm', activeId === item.id ? 'text-fog-50' : 'text-fog-200')}>{item.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-fog-500">
                  {item.subtitle} · {timeAgo(item.createdAt)}
                </p>
              </button>
              <button
                onClick={() => setPending(item.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fog-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pending !== null}
        title="Delete from history?"
        message="This generated result will be permanently removed from your workspace."
        onConfirm={() => pending && onDelete(pending)}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
