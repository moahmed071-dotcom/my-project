import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { search, type SearchKind, type SearchResult } from '@/lib/search';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { KIND_ICONS } from '@/components/layout/GlobalSearch';
import { pluralize } from '@/lib/format';

const ORDER: SearchKind[] = ['Project', 'Client', 'Design', 'Brief', 'Campaign', 'Prompt', 'Page'];

export default function SearchPage() {
  const store = useStore();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const results = useMemo(() => search(store, q), [store, q]);

  const grouped = ORDER.map((kind) => [kind, results.filter((r) => r.kind === kind)] as [SearchKind, SearchResult[]]).filter(([, r]) => r.length);

  return (
    <div>
      <PageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : 'Search'}
        description={q ? `${pluralize(results.length, 'result')} across your workspace.` : 'Use the search bar above to find anything in your workspace.'}
      />
      {!q.trim() ? (
        <EmptyState icon={SearchIcon} title="Start typing to search" description="Projects, clients, briefs, campaigns and prompts are all searchable." />
      ) : results.length === 0 ? (
        <EmptyState icon={SearchIcon} title="Nothing found" description={`No projects, clients, briefs, campaigns or prompts match “${q}”.`} />
      ) : (
        <div className="space-y-8">
          {grouped.map(([kind, items]) => {
            const Icon = KIND_ICONS[kind];
            return (
              <section key={kind} className="animate-fade-up">
                <h2 className="label mb-3 flex items-center gap-2">
                  {kind}s <span className="font-mono text-fog-500">{items.length}</span>
                </h2>
                <ul className="surface divide-y divide-white/[0.04] overflow-hidden">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link to={r.to} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-750">
                          <Icon className="h-4 w-4 text-fog-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fog-50">{r.title}</p>
                          <p className="truncate text-xs text-fog-500">{r.subtitle}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-fog-500 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
